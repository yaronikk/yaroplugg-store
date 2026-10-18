export type ContactType = 'telegram' | 'phone' | 'email'

export function normalizeContact(type: ContactType, value: string): string {
  const clean = value.trim()
  return type === 'telegram' ? `@${clean.replace(/^@+/, '')}` : clean
}

export function validateContact(type: ContactType, value: string): boolean {
  const contact = value.trim()
  if (contact.length < 5 || contact.length > 120) return false
  if (type === 'telegram') return /^@?[A-Za-z0-9_]{5,32}$/.test(contact)
  if (type === 'phone') return /^\+?[0-9().\s-]{5,30}$/.test(contact) && (contact.match(/\d/g)?.length || 0) >= 5
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact)
}
