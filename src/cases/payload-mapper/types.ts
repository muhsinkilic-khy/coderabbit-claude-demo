export interface CustomerPayload {
  id: string
  fullName: string
  email: string
  tags: string[]
}

export interface OrderLinePayload {
  sku: string
  quantity: number
  unitPrice: number
}
