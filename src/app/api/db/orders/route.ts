import { NextRequest, NextResponse } from 'next/server'
import { Pool } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'

const DATABASE_URL = process.env.DATABASE_URL || ''
let pool: Pool | null = null

async function getPool() {
  if (!DATABASE_URL) return null
  if (!pool) pool = new Pool({ connectionString: DATABASE_URL, max: 1 })
  return pool
}

// GET /api/db/orders?page=1&pageSize=10&search=&searchField=&startDate=&endDate=
export async function GET(request: NextRequest) {
  const p = await getPool()
  if (!p) return NextResponse.json({ error: 'no db' }, { status: 500 })

  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const search = searchParams.get('search') || ''
    const searchField = searchParams.get('searchField') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    const params: any[] = []
    const conditions: string[] = []

    if (search && searchField) {
      const colMap: Record<string, string> = { external_code: 'external_code', receiver_name: 'receiver_name', store_name: 'store_name' }
      const col = colMap[searchField] || 'external_code'
      conditions.push(`${col} ILIKE $${params.length + 1}`)
      params.push(`%${search}%`)
    }
    if (startDate) { conditions.push(`created_at >= $${params.length + 1}`); params.push(startDate) }
    if (endDate) { conditions.push(`created_at <= $${params.length + 1}`); params.push(endDate) }

    const whereBase = conditions.length > 0 ? conditions.join(' AND ') : '1=1'

    // Get all distinct order keys sorted by latest activity (newest first)
    // This query is lightweight (only keys + timestamps)
    const keysSql = `
      SELECT order_key, MAX(ts) AS latest_at FROM (
        SELECT external_code AS order_key, MAX(created_at) AS ts
        FROM waybill_records WHERE ${whereBase} AND external_code IS NOT NULL
        GROUP BY external_code
        UNION ALL
        SELECT id AS order_key, MAX(created_at) AS ts
        FROM waybill_records WHERE ${whereBase} AND external_code IS NULL
        GROUP BY id
      ) AS activity
      GROUP BY order_key
      ORDER BY latest_at DESC
    `
    const keysResult = await p.query(keysSql, params)
    const allKeys = keysResult.rows.map((r: any) => r.order_key)
    const total = allKeys.length

    // Paginate in JS
    const pageKeys = allKeys.slice((page - 1) * pageSize, page * pageSize)

    // Fetch items for these order keys
    let items: any[] = []
    if (pageKeys.length > 0) {
      const ph = pageKeys.map((_: any, i: number) => `$${i + 1}`).join(',')
      const itemsSql = `SELECT * FROM waybill_records WHERE COALESCE(external_code, id) IN (${ph}) ORDER BY created_at DESC`
      const itemResult = await p.query(itemsSql, pageKeys)
      items = itemResult.rows
    }

    // Group into orders
    const groupedMap = new Map<string, any>()
    for (const item of items) {
      const key = item.external_code || item.id
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          externalCode: item.external_code || '',
          storeName: item.store_name || '',
          receiverName: item.receiver_name || '',
          receiverPhone: item.receiver_phone || '',
          receiverAddress: item.receiver_address || '',
          created_at: item.created_at,
          items: [],
          itemCount: 0,
          totalQuantity: 0,
        })
      }
      const order = groupedMap.get(key)!
      order.items.push({
        id: item.id, skuCode: item.sku_code, skuName: item.sku_name,
        skuQuantity: parseInt(item.sku_quantity) || 0, skuSpec: item.sku_spec || '',
        remark: item.remark || '', externalCode: item.external_code || '',
      })
      order.itemCount++
      order.totalQuantity += parseInt(item.sku_quantity) || 0
    }

    // Preserve keys order (newest first)
    const data = pageKeys
      .map((key: string) => groupedMap.get(key))
      .filter(Boolean)

    return NextResponse.json({ data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) })
  } catch (err) {
    console.error('Orders API error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
