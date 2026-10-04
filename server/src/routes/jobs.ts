import { Router } from 'express'
import { z } from 'zod'
import { JobModel } from '../models/Job.js'

const router = Router()
const filtersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(40).optional(),
  city: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

router.get('/', async (request, response, next) => {
  const parsed = filtersSchema.safeParse(request.query)
  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid search filters', details: parsed.error.flatten() })
    return
  }

  try {
    const { q, category, city, page, limit } = parsed.data
    const filter = {
      status: 'open',
      ...(category && { category }),
      ...(city && { 'location.city': new RegExp(`^${escapeRegex(city)}$`, 'i') }),
      ...(q && { $or: [
        { title: new RegExp(escapeRegex(q), 'i') },
        { description: new RegExp(escapeRegex(q), 'i') },
        { category: new RegExp(`^${escapeRegex(q)}$`, 'i') },
      ] }),
    }

    const [jobs, total] = await Promise.all([
      JobModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      JobModel.countDocuments(filter),
    ])

    response.json({ jobs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (error) {
    next(error)
  }
})

export default router