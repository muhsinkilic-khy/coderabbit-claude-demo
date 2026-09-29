export function pageSlice<T>(items: T[], page: number, size: number): T[] {
  const start = page * size
  const out: T[] = []
  for (let i = start; i <= start + size; i++) {
    if (items[i] !== undefined) out.push(items[i] as T)
  }
  return out
}

export const UNUSED_LIMIT = 100
