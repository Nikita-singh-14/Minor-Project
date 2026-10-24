import { Schema, model, type InferSchemaType } from 'mongoose'

const moderationEventSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  action: {
    type: String,
    required: true,
    enum: ['approved', 'rejected', 'paused', 'reopened', 'closed', 'removed'],
  },
  reason: { type: String, trim: true, maxlength: 1000 },
}, { timestamps: { createdAt: true, updatedAt: false } })

moderationEventSchema.index({ jobId: 1, createdAt: -1 })
moderationEventSchema.index({ adminId: 1, createdAt: -1 })

export type ModerationEventRecord = InferSchemaType<typeof moderationEventSchema>
export const ModerationEventModel = model('ModerationEvent', moderationEventSchema)
