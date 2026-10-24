import type { Request, Response } from 'express'

export const SESSION_COOKIE_NAME = 'rozgaar_session'

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

function cookieAttributes() {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}

export function readSessionCookie(request: Request) {
  const cookie = request.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
  const token = cookie?.slice(SESSION_COOKIE_NAME.length + 1)
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined
}

export function setSessionCookie(response: Response, token: string) {
  response.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=${token}; ${cookieAttributes()}`)
}

export function clearSessionCookie(response: Response) {
  response.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  )
}
