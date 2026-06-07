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
  // key: "extCode||skuCode" → row indices list (extCode defaults to "__no_extcode__" when empty)
  const groupSkuMap = new Map<string, number[]>()
  const extCodeCount = new Map<string, number>()

  rows.forEach((row) => {
    const skuCode = String(row.skuCode || '').trim()
    const extCode = String(row.externalCode || '').trim() || '__no_extcode__'
    if (skuCode) {
      const key = `${extCode}||${skuCode}`
      const list = groupSkuMap.get(key) || []
      list.push(row._rowIndex || 0)
      groupSkuMap.set(key, list)
    }
    if (extCode !== '__no_extcode__') {
      extCodeCount.set(extCode, (extCodeCount.get(extCode) || 0) + 1)
    }
  })

  // Determine which SKU keys are duplicated (appear in more than one row)
  const duplicatedSkuKeys = new Set<string>()
  groupSkuMap.forEach((indices, key) => {
    if (indices.length > 1) duplicatedSkuKeys.add(key)
  })

  return rows.map((row) => {
    const errors = validateRow(row, rows)

    const skuCode = String(row.skuCode || '').trim()
    const extCode = String(row.externalCode || '').trim() || '__no_extcode__'

    // Mark ALL rows with duplicate SKU as errors (not just the second+ occurrence)
    if (skuCode) {
      const key = `${extCode}||${skuCode}`
      if (duplicatedSkuKeys.has(key)) {
        const allIndices = groupSkuMap.get(key) || []
        const otherIdx = allIndices.find((idx) => idx !== (row._rowIndex || 0))
        errors.push({ field: 'skuCode', message: `同一出库单中SKU编码"${skuCode}"重复（与第${otherIdx}行）` })
      }
    }

    // External code duplicate flag (informational only, does not block submission)
    let duplicate = false
    let duplicateWith = ''
    if (extCode !== '__no_extcode__' && (extCodeCount.get(extCode) || 0) > 1) {
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
