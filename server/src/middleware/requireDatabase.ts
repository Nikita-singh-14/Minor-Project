import mongoose from 'mongoose'
import type { NextFunction, Request, Response } from 'express'

export function isDatabaseReady() {
  return mongoose.connection.readyState === 1
}

export function databaseUnavailableMessage() {
  return process.env.MONGODB_URI
    ? 'Database is unavailable. Check the MongoDB connection and try again.'
    : 'Database is not configured. Set MONGODB_URI to enable authentication.'
}

export function requireDatabase(_request: Request, response: Response, next: NextFunction) {
  if (isDatabaseReady()) {
    next()
    return
  }

  response.status(503).json({ error: databaseUnavailableMessage() })
}
