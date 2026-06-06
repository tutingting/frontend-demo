import type { OrderRow, OrderGroup, OrderItem, WaybillRecord } from '@/types'

/** Aggregate OrderRows by externalCode */
export function aggregateByExternalCode(rows: OrderRow[]): OrderGroup[] {
  const groupMap = new Map<string, OrderGroup>()

  for (const row of rows) {
    const code = row.externalCode || `SINGLE_${row._rowIndex}`
    const existing = groupMap.get(code)

    const item: OrderItem = {
      skuCode: row.skuCode,
      skuName: row.skuName,
      skuQuantity: Number(row.skuQuantity) || 0,
      skuSpec: row.skuSpec,
      remark: row.remark,
    }

    if (existing) {
      existing.items.push(item)
      existing.rowIndexes.push(row._rowIndex)
    } else {
      groupMap.set(code, {
        externalCode: code.startsWith('SINGLE_') ? '' : code,
        storeName: row.storeName,
        receiverName: row.receiverName,
        receiverPhone: row.receiverPhone,
        receiverAddress: row.receiverAddress,
        items: [item],
        rowIndexes: [row._rowIndex],
        createdAt: new Date().toISOString(),
      })
    }
  }

  return Array.from(groupMap.values())
}

/** Aggregate WaybillRecords into outbound orders (for list view) */
export interface OutboundOrder {
  externalCode: string
  storeName?: string
  receiverName?: string
  receiverPhone?: string
  receiverAddress?: string
  items: WaybillRecord[]
  itemCount: number
  totalQuantity: number
  createdAt: string
}

export function aggregateWaybillsToOrders(records: WaybillRecord[]): OutboundOrder[] {
  const groupMap = new Map<string, OutboundOrder>()

  for (const record of records) {
    const code = record.externalCode || `SINGLE_${record.id.slice(0, 8)}`
    const existing = groupMap.get(code)

    if (existing) {
      existing.items.push(record)
      existing.itemCount++
      existing.totalQuantity += record.skuQuantity
    } else {
      groupMap.set(code, {
        externalCode: code.startsWith('SINGLE_') ? '' : code,
        storeName: record.storeName,
        receiverName: record.receiverName,
        receiverPhone: record.receiverPhone,
        receiverAddress: record.receiverAddress,
        items: [record],
        itemCount: 1,
        totalQuantity: record.skuQuantity,
        createdAt: record.createdAt,
      })
    }
  }

  return Array.from(groupMap.values())
}

export function countTotalItems(groups: OrderGroup[] | { itemCount: number }[]): number {
  return groups.reduce((sum, g: any) => sum + (g.itemCount || g.items?.length || 0), 0)
}

export function countUniqueSkus(groups: OrderGroup[] | { items: any[] }[]): number {
  return new Set(groups.flatMap((g: any) => g.items.map((i: any) => i.skuCode))).size
}
