import { createHash, randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { Router } from 'express'
import { z } from 'zod'
import { clearSessionCookie, readSessionCookie, setSessionCookie } from '../auth/sessionCookie.js'
import { authenticate } from '../middleware/authenticate.js'
import { AuthSessionModel } from '../models/AuthSession.js'
import { OtpChallengeModel } from '../models/OtpChallenge.js'
import { UserModel } from '../models/User.js'

const router = Router()
const scrypt = promisify(scryptCallback)
const OTP_TTL_MS = 5 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 60 * 1000
const OTP_MAX_ATTEMPTS = 5
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

router.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store')
  next()
})

const requestOtpSchema = z.object({
  phone: z.string().trim().min(10).max(16),
  purpose: z.enum(['register', 'login']).default('login'),
  name: z.string().trim().min(2).max(100).optional(),
  role: z.enum(['worker', 'employer']).optional(),
}).strict()

const passwordRegistrationSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
  name: z.string().trim().min(2).max(100),
  role: z.enum(['worker', 'employer']),
}).strict()

const passwordLoginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
}).strict()

const verifyOtpSchema = z.object({
  phone: z.string().trim().min(10).max(16),
  code: z.string().regex(/^\d{6}$/),
}).strict()

function normalizePhone(phone: string) {
  const digits = phone.replace(/[\s()-]/g, '')
  const normalized = /^\d{10}$/.test(digits) ? `+91${digits}` : digits
  return /^\+91[6-9]\d{9}$/.test(normalized) ? normalized : null
}

async function hashOtp(code: string, salt: Buffer) {
  return Buffer.from(await scrypt(code, salt, 64) as Buffer)
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

async function hashPassword(password: string, salt: Buffer) {
  return Buffer.from(await scrypt(password, salt, 64) as Buffer)
}

function isDuplicateKeyError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000
}

router.post('/password/register', async (request, response, next) => {
  const parsed = passwordRegistrationSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: 'Enter a valid email, a password of at least 10 characters, your name, and account type' })
    return
  }

  try {
    const existingUser = await UserModel.findOne({ email: parsed.data.email }).select('_id').lean()
    if (existingUser) {
      response.status(409).json({ error: 'An account already exists for this email. Please sign in instead.' })
      return
    }

    const salt = randomBytes(16)
    const passwordHash = await hashPassword(parsed.data.password, salt)
    let user
    try {
      user = await UserModel.create({
        email: parsed.data.email,
        passwordHash: passwordHash.toString('hex'),
        passwordSalt: salt.toString('hex'),
        name: parsed.data.name,
        role: parsed.data.role,
        verificationStatus: 'unverified',
        accountStatus: 'active',
      })
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        response.status(409).json({ error: 'An account already exists for this email. Please sign in instead.' })
        return
      }
      throw error
    }

    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
    await AuthSessionModel.create({
      userId: user._id,
      tokenHash: hashToken(token),
      expiresAt,
    })
    setSessionCookie(response, token)

    response.status(201).json({
      expiresAt: expiresAt.toISOString(),
      user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
    })
  } catch (error) {
    next(error)
  }
})

router.post('/password/login', async (request, response, next) => {
  const parsed = passwordLoginSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: 'Enter a valid email and password' })
    return
  }

  try {
    const user = await UserModel.findOne({ email: parsed.data.email })
      .select('+passwordHash +passwordSalt')
    const salt = user?.passwordSalt ? Buffer.from(user.passwordSalt, 'hex') : randomBytes(16)
    const suppliedHash = await hashPassword(parsed.data.password, salt)
    const storedHash = user?.passwordHash ? Buffer.from(user.passwordHash, 'hex') : Buffer.alloc(0)
    const passwordMatches = storedHash.length > 0
      && suppliedHash.length === storedHash.length
      && timingSafeEqual(suppliedHash, storedHash)
    if (!user || !passwordMatches) {
      response.status(401).json({ error: 'Invalid email or password' })
      return
    }
    if (user.accountStatus !== 'active') {
      response.status(403).json({ error: 'This account is unavailable' })
      return
    }

    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
    await AuthSessionModel.create({
      userId: user._id,
      tokenHash: hashToken(token),
      expiresAt,
    })
    setSessionCookie(response, token)

    response.json({
      expiresAt: expiresAt.toISOString(),
      user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
    })
  } catch (error) {
    next(error)
  }
})

