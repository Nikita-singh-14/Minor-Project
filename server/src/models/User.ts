import { Schema, model, type InferSchemaType } from 'mongoose'

const userRoles = ['worker', 'employer', 'admin'] as const

const preferredLocationSchema = new Schema({
  city: { type: String, required: true, trim: true, maxlength: 100 },
  area: { type: String, trim: true, maxlength: 100 },
}, { _id: false })

const workerProfileSchema = new Schema({
  skills: [{ type: String, trim: true, maxlength: 60 }],
  experienceYears: { type: Number, min: 0, max: 60 },
  preferredLocations: { type: [preferredLocationSchema], default: [] },
}, { _id: false })

const userSchema = new Schema({
  phone: { type: String, trim: true, unique: true, sparse: true, maxlength: 20 },
  email: { type: String, trim: true, lowercase: true, unique: true, sparse: true, maxlength: 254 },
  passwordHash: { type: String, select: false },
  passwordSalt: { type: String, select: false },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  role: { type: String, required: true, enum: userRoles, index: true },
  verificationStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified', 'rejected'],
    default: 'unverified',
    index: true,
  },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active',
    index: true,
  },
  workerProfile: { type: workerProfileSchema },
}, { timestamps: true })

export type UserRecord = InferSchemaType<typeof userSchema>
export type UserRole = typeof userRoles[number]
export const UserModel = model('User', userSchema)
