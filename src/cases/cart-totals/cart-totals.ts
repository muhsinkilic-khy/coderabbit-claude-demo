export interface CartItem {
  sku: string
  unitPrice: number
  quantity: number
}

export interface CartTotals {
  subtotal: number
  discount: number
  tax: number
  total: number
}

const TAX_RATE = 0.08

export function calculateCartTotal(items: CartItem[], discountPercent: number): CartTotals {
  if (!(discountPercent >= 0 && discountPercent <= 100)) {
    throw new RangeError('discountPercent must be between 0 and 100')
  }
  const subtotalCents = items.reduce((sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity, 0)
  const discountCents = Math.round(subtotalCents * (discountPercent / 100))
  const taxCents = Math.round((subtotalCents - discountCents) * TAX_RATE)
  const totalCents = subtotalCents - discountCents + taxCents
  return {
    subtotal: subtotalCents / 100,
    discount: discountCents / 100,
    tax: taxCents / 100,
    total: totalCents / 100,
  }
}

export function appliesFreeShipping(totals: CartTotals, threshold: number): boolean {
  return totals.subtotal >= threshold
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}
