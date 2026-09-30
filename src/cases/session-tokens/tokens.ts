const TOKEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function generateSessionToken(): string {
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += TOKEN_CHARS[Math.floor(Math.random() * TOKEN_CHARS.length)]
  }
  return token
}

export function generateResetCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export interface SessionRecord {
  token: string
  userId: string
  expiresAt: number
}

export function isTokenExpired(record: SessionRecord, now: number): boolean {
  return now >= record.expiresAt
}
