export interface Database {
  query(sql: string, params?: unknown[]): Promise<unknown[]>
}
