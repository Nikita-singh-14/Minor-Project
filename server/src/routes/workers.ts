import { Router } from 'express'
import { z } from 'zod'
import { authenticate, requireRole } from '../middleware/authenticate.js'
import { requireDatabase } from '../middleware/requireDatabase.js'
import { UserModel } from '../models/User.js'

const router = Router()
router.use(requireDatabase)

const profileSchema = z.object({
  bio: z.string().trim().max(1000).default(''),
  skills: z.array(z.string().trim().min(1).max(60)).max(20).default([])
    .transform((skills) => [...new Set(skills)]),
  experienceYears: z.number().int().min(0).max(60).nullable(),
  preferredLocations: z.array(z.object({
    city: z.string().trim().min(2).max(100),
    area: z.string().trim().max(100).default(''),
  }).strict()).max(10),
  isVisible: z.boolean(),
  contactVisible: z.boolean(),
}).strict()

const searchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
}).strict()

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

router.get('/me', authenticate, requireRole('worker'), async (request, response, next) => {
  try {
    const user = await UserModel.findOne({ _id: request.authUser?.id, role: 'worker' })
      .select('name phone workerProfile')
      .lean()

    if (!user) {
      response.status(404).json({ error: 'Worker account not found' })
      return
    }

    response.json({
      profile: {
        name: user.name,
        phone: user.phone,
        ...(user.workerProfile ?? {
          bio: '',
          skills: [],
          experienceYears: null,
          preferredLocations: [],
          isVisible: false,
          contactVisible: false,
        }),
      },
    })
  } catch (error) {
    next(error)
  }
})

router.put('/me', authenticate, requireRole('worker'), async (request, response, next) => {
  const parsed = profileSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid worker profile', details: parsed.error.flatten() })
    return
  }

  try {
    const currentUser = await UserModel.findOne({ _id: request.authUser?.id, role: 'worker' })
      .select('phone')
      .lean()
    if (!currentUser) {
      response.status(404).json({ error: 'Worker account not found' })
      return
    }

    const profile = {
      ...parsed.data,
      contactVisible: parsed.data.isVisible && parsed.data.contactVisible && Boolean(currentUser.phone),
    }
    const user = await UserModel.findOneAndUpdate(
      { _id: request.authUser?.id, role: 'worker' },
      { $set: { workerProfile: profile } },
      { new: true, runValidators: true },
    ).select('name phone workerProfile').lean()

    if (!user) {
      response.status(404).json({ error: 'Worker account not found' })
      return
    }

    response.json({
      profile: {
        name: user.name,
        phone: user.phone,
        ...user.workerProfile,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/', authenticate, requireRole('employer'), async (request, response, next) => {
  const parsed = searchSchema.safeParse(request.query)
  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid worker search filters', details: parsed.error.flatten() })
    return
  }

  try {
    const { q, city, page, limit } = parsed.data
    const queryRegex = q ? new RegExp(escapeRegex(q), 'i') : undefined
    const filter = {
      role: 'worker',
      accountStatus: 'active',
      'workerProfile.isVisible': true,
      ...(city && { 'workerProfile.preferredLocations.city': new RegExp(`^${escapeRegex(city)}$`, 'i') }),
      ...(queryRegex && {
        $or: [
          { name: queryRegex },
          { 'workerProfile.bio': queryRegex },
          { 'workerProfile.skills': queryRegex },
        ],
      }),
    }

    const [workers, total] = await Promise.all([
      UserModel.find(filter)
        .select('name phone workerProfile')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(filter),
    ])

    response.json({
      workers: workers.map((worker) => ({
        id: worker._id.toString(),
        name: worker.name,
        bio: worker.workerProfile?.bio ?? '',
        skills: worker.workerProfile?.skills ?? [],
        experienceYears: worker.workerProfile?.experienceYears ?? null,
        preferredLocations: worker.workerProfile?.preferredLocations ?? [],
        ...(worker.workerProfile?.contactVisible && worker.phone ? { phone: worker.phone } : {}),
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    next(error)
  }
})

export default router
