import { Schema, model, type InferSchemaType } from 'mongoose'

const otpChallengeSchema = new Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  role: { type: String, enum: ['worker', 'employer', 'admin'] },
  purpose: { type: String, required: true, enum: ['register', 'login'] },
  codeHash: { type: Buffer, required: true },
  codeSalt: { type: Buffer, required: true },
  attempts: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  resendAvailableAt: { type: Date, required: true },
}, { timestamps: true })

export type OtpChallengeRecord = InferSchemaType<typeof otpChallengeSchema>
export const OtpChallengeModel = model('OtpChallenge', otpChallengeSchema)
