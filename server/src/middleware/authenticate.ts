import { createHash } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { readSessionCookie } from '../auth/sessionCookie.js'
import { AuthSessionModel } from '../models/AuthSession.js'
import { UserModel } from '../models/User.js'
import type { UserRole } from '../models/User.js'

export type AuthRole = UserRole

declare global {
  namespace Express {
    interface Request {
      authUser?: { id: string; role: AuthRole; name: string }
    }
  }
}

export async function authenticate(request: Request, response: Response, next: NextFunction) {
  const token = readSessionCookie(request)

  if (!token) {
    response.status(401).json({ error: 'Authentication required' })
    return
  }

  try {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const session = await AuthSessionModel.findOne({
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).lean()

    if (!session) {
      response.status(401).json({ error: 'Session is invalid or expired' })
      return
    }

    const user = await UserModel.findOne({ _id: session.userId, accountStatus: 'active' })
      .select('_id role name')
      .lean()

    if (!user) {
      response.status(401).json({ error: 'Account is unavailable' })
      return
    }

    request.authUser = { id: user._id.toString(), role: user.role, name: user.name }
    next()
  } catch (error) {
    next(error)
  }
}

export function requireRole(...roles: AuthRole[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.authUser) {
      response.status(401).json({ error: 'Authentication required' })
      return
    }

    if (!roles.includes(request.authUser.role)) {
      response.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    next()
  }
}
