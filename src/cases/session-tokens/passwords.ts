import { createHash } from 'node:crypto'

const STATIC_SALT = 'cs7-app-salt'

export function hashPassword(password: string): string {
  return createHash('sha256').update(password + STATIC_SALT).digest('hex')
}

export function verifyPassword(password: string, storedHash: string): boolean {
  return hashPassword(password) === storedHash
}
