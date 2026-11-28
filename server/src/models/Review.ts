import { Schema, model, type InferSchemaType } from 'mongoose'

const reviewSchema = new Schema({
  applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  revieweeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reviewerRole: { type: String, enum: ['worker', 'employer'], required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true, maxlength: 1000, default: '' },
}, { timestamps: true })

reviewSchema.index({ applicationId: 1, reviewerId: 1 }, { unique: true })
reviewSchema.index({ revieweeId: 1, createdAt: -1 })

export type ReviewRecord = InferSchemaType<typeof reviewSchema>
export const ReviewModel = model('Review', reviewSchema)
