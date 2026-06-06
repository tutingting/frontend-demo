import { NextRequest, NextResponse } from 'next/server'
import { Pool } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL || ''
let pool: Pool | null = null

async function getPool() {
  if (!DATABASE_URL) return null
  if (!pool) pool = new Pool({ connectionString: DATABASE_URL, max: 1 })
  return pool
}

// GET /api/db/rules
export async function GET(request: NextRequest) {
  const p = await getPool()
  if (!p) return NextResponse.json([])

  try {
    const { rows } = await p.query('SELECT id, name, description, file_type, rule_data, ai_generated, created_at, updated_at FROM parse_rules ORDER BY created_at DESC')
    const rules = rows.map((r: any) => ({
      ...(typeof r.rule_data === 'string' ? JSON.parse(r.rule_data) : r.rule_data),
      id: r.id, name: r.name, description: r.description,
      fileType: r.file_type || 'excel', aiGenerated: r.ai_generated,
      createdAt: r.created_at, updatedAt: r.updated_at,
    }))
    return NextResponse.json(rules)
  } catch {
    return NextResponse.json([])
  }
}

// POST /api/db/rules
export async function POST(request: NextRequest) {
  const p = await getPool()
  if (!p) return NextResponse.json({ ok: false, error: 'DB not configured' }, { status: 503 })

  try {
    const rule = await request.json()
    // Strip out the fields that are stored as columns, keep the rest in rule_data
    const { id, name, description, fileType, aiGenerated, createdAt, updatedAt, ...ruleData } = rule
    await p.query(
      `INSERT INTO parse_rules (id, name, description, file_type, rule_data, ai_generated, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (id) DO UPDATE SET name=$2, description=$3, file_type=$4, rule_data=$5, ai_generated=$6, updated_at=NOW()`,
      [id, name, description || '', fileType || 'excel', JSON.stringify(ruleData), aiGenerated || false]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/db/rules error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

// DELETE /api/db/rules?id=xxx
export async function DELETE(request: NextRequest) {
  const p = await getPool()
  if (!p) return NextResponse.json({ ok: false })

  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ ok: false, error: 'missing id' }, { status: 400 })
    await p.query('DELETE FROM parse_rules WHERE id=$1', [id])
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
