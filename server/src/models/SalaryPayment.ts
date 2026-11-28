import { Schema, model, type InferSchemaType } from 'mongoose'

const salaryPaymentSchema = new Schema({
  applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  workerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  employerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 1, max: 10000000 },
  paidOn: { type: Date, required: true },
  note: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: ['pending_confirmation', 'paid', 'disputed'], required: true, default: 'pending_confirmation' },
  workerResponse: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: true })

salaryPaymentSchema.index({ workerId: 1, createdAt: -1 })
salaryPaymentSchema.index({ employerId: 1, createdAt: -1 })

export type SalaryPaymentRecord = InferSchemaType<typeof salaryPaymentSchema>
export const SalaryPaymentModel = model('SalaryPayment', salaryPaymentSchema)
