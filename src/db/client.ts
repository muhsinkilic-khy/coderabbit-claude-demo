export interface Database {
  query(sql: string): Promise<unknown[]>
}
