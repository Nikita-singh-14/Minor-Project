import { Schema, model, type InferSchemaType } from 'mongoose'

const authSessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, default: null },
}, { timestamps: true })

export type AuthSessionRecord = InferSchemaType<typeof authSessionSchema>
export const AuthSessionModel = model('AuthSession', authSessionSchema)
