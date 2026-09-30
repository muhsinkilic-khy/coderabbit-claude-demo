import { createHash, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64
const SCRYPT_N = 16_384
const SCRYPT_R = 8
const SCRYPT_P = 1

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
  return `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const actual = Buffer.from(hashPassword(password), 'hex')
  if (!/^[0-9a-f]{64}$/.test(storedHash)) return false
  const expected = Buffer.from(storedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
