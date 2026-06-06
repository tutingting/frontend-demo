import type { ParseRule, WaybillRecord, PaginatedResult, PaginationParams } from '@/types'

// ===== Orders (grouped by external_code, server-side paginated) =====
export interface OrderItemRecord {
  id: string
  skuCode: string
  skuName: string
  skuQuantity: number
  skuSpec: string
  remark: string
  externalCode: string
}

export interface OrderSummary {
  externalCode: string
  storeName: string
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  created_at: string
  items: OrderItemRecord[]
  itemCount: number
  totalQuantity: number
}

export async function getOrders(params: PaginationParams): Promise<PaginatedResult<OrderSummary>> {
  try {
    const qs = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    })
    if (params.search) qs.set('search', params.search)
    if (params.searchField) qs.set('searchField', params.searchField)
    if (params.startDate) qs.set('startDate', params.startDate)
    if (params.endDate) qs.set('endDate', params.endDate)

    const res = await fetch(`/api/db/orders?${qs}`)
    if (res.ok) return await res.json()
  } catch { /* API unavailable */ }
  return { data: [], total: 0, page: params.page, pageSize: params.pageSize, totalPages: 0 }
}

// ===== Rules - 全量DB操作，无 localStorage =====
export async function getRules(): Promise<ParseRule[]> {
  try {
    const res = await fetch('/api/db/rules')
    if (res.ok) {
      const rules: ParseRule[] = await res.json()
      return rules.map((r) => ({ ...r, fileType: r.fileType || 'excel' }))
    }
  } catch { /* API unavailable */ }
  return []
}

export async function saveRule(rule: ParseRule): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch('/api/db/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      })
      if (res.ok) return
    } catch {
      if (attempt === 1) throw new Error('保存规则失败：无法连接数据库')
    }
  }
}

export async function deleteRule(id: string): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`/api/db/rules?id=${id}`, { method: 'DELETE' })
      if (res.ok) return
    } catch {
      if (attempt === 1) throw new Error('删除规则失败：无法连接数据库')
    }
  }
}

// ===== Waybill Records - 全量DB操作，无 localStorage =====
export async function saveWaybills(records: WaybillRecord[]): Promise<number> {
  try {
    const res = await fetch('/api/db/waybills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(records),
    })
    if (res.ok) {
      const data = await res.json()
      return data.count || records.length
    }
  } catch { /* API unavailable */ }
  return 0
}

export async function getWaybills(params: PaginationParams): Promise<PaginatedResult<WaybillRecord>> {
  try {
    const qs = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    })
    if (params.search) qs.set('search', params.search)
    if (params.searchField) qs.set('searchField', params.searchField)
    if (params.startDate) qs.set('startDate', params.startDate)
    if (params.endDate) qs.set('endDate', params.endDate)

    const res = await fetch(`/api/db/waybills?${qs}`)
    if (res.ok) return await res.json()
  } catch { /* API unavailable */ }

  return { data: [], total: 0, page: params.page, pageSize: params.pageSize, totalPages: 0 }
}

export async function checkDuplicateExternalCodes(codes: string[]): Promise<string[]> {
  if (codes.length === 0) return []
  try {
    const qs = new URLSearchParams({ page: '1', pageSize: '5000', search: codes[0], searchField: 'external_code' })
    const res = await fetch(`/api/db/waybills?${qs}`)
    if (res.ok) {
      const result: PaginatedResult<WaybillRecord> = await res.json()
      return result.data.filter((r) => r.externalCode && codes.includes(r.externalCode)).map((r) => r.externalCode!)
    }
  } catch { /* ignore */ }
  return []
}