router.post('/otp/request', async (request, response, next) => {
  const parsed = requestOtpSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid OTP request', details: parsed.error.flatten() })
    return
  }

  const phone = normalizePhone(parsed.data.phone)
  if (!phone) {
    response.status(400).json({ error: 'Enter a valid Indian mobile number' })
    return
  }

  const developmentOtpEnabled = process.env.NODE_ENV !== 'production' && process.env.OTP_DEV_MODE === 'true'
  if (!developmentOtpEnabled) {
    response.status(503).json({ error: 'SMS delivery is not configured. Enable the development OTP mode only for local development.' })
    return
  }

  try {
    const now = new Date()
    const existingUser = await UserModel.findOne({ phone }).select('name role accountStatus').lean()

    if (parsed.data.purpose === 'register') {
      if (existingUser) {
        response.status(409).json({ error: 'An account already exists for this number. Please sign in instead.' })
        return
      }
      if (!parsed.data.name || !parsed.data.role) {
        response.status(400).json({ error: 'Name and account type are required to register' })
        return
      }
    } else if (!existingUser) {
      response.status(404).json({ error: 'No account found for this number. Please register first.' })
      return
    } else if (existingUser.accountStatus !== 'active') {
      response.status(403).json({ error: 'This account is unavailable' })
      return
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    const salt = randomBytes(16)
    const codeHash = await hashOtp(code, salt)
    const challengeData = {
      phone,
      name: existingUser?.name ?? parsed.data.name!,
      role: existingUser?.role ?? parsed.data.role,
      purpose: parsed.data.purpose,
      codeHash,
      codeSalt: salt,
      attempts: 0,
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      resendAvailableAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS),
    }

    const updatedChallenge = await OtpChallengeModel.findOneAndUpdate(
      {
        phone,
        $or: [
          { expiresAt: { $lte: now } },
          { resendAvailableAt: { $lte: now }, attempts: { $lt: OTP_MAX_ATTEMPTS } },
        ],
      },
      { $set: challengeData },
      { new: true, runValidators: true },
    )

    if (!updatedChallenge) {
      try {
        await OtpChallengeModel.create(challengeData)
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          response.status(429).json({ error: 'Please wait before requesting another code' })
          return
        }
        throw error
      }
    }

    response.json({
      message: 'Verification code generated for local development.',
      ...(developmentOtpEnabled ? { developmentOtp: code } : {}),
    })
  } catch (error) {
    next(error)
  }
})

router.post('/otp/verify', async (request, response, next) => {
  const parsed = verifyOtpSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid OTP verification request', details: parsed.error.flatten() })
    return
  }

  const phone = normalizePhone(parsed.data.phone)
  if (!phone) {
    response.status(400).json({ error: 'Enter a valid Indian mobile number' })
    return
  }

  try {
    const now = new Date()
    const challenge = await OtpChallengeModel.findOneAndUpdate(
      { phone, expiresAt: { $gt: now }, attempts: { $lt: OTP_MAX_ATTEMPTS } },
      { $inc: { attempts: 1 } },
      { new: true },
    )

    if (!challenge) {
      response.status(400).json({ error: 'Code is invalid, expired, or has too many failed attempts' })
      return
    }

    const suppliedHash = await hashOtp(parsed.data.code, challenge.codeSalt)
    if (suppliedHash.length !== challenge.codeHash.length || !timingSafeEqual(suppliedHash, challenge.codeHash)) {
      response.status(400).json({ error: 'Code is invalid, expired, or has too many failed attempts' })
      return
    }

    const consumed = await OtpChallengeModel.deleteOne({
      _id: challenge._id,
      codeHash: challenge.codeHash,
      attempts: challenge.attempts,
      expiresAt: { $gt: now },
    })
    if (consumed.deletedCount !== 1) {
      response.status(400).json({ error: 'Code is invalid, expired, or has already been used' })
      return
    }

    let user = await UserModel.findOne({ phone })
    if (challenge.purpose === 'register') {
      if (user) {
        response.status(409).json({ error: 'An account already exists for this number. Please sign in instead.' })
        return
      }
      try {
        user = await UserModel.create({
          phone,
          name: challenge.name,
          role: challenge.role,
          verificationStatus: 'verified',
          accountStatus: 'active',
        })
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          response.status(409).json({ error: 'An account already exists for this number. Please sign in instead.' })
          return
        }
        throw error
      }
    } else if (!user || user.accountStatus !== 'active') {
      response.status(403).json({ error: 'This account is unavailable' })
      return
    } else if (user.verificationStatus !== 'verified') {
      user.verificationStatus = 'verified'
      await user.save()
    }

    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)
    await AuthSessionModel.create({
      userId: user._id,
      tokenHash: hashToken(token),
      expiresAt,
    })
    setSessionCookie(response, token)

    response.json({
      expiresAt: expiresAt.toISOString(),
      user: { id: user._id.toString(), name: user.name, phone: user.phone, role: user.role },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/me', authenticate, (request, response) => {
  response.json({ user: request.authUser })
})

router.post('/logout', async (request, response, next) => {
  try {
    const token = readSessionCookie(request)
    if (token) {
      await AuthSessionModel.updateOne({ tokenHash: hashToken(token), revokedAt: null }, { revokedAt: new Date() })
    }
    clearSessionCookie(response)
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

export default router
