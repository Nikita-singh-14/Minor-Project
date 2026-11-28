import { Router } from 'express'
import { Types } from 'mongoose'
import { z } from 'zod'
import { ApplicationModel } from '../models/Application.js'
import { JobModel } from '../models/Job.js'
import { ReviewModel } from '../models/Review.js'
import { authenticate, requireRole } from '../middleware/authenticate.js'
import { requireDatabase } from '../middleware/requireDatabase.js'

const router = Router()
router.use(requireDatabase, authenticate, requireRole('worker', 'employer'))

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).default(''),
}).strict()

function isDuplicateKeyError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000
}

router.get('/me', async (request, response, next) => {
  try {
    const userId = request.authUser!.id
    const role = request.authUser!.role
    const revieweeRole = role === 'worker' ? 'employer' : 'worker'
    let applications

    if (role === 'worker') {
      applications = await ApplicationModel.find({ workerId: userId, status: 'accepted' })
        .populate({ path: 'jobId', select: 'title employerId', populate: { path: 'employerId', select: 'name role' } })
        .lean()
    } else {
      const jobs = await JobModel.find({ employerId: userId }).select('_id').lean()
      applications = await ApplicationModel.find({ jobId: { $in: jobs.map((job) => job._id) }, status: 'accepted' })
        .populate('workerId', 'name role')
        .populate('jobId', 'title')
        .lean()
    }

    const applicationIds = applications.map((application) => application._id)
    const [myReviews, received] = await Promise.all([
      ReviewModel.find({ reviewerId: userId, applicationId: { $in: applicationIds } }).select('applicationId rating comment').lean(),
      ReviewModel.find({ revieweeId: userId })
        .populate('reviewerId', 'name role')
        .populate('jobId', 'title')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
    ])
    const myReviewMap = new Map(myReviews.map((review) => [review.applicationId.toString(), review]))

    const eligible = applications.map((application) => {
      const job = application.jobId as unknown as { _id: Types.ObjectId; title: string; employerId?: { _id: Types.ObjectId; name: string; role: string } }
      const worker = application.workerId as unknown as { _id: Types.ObjectId; name: string; role: string } | undefined
      const counterpart = role === 'worker' ? job?.employerId : worker
      const myReview = myReviewMap.get(application._id.toString())
      return {
        applicationId: application._id.toString(),
        jobTitle: job?.title ?? 'Accepted job',
        counterpartId: counterpart?._id.toString(),
        counterpartName: counterpart?.name ?? (role === 'worker' ? 'Employer' : 'Worker'),
        counterpartRole: revieweeRole,
        myReview: myReview ? { rating: myReview.rating, comment: myReview.comment } : null,
      }
    })

    response.json({
      eligible,
      received: received.map((review) => {
        const reviewer = review.reviewerId as unknown as { name?: string; role?: string } | null
        const job = review.jobId as unknown as { title?: string } | null
        return {
          id: review._id.toString(),
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt,
          reviewerName: reviewer?.name ?? 'User',
          reviewerRole: reviewer?.role,
          jobTitle: job?.title ?? 'Completed work',
        }
      }),
    })
  } catch (error) {
    next(error)
  }
})

router.post('/:applicationId', async (request, response, next) => {
  if (!Types.ObjectId.isValid(request.params.applicationId)) {
    response.status(400).json({ error: 'Invalid application id' })
    return
  }

  const parsed = reviewSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: 'Rating must be from 1 to 5 stars', details: parsed.error.flatten() })
    return
  }

  try {
    const userId = request.authUser!.id
    const role = request.authUser!.role
    const application = await ApplicationModel.findOne({ _id: request.params.applicationId, status: 'accepted' }).lean()
    if (!application) {
      response.status(404).json({ error: 'Reviews are available only for accepted applications' })
      return
    }

    const job = await JobModel.findById(application.jobId).select('employerId').lean()
    const isWorker = role === 'worker' && application.workerId.toString() === userId
    const isEmployer = role === 'employer' && job?.employerId.toString() === userId
    if (!isWorker && !isEmployer) {
      response.status(403).json({ error: 'You are not part of this accepted application' })
      return
    }

    const revieweeId = isWorker ? job!.employerId : application.workerId
    try {
      const review = await ReviewModel.create({
        applicationId: application._id,
        jobId: application.jobId,
        reviewerId: userId,
        revieweeId,
        reviewerRole: role,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      })
      response.status(201).json({ review: { id: review._id.toString(), rating: review.rating, comment: review.comment } })
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        response.status(409).json({ error: 'You have already reviewed this accepted application' })
        return
      }
      throw error
    }
  } catch (error) {
    next(error)
  }
})

export default router
