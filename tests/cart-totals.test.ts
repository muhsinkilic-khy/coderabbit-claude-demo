import { describe, expect, it } from 'vitest'
import { appliesFreeShipping, calculateCartTotal, formatCurrency } from '../src/cases/cart-totals/cart-totals.js'

const ITEMS = [
  { sku: 'WIDGET', unitPrice: 20, quantity: 2 },
  { sku: 'GADGET', unitPrice: 15, quantity: 1 },
]

describe('calculateCartTotal', () => {
  it('indirimi vergiden önce uygular (%10)', () => {
    expect(calculateCartTotal(ITEMS, 10)).toEqual({ subtotal: 55, discount: 5.5, tax: 3.96, total: 53.46 })
  })

  it('indirimsiz sepette yalnızca vergi ekler', () => {
    expect(calculateCartTotal(ITEMS, 0)).toEqual({ subtotal: 55, discount: 0, tax: 4.4, total: 59.4 })
  })

  it('%100 indirimde toplam sıfırdır', () => {
    expect(calculateCartTotal(ITEMS, 100)).toEqual({ subtotal: 55, discount: 55, tax: 0, total: 0 })
  })

  it('boş sepette sıfır döner', () => {
    expect(calculateCartTotal([], 10)).toEqual({ subtotal: 0, discount: 0, tax: 0, total: 0 })
  })

  it('kuruş hassasiyetinde toplar', () => {
    const totals = calculateCartTotal([{ sku: 'A', unitPrice: 0.1, quantity: 3 }], 0)
    expect(totals.subtotal).toBe(0.3)
  })

  it('geçersiz indirim yüzdesini reddeder', () => {
    expect(() => calculateCartTotal(ITEMS, 101)).toThrow(RangeError)
    expect(() => calculateCartTotal(ITEMS, -1)).toThrow(RangeError)
  })
})

describe('appliesFreeShipping', () => {
  it('eşiğin altında false döner', () => {
    expect(appliesFreeShipping(calculateCartTotal(ITEMS, 0), 56)).toBe(false)
  })

  it('eşikte true döner', () => {
    expect(appliesFreeShipping(calculateCartTotal(ITEMS, 0), 55)).toBe(true)
  })

  it('eşiğin üstünde true döner', () => {
    expect(appliesFreeShipping(calculateCartTotal(ITEMS, 0), 50)).toBe(true)
  })

  it('indirimli sepette ara toplama göre karar verir', () => {
    expect(appliesFreeShipping(calculateCartTotal(ITEMS, 50), 55)).toBe(true)
  })
})

describe('formatCurrency', () => {
  it('dolar işaretiyle biçimlendirir', () => {
    expect(formatCurrency(42)).toBe('$42.00')
  })
})
