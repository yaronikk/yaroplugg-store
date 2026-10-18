import { describe, expect, it } from 'vitest'
import { normalizeContact, validateContact } from './orderValidation'

describe('validateContact', () => {
  it('accepts Telegram usernames, phone numbers, and email addresses', () => {
    expect(validateContact('telegram', '@yaroplugg')).toBe(true)
    expect(validateContact('phone', '+372 5555 5555')).toBe(true)
    expect(validateContact('email', 'buyer@example.ee')).toBe(true)
  })

  it('rejects invalid contact data', () => {
    expect(validateContact('telegram', '@x')).toBe(false)
    expect(validateContact('phone', 'abcde')).toBe(false)
    expect(validateContact('email', 'not-an-email')).toBe(false)
  })
})

describe('normalizeContact', () => {
  it('adds one @ prefix to a Telegram username', () => {
    expect(normalizeContact('telegram', '  @@yaroplugg  ')).toBe('@yaroplugg')
    expect(normalizeContact('email', ' buyer@example.ee ')).toBe('buyer@example.ee')
  })
})
