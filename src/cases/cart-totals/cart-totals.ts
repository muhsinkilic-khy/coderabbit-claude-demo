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
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const tax = subtotal * TAX_RATE
  const discount = (subtotal + tax) * (discountPercent / 100)
  const total = subtotal + tax - discount
  return { subtotal, discount, tax, total }
}

export function appliesFreeShipping(totals: CartTotals, threshold: number): boolean {
  return totals.subtotal >= threshold
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}
