import { Schema, model, type InferSchemaType } from 'mongoose'

const jobSchema = new Schema({
  employerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  employerName: { type: String, required: true, trim: true, maxlength: 100 },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 4000 },
  category: {
    type: String,
    required: true,
    enum: ['construction', 'electrician', 'plumber', 'painter', 'driver', 'cleaning', 'carpenter', 'helper'],
    index: true,
  },
  location: {
    city: { type: String, required: true, trim: true, maxlength: 100, index: true },
    area: { type: String, required: true, trim: true, maxlength: 100 },
  },
  payPerDay: { type: Number, required: true, min: 100, max: 100000 },
  openings: { type: Number, required: true, min: 1, max: 500, default: 1 },
  status: { type: String, enum: ['open', 'paused', 'closed'], default: 'open', index: true },
}, { timestamps: true })

jobSchema.index({ status: 1, category: 1, 'location.city': 1, createdAt: -1 })

export type JobRecord = InferSchemaType<typeof jobSchema>
export const JobModel = model('Job', jobSchema)