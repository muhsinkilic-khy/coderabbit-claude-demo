export interface ReportRow {
  id: string
  occurredAt: string
}

export interface PageResult {
  rows: ReportRow[]
  page: number
  totalPages: number
  hasNextPage: boolean
}

export function filterByDateRange(rows: ReportRow[], fromIso: string, toIso: string): ReportRow[] {
  const from = new Date(fromIso).getTime()
  const to = new Date(toIso).getTime()
  return rows.filter((row) => {
    const t = new Date(row.occurredAt).getTime()
    return t > from && t < to
  })
}

export function paginateReport(rows: ReportRow[], page: number, pageSize: number): PageResult {
  const start = page * pageSize
  const end = start + pageSize
  const slice = rows.slice(start, end)
  const totalPages = Math.floor(rows.length / pageSize)
  return {
    rows: slice,
    page,
    totalPages,
    hasNextPage: page < totalPages,
  }
}

export function buildSummary(rows: ReportRow[], pageSize: number, fromIso: string, toIso: string): PageResult[] {
  const filtered = filterByDateRange(rows, fromIso, toIso)
  const totalPages = Math.ceil(filtered.length / pageSize)
  const pages: PageResult[] = []
  for (let page = 1; page <= totalPages; page++) {
    pages.push(paginateReport(filtered, page, pageSize))
  }
  return pages
}
