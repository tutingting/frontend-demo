import type { OrderRow, FieldError } from '@/types'

export function validateRow(row: OrderRow, allRows: OrderRow[]): FieldError[] {
  const errors: FieldError[] = []

  // Validate A/B group requirement
  const storeName = row.storeName == null ? '' : String(row.storeName)
  const receiverName = row.receiverName == null ? '' : String(row.receiverName)
  const receiverPhone = row.receiverPhone == null ? '' : String(row.receiverPhone)
  const receiverAddress = row.receiverAddress == null ? '' : String(row.receiverAddress)
  const skuCode = row.skuCode == null ? '' : String(row.skuCode)
  const skuName = row.skuName == null ? '' : String(row.skuName)

  const hasGroupA = !!storeName.trim()
  const hasGroupB = !!(receiverName.trim() || receiverPhone.trim() || receiverAddress.trim())
  const groupBComplete = !!(receiverName.trim() && receiverPhone.trim() && receiverAddress.trim())

  if (!hasGroupA && !groupBComplete) {
    if (hasGroupB && !groupBComplete) {
      errors.push({
        field: 'receiverName',
        message: 'B组（收件人模式）需同时填写收件人姓名、电话和地址',
      })
    } else if (!hasGroupA && !hasGroupB) {
      errors.push({
        field: 'storeName',
        message: 'A组（门店模式）需填写收货门店，或B组（收件人模式）需填写完整的收件人信息',
      })
    }
  }

  // Required fields
  if (!skuCode.trim()) {
    errors.push({ field: 'skuCode', message: 'SKU编码不能为空' })
  }

  if (!skuName.trim()) {
    errors.push({ field: 'skuName', message: 'SKU名称不能为空' })
  }

  // Quantity validation
  if (row.skuQuantity === undefined || row.skuQuantity === null || isNaN(Number(row.skuQuantity))) {
    errors.push({ field: 'skuQuantity', message: '发货数量必须为正数' })
  } else if (Number(row.skuQuantity) <= 0) {
    errors.push({ field: 'skuQuantity', message: '发货数量必须为正数' })
  } else if (!Number.isInteger(Number(row.skuQuantity))) {
    errors.push({ field: 'skuQuantity', message: '发货数量必须为整数' })
  }

  // Phone format validation (if provided)
  if (receiverPhone.trim()) {
    if (!/^1\d{10}$/.test(receiverPhone) && !/^\d{7,15}$/.test(receiverPhone)) {
      errors.push({ field: 'receiverPhone', message: '电话号码格式不正确' })
    }
  }

  return errors
}

export function validateAllRows(rows: OrderRow[]): OrderRow[] {
  // Build lookup maps for O(1) duplicate checks
  const groupSkuMap = new Map<string, number>() // key: "extCode||skuCode" → first row index
  const extCodeCount = new Map<string, number>()

  rows.forEach((row) => {
    const skuCode = String(row.skuCode || '').trim()
    const extCode = String(row.externalCode || '').trim()
    if (skuCode && extCode) {
      const key = `${extCode}||${skuCode}`
      if (!groupSkuMap.has(key)) groupSkuMap.set(key, row._rowIndex || 0)
    }
    if (extCode) {
      extCodeCount.set(extCode, (extCodeCount.get(extCode) || 0) + 1)
    }
  })

  return rows.map((row) => {
    const errors = validateRow(row, rows)

    const skuCode = String(row.skuCode || '').trim()
    const extCode = String(row.externalCode || '').trim()

    // O(1) duplicate SKU check within same group
    if (skuCode && extCode) {
      const key = `${extCode}||${skuCode}`
      const firstRowIdx = groupSkuMap.get(key)
      if (firstRowIdx !== undefined && firstRowIdx !== (row._rowIndex || 0)) {
        errors.push({ field: 'skuCode', message: `同一出库单中SKU编码"${skuCode}"重复（与第${firstRowIdx}行）` })
      }
    }

    // O(1) duplicate external code check
    let duplicate = false
    let duplicateWith = ''
    if (extCode && (extCodeCount.get(extCode) || 0) > 1) {
      duplicate = true
      const firstIdx = rows.find((r) => String(r.externalCode || '').trim() === extCode && r._rowIndex !== row._rowIndex)?._rowIndex
      if (firstIdx) duplicateWith = `第${firstIdx}行`
    }

    return {
      ...row,
      _errors: errors,
      _duplicate: duplicate,
      _duplicateWith: duplicateWith,
    }
  })
}
