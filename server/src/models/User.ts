import { Schema, model, type InferSchemaType } from 'mongoose'

const userRoles = ['worker', 'employer', 'admin'] as const

const preferredLocationSchema = new Schema({
  city: { type: String, required: true, trim: true, maxlength: 100 },
  area: { type: String, trim: true, maxlength: 100 },
}, { _id: false })

const workerProfileSchema = new Schema({
  bio: { type: String, trim: true, maxlength: 1000, default: '' },
  skills: [{ type: String, trim: true, maxlength: 60 }],
  experienceYears: { type: Number, min: 0, max: 60 },
  preferredLocations: { type: [preferredLocationSchema], default: [] },
  isVisible: { type: Boolean, default: false },
  contactVisible: { type: Boolean, default: false },
}, { _id: false })

const userSchema = new Schema({
  phone: { type: String, trim: true, maxlength: 20 },
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

userSchema.index({ role: 1, accountStatus: 1, 'workerProfile.isVisible': 1, 'workerProfile.preferredLocations.city': 1 })
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } },
)

export type UserRecord = InferSchemaType<typeof userSchema>
export type UserRole = typeof userRoles[number]
export const UserModel = model('User', userSchema)
