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
  // Build SKU code frequency map for uniqueness check
  const skuCodeCount = new Map<string, number>()
  for (const row of rows) {
    const code = String(row.skuCode || '').trim()
    if (code) {
      skuCodeCount.set(code, (skuCodeCount.get(code) || 0) + 1)
    }
  }

  return rows.map((row, _idx) => {
    const errors = validateRow(row, rows)

    // Check for duplicate SKU codes (must be unique across all records)
    const skuCode = String(row.skuCode || '').trim()
    if (skuCode && (skuCodeCount.get(skuCode) || 0) > 1) {
      errors.push({ field: 'skuCode', message: `SKU编码"${skuCode}"已存在，SKU编码需唯一` })
    }

    // Check for duplicate external codes in batch
    let duplicate = false
    let duplicateWith = ''
    const extCode = String(row.externalCode || '').trim()
    if (extCode) {
      const sameCode = rows.filter(
        (r) => String(r.externalCode || '') === extCode && r._rowIndex !== row._rowIndex
      )
      if (sameCode.length > 0) {
        duplicate = true
        duplicateWith = `第${sameCode[0]._rowIndex}行`
      }
    }

    return {
      ...row,
      _errors: errors,
      _duplicate: duplicate,
      _duplicateWith: duplicateWith,
    }
  })
}
