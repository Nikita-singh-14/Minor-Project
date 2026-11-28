import { Router } from 'express'
import { Types } from 'mongoose'
import { z } from 'zod'
import { ApplicationModel } from '../models/Application.js'
import { JobModel } from '../models/Job.js'
import { SalaryPaymentModel } from '../models/SalaryPayment.js'
import { authenticate, requireRole } from '../middleware/authenticate.js'
import { requireDatabase } from '../middleware/requireDatabase.js'

const router = Router()
router.use(requireDatabase, authenticate, requireRole('worker', 'employer'))

const createPaymentSchema = z.object({
  amount: z.number().positive().max(10000000).refine((value) => Number.isInteger(value * 100), 'Amount can have at most 2 decimal places'),
  paidOn: z.coerce.date().refine((date) => date.getTime() <= Date.now(), 'Payment date cannot be in the future'),
  note: z.string().trim().max(500).default(''),
}).strict()

const responseSchema = z.object({
  decision: z.enum(['confirm', 'dispute']),
  message: z.string().trim().max(500).default(''),
}).strict().refine((value) => value.decision !== 'dispute' || value.message.length > 0, {
  message: 'Explain why this salary record is disputed',
})

function objectIdParam(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate && Types.ObjectId.isValid(candidate) ? candidate : undefined
}

router.get('/me', async (request, response, next) => {
  try {
    const filter = request.authUser!.role === 'worker'
      ? { workerId: request.authUser!.id }
      : { employerId: request.authUser!.id }
    const payments = await SalaryPaymentModel.find(filter)
      .populate('workerId', 'name')
      .populate('employerId', 'name')
      .populate('jobId', 'title')
      .sort({ paidOn: -1, createdAt: -1 })
      .limit(200)
      .lean()

    response.json({
      payments: payments.map((payment) => {
        const worker = payment.workerId as unknown as { name?: string } | null
        const employer = payment.employerId as unknown as { name?: string } | null
        const job = payment.jobId as unknown as { title?: string } | null
        return {
          id: payment._id.toString(),
          applicationId: payment.applicationId.toString(),
          jobTitle: job?.title ?? 'Job',
          workerName: worker?.name ?? 'Worker',
          employerName: employer?.name ?? 'Employer',
          amount: payment.amount,
          paidOn: payment.paidOn,
          note: payment.note,
          status: payment.status,
          workerResponse: payment.workerResponse,
        }
      }),
    })
  } catch (error) {
    next(error)
  }
})

router.post('/:applicationId', requireRole('employer'), async (request, response, next) => {
  const applicationId = objectIdParam(request.params.applicationId)
  if (!applicationId) {
    response.status(400).json({ error: 'Invalid application id' })
    return
  }
  const parsed = createPaymentSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: 'Enter a valid payment amount and date', details: parsed.error.flatten() })
    return
  }

  try {
    const application = await ApplicationModel.findOne({ _id: applicationId, status: 'accepted' }).lean()
    if (!application) {
      response.status(404).json({ error: 'Salary can be recorded only for accepted applications' })
      return
    }
    const job = await JobModel.findOne({ _id: application.jobId, employerId: request.authUser!.id }).select('_id').lean()
    if (!job) {
      response.status(403).json({ error: 'You can record salary only for work attached to your job' })
      return
    }

    const payment = await SalaryPaymentModel.create({
      applicationId: application._id,
      jobId: application.jobId,
      workerId: application.workerId,
      employerId: request.authUser!.id,
      ...parsed.data,
      status: 'pending_confirmation',
    })
    response.status(201).json({
      payment: {
        id: payment._id.toString(),
        amount: payment.amount,
        paidOn: payment.paidOn,
        status: payment.status,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.patch('/:paymentId/response', requireRole('worker'), async (request, response, next) => {
  const paymentId = objectIdParam(request.params.paymentId)
  if (!paymentId) {
    response.status(400).json({ error: 'Invalid payment id' })
    return
  }
  const parsed = responseSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid payment response', details: parsed.error.flatten() })
    return
  }

  try {
    const status = parsed.data.decision === 'confirm' ? 'paid' : 'disputed'
    const payment = await SalaryPaymentModel.findOneAndUpdate(
      { _id: paymentId, workerId: request.authUser!.id, status: 'pending_confirmation' },
      { $set: { status, workerResponse: parsed.data.message } },
      { new: true, runValidators: true },
    ).lean()
    if (!payment) {
      response.status(404).json({ error: 'Payment not found, already answered, or not assigned to your account' })
      return
    }

    response.json({ payment: { id: payment._id.toString(), status: payment.status } })
  } catch (error) {
    next(error)
  }
})

export default router
