import { Schema, model, type InferSchemaType } from 'mongoose'

const applicationSchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  workerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['submitted', 'reviewed', 'accepted', 'rejected', 'withdrawn'],
    default: 'submitted',
    index: true,
  },
  message: { type: String, trim: true, maxlength: 1000 },
}, { timestamps: true })

applicationSchema.index({ jobId: 1, workerId: 1 }, { unique: true })
applicationSchema.index({ workerId: 1, createdAt: -1 })
applicationSchema.index({ jobId: 1, status: 1 })

export type ApplicationRecord = InferSchemaType<typeof applicationSchema>
export const ApplicationModel = model('Application', applicationSchema)
