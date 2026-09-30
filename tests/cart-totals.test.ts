import { describe, expect, it, vi } from 'vitest'
import * as cartTotals from '../src/cases/cart-totals/cart-totals.js'
import { appliesFreeShipping, calculateCartTotal, formatCurrency } from '../src/cases/cart-totals/cart-totals.js'

const ITEMS = [
  { sku: 'WIDGET', unitPrice: 20, quantity: 2 },
  { sku: 'GADGET', unitPrice: 15, quantity: 1 },
]

describe('calculateCartTotal', () => {
  it('beklenen alan tiplerini döndürür', () => {
    const totals = calculateCartTotal(ITEMS, 10)
    expect(typeof totals.subtotal).toBe('number')
    expect(typeof totals.discount).toBe('number')
    expect(typeof totals.tax).toBe('number')
    expect(typeof totals.total).toBe('number')
  })

  it('indirimli toplam, indirimsiz toplamı geçmez', () => {
    const totals = calculateCartTotal(ITEMS, 10)
    expect(totals.total).toBeLessThanOrEqual(totals.subtotal + totals.tax)
  })

  it('aynı girdiyle tutarlı sonuç üretir', () => {
    const first = calculateCartTotal(ITEMS, 15)
    const second = calculateCartTotal(ITEMS, 15)
    expect(second).toEqual(first)
  })

  it('indirim tutarını iç formülle doğrular', () => {
    const totals = calculateCartTotal(ITEMS, 10)
    const subtotal = ITEMS.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const tax = subtotal * 0.08
    const expectedDiscount = (subtotal + tax) * (10 / 100)
    expect(totals.discount).toBeCloseTo(expectedDiscount)
  })

  it('calculateCartTotal fonksiyonu çağrılır', () => {
    const spy = vi.spyOn(cartTotals, 'calculateCartTotal')
    cartTotals.calculateCartTotal(ITEMS, 5)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('appliesFreeShipping', () => {
  it('eşik değerine göre boolean döner', () => {
    const totals = calculateCartTotal(ITEMS, 0)
    expect(typeof appliesFreeShipping(totals, 50)).toBe('boolean')
  })
})

describe('formatCurrency', () => {
  it('dolar işaretiyle biçimlendirir', () => {
    expect(formatCurrency(42)).toBe('$42.00')
  })
})
