import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'
import { serializeData } from '@/lib/serialize'

/**
 * These tests pin down the RSC serialization convention.
 *
 * The codebase previously had two competing approaches — serializeData() in a
 * few places and JSON.parse(JSON.stringify(...)) in ~20 others — which produced
 * *different types* for the same money field: Prisma's Decimal.toJSON() returns
 * a string, while serializeData calls .toNumber(). Money arriving as a string
 * on some paths and a number on others is how "12.50" + "3.00" becomes
 * "12.503.00" (PROJECT_AUDIT.md, finding M-3).
 *
 * serializeData is now the single convention. These tests fail if anyone
 * reintroduces the divergence.
 */
describe('serializeData — RSC serialization convention', () => {
  it('converts Prisma Decimal to a number, not a string', () => {
    const out = serializeData({ total: new Prisma.Decimal('12.50') })

    expect(typeof out.total).toBe('number')
    expect(out.total).toBe(12.5)
  })

  it('keeps money arithmetic numeric (the bug the convention prevents)', () => {
    const out = serializeData({
      a: new Prisma.Decimal('12.50'),
      b: new Prisma.Decimal('3.00'),
    })

    // With the JSON round-trip these were strings and this produced "12.503.00"
    expect(out.a + out.b).toBe(15.5)
  })

  it('differs from the JSON round-trip it replaced', () => {
    const value = { total: new Prisma.Decimal('12.50') }

    const viaJson = JSON.parse(JSON.stringify(value))
    const viaHelper = serializeData(value)

    expect(typeof viaJson.total).toBe('string')
    expect(typeof viaHelper.total).toBe('number')
  })

  it('converts Date to an ISO string', () => {
    const date = new Date('2026-01-15T10:30:00.000Z')
    const out = serializeData({ createdAt: date })

    expect(out.createdAt).toBe('2026-01-15T10:30:00.000Z')
  })

  it('recurses through arrays and nested objects', () => {
    const out = serializeData({
      items: [
        { price: new Prisma.Decimal('10.00'), meta: { cost: new Prisma.Decimal('4.25') } },
        { price: new Prisma.Decimal('20.00'), meta: { cost: new Prisma.Decimal('8.50') } },
      ],
    })

    expect(out.items[0].price).toBe(10)
    expect(out.items[0].meta.cost).toBe(4.25)
    expect(out.items[1].meta.cost).toBe(8.5)
  })

  it('passes primitives, null and undefined through untouched', () => {
    expect(serializeData(null)).toBeNull()
    expect(serializeData(undefined)).toBeUndefined()
    expect(serializeData('text')).toBe('text')
    expect(serializeData(42)).toBe(42)
    expect(serializeData(false)).toBe(false)
  })
})
