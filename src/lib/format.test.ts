import { describe, expect, it } from 'vitest'
import { dbProduct, isBeltCategory, normalizeColors } from './format'

describe('normalizeColors', () => {
  it('normalizes named colors and valid hex values', () => {
    expect(normalizeColors('[{"name":"Black","hex":"#0B0B0B"},"White"]')).toEqual([
      { name: 'Black', hex: '#0b0b0b' },
      { name: 'White', hex: '#f5f5f3' },
    ])
  })

  it('returns an empty list for unsupported values', () => {
    expect(normalizeColors(null)).toEqual([])
    expect(normalizeColors(42)).toEqual([])
  })
})

describe('dbProduct', () => {
  it('maps a database row and clamps invalid stock to zero', () => {
    expect(dbProduct({ id: 'p1', name: 'Belt', price: '20', stock: -2, colors: [], sizes: [], images: [] })).toMatchObject({
      id: 'p1',
      name: 'Belt',
      price: 20,
      stock: 0,
      category: 'T-Shirts',
      images: [],
    })
  })
})

describe('isBeltCategory', () => {
  it('matches the belts category without case or surrounding whitespace sensitivity', () => {
    expect(isBeltCategory(' Belts ')).toBe(true)
    expect(isBeltCategory('T-Shirts')).toBe(false)
  })
})
