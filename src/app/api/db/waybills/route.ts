import { NextRequest, NextResponse } from 'next/server'
import { Pool } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL || ''
let pool: Pool | null = null

async function getPool() {
  if (!DATABASE_URL) return null
  if (!pool) pool = new Pool({ connectionString: DATABASE_URL, max: 1 })
  return pool
}

// GET /api/db/waybills?page=1&pageSize=20&search=&searchField=
export async function GET(request: NextRequest) {
  const p = await getPool()
  if (!p) return NextResponse.json({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 })

  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const searchField = searchParams.get('searchField') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    let sql = 'SELECT * FROM waybill_records'
    const params: any[] = []
    const conditions: string[] = []

    if (search && searchField) {
      const colMap: Record<string, string> = { external_code: 'external_code', receiver_name: 'receiver_name', store_name: 'store_name' }
      const col = colMap[searchField] || 'external_code'
      conditions.push(`${col} ILIKE $${params.length + 1}`)
      params.push(`%${search}%`)
    }

    if (startDate) {
      conditions.push(`created_at >= $${params.length + 1}`)
      params.push(startDate)
    }

    if (endDate) {
      conditions.push(`created_at <= $${params.length + 1}`)
      params.push(endDate)
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }

    const countResult = await p.query(sql.replace('SELECT *', 'SELECT COUNT(*)'), params)
    const total = parseInt(countResult.rows[0]?.count || '0')

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(pageSize, (page - 1) * pageSize)

    const { rows } = await p.query(sql, params)
    return NextResponse.json({
      data: rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    })
  } catch {
    return NextResponse.json({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 })
  }
}

// POST /api/db/waybills — batch INSERT for performance
export async function POST(request: NextRequest) {
  const p = await getPool()
  if (!p) return NextResponse.json({ ok: false })

  try {
    const records = await request.json()
    if (records.length === 0) return NextResponse.json({ ok: true, count: 0 })

    // Batch multi-row INSERT: build VALUES placeholders in blocks of 500
    const batchSize = 500
    let totalInserted = 0

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      const values: any[] = []
      const placeholders: string[] = []

      batch.forEach((r: any, idx: number) => {
        const base = idx * 13
        placeholders.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},$${base + 12},$${base + 13})`)
        values.push(
          r.id, r.sessionId || '', r.externalCode || null, r.storeName || null,
          r.receiverName || null, r.receiverPhone || null, r.receiverAddress || null,
          r.skuCode, r.skuName, r.skuQuantity, r.skuSpec || null, r.remark || null,
          r.createdAt || new Date().toISOString()
        )
      })

      await p.query(
        `INSERT INTO waybill_records (id, session_id, external_code, store_name, receiver_name, receiver_phone, receiver_address, sku_code, sku_name, sku_quantity, sku_spec, remark, created_at)
         VALUES ${placeholders.join(',')}
         ON CONFLICT (id) DO NOTHING`,
        values
      )
      totalInserted += batch.length
    }

    return NextResponse.json({ ok: true, count: totalInserted })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

// DELETE /api/db/waybills — clears ALL data from all tables
export async function DELETE() {
  const p = await getPool()
  if (!p) return NextResponse.json({ ok: false, error: 'DB not configured' }, { status: 503 })

  try {
    await p.query('DELETE FROM waybill_records')
    await p.query('DELETE FROM import_sessions')
    await p.query('DELETE FROM parse_rules')
    return NextResponse.json({ ok: true, message: '所有表数据已清空' })
  } catch (err) {
    console.error('DELETE /api/db/waybills error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
