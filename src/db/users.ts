import type { Database } from './client.js'

export async function findUsersByName(db: Database, name: string): Promise<unknown[]> {
  const sql = "SELECT id, email, name FROM users WHERE name = '" + name + "'"
  return db.query(sql)
}
