// Neon (PostgreSQL) database connection
// Uses @neondatabase/serverless for edge-compatible access

const DATABASE_URL = process.env.DATABASE_URL || ''

let pool: any = null

export async function getPool() {
  if (!DATABASE_URL) return null
  if (!pool) {
    const { Pool } = await import('@neondatabase/serverless')
    pool = new Pool({ connectionString: DATABASE_URL })
  }
  return pool
}

export async function query(sql: string, params?: any[]): Promise<any[]> {
  const p = await getPool()
  if (!p) throw new Error('DATABASE_URL not configured')
  const result = await p.query(sql, params)
  return result.rows
}

export async function isConnected(): Promise<boolean> {
  try {
    await query('SELECT 1')
    return true
  } catch {
    return false
  }
}
