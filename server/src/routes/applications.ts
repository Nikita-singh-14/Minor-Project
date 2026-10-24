import { Router } from 'express'
import { z } from 'zod'
import { Types } from 'mongoose'
import { ApplicationModel } from '../models/Application.js'
import { JobModel } from '../models/Job.js'
import { authenticate, requireRole } from '../middleware/authenticate.js'

const router = Router()

const applicationMessageSchema = z.object({
  message: z.string().trim().max(1000).optional(),
}).strict()

const applicationStatusSchema = z.object({
  status: z.enum(['reviewed', 'accepted', 'rejected']).default('reviewed'),
}).strict()

function coerceObjectIdParam(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate && Types.ObjectId.isValid(candidate) ? candidate : undefined
}

router.get('/applications/me', authenticate, requireRole('worker'), async (_request, response, next) => {
  try {
    const workerId = _request.authUser?.id
    if (!workerId) {
      response.status(401).json({ error: 'Authentication required' })
      return
    }

    const applications = await ApplicationModel.find({ workerId })
      .populate('jobId', 'title employerName category location payPerDay status createdAt')
      .sort({ createdAt: -1 })
      .lean()

    response.json({ applications })
  } catch (error) {
    next(error)
  }
})

router.get('/employer/jobs', authenticate, requireRole('employer'), async (request, response, next) => {
  try {
    const employerId = request.authUser?.id
    if (!employerId) {
      response.status(401).json({ error: 'Authentication required' })
      return
    }

    const jobs = await JobModel.find({ employerId }).sort({ createdAt: -1 }).lean()
    const jobIds = jobs.map((job) => job._id)
    const applications = await ApplicationModel.find({ jobId: { $in: jobIds } })
      .populate('workerId', 'name phone role workerProfile')
      .sort({ createdAt: -1 })
      .lean()

    const jobMap = new Map<string, typeof jobs[number] & { applicantSummary?: { submitted: number; reviewed: number; accepted: number; rejected: number } }>()
    for (const job of jobs) {
      const summary = { submitted: 0, reviewed: 0, accepted: 0, rejected: 0 }
      jobMap.set(job._id.toString(), { ...job, applicantSummary: summary })
    }

    for (const application of applications) {
      const job = jobMap.get(application.jobId.toString())
      if (!job || !job.applicantSummary) continue
      const status = application.status as keyof typeof job.applicantSummary
      job.applicantSummary[status] = (job.applicantSummary[status] ?? 0) + 1
    }

    const payload = jobs.map((job) => ({
      ...job,
      applicantSummary: jobMap.get(job._id.toString())?.applicantSummary ?? { submitted: 0, reviewed: 0, accepted: 0, rejected: 0 },
      applications: applications.filter((application) => application.jobId.toString() === job._id.toString()),
    }))

    response.json({ jobs: payload })
  } catch (error) {
    next(error)
  }
})

router.post('/jobs/:jobId/applications', authenticate, requireRole('worker'), async (request, response, next) => {
  const jobId = coerceObjectIdParam(request.params.jobId)
  if (!jobId) {
    response.status(400).json({ error: 'Invalid job id' })
    return
  }

  const parsed = applicationMessageSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid application payload', details: parsed.error.flatten() })
    return
  }

  try {
    const workerId = request.authUser?.id
    if (!workerId) {
      response.status(401).json({ error: 'Authentication required' })
      return
    }

    const job = await JobModel.findOne({ _id: jobId, status: 'open' }).select('_id').lean()
    if (!job) {
      response.status(404).json({ error: 'Job not found or no longer accepting applications' })
      return
    }

    const existing = await ApplicationModel.findOne({ jobId, workerId }).lean()
    if (existing) {
      response.status(409).json({ error: 'You have already applied for this job', application: { id: existing._id.toString(), status: existing.status } })
      return
    }

    const application = await ApplicationModel.create({
      jobId,
      workerId,
      status: 'submitted',
      message: parsed.data.message,
    })

    response.status(201).json({
      application: {
        id: application._id.toString(),
        jobId: application.jobId.toString(),
        workerId: application.workerId.toString(),
        status: application.status,
        message: application.message,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/jobs/:jobId/applications', authenticate, requireRole('employer'), async (request, response, next) => {
  const jobId = coerceObjectIdParam(request.params.jobId)
  if (!jobId) {
    response.status(400).json({ error: 'Invalid job id' })
    return
  }

  try {
    const employerId = request.authUser?.id
    if (!employerId) {
      response.status(401).json({ error: 'Authentication required' })
      return
    }

    const job = await JobModel.findOne({ _id: jobId, employerId }).select('_id').lean()
    if (!job) {
      response.status(403).json({ error: 'You can only view applications for jobs you posted' })
      return
    }

    const applications = await ApplicationModel.find({ jobId })
      .populate('workerId', 'name phone role workerProfile')
      .sort({ createdAt: -1 })
      .lean()

    response.json({ applications })
  } catch (error) {
    next(error)
  }
})

router.patch('/jobs/:jobId/applications/:applicationId', authenticate, requireRole('employer'), async (request, response, next) => {
  const jobId = coerceObjectIdParam(request.params.jobId)
  const applicationId = coerceObjectIdParam(request.params.applicationId)

  if (!jobId || !applicationId) {
    response.status(400).json({ error: 'Invalid job or application id' })
    return
  }

  const parsed = applicationStatusSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid application status update', details: parsed.error.flatten() })
    return
  }

  try {
    const employerId = request.authUser?.id
    if (!employerId) {
      response.status(401).json({ error: 'Authentication required' })
      return
    }

    const job = await JobModel.findOne({ _id: jobId, employerId }).select('_id').lean()
    if (!job) {
      response.status(403).json({ error: 'You can only update applications for jobs you posted' })
      return
    }

    const application = await ApplicationModel.findOne({ _id: applicationId, jobId }).lean()
    if (!application) {
      response.status(404).json({ error: 'Application not found' })
      return
    }

    application.status = parsed.data.status
    const updated = await ApplicationModel.findByIdAndUpdate(
      applicationId,
      { $set: { status: parsed.data.status } },
      { new: true },
    )

    response.json({ application: { id: updated?._id.toString(), status: updated?.status ?? parsed.data.status } })
  } catch (error) {
    next(error)
  }
})

export default router
