const PHONE_REGEX = /^1[3-9]\d{9}$/
const TEMPERATURE_VALUES = ['常温', '冷藏', '冷冻']

const FIELD_LABELS = {
  senderName: '发件人姓名',
  senderPhone: '发件人电话',
  senderAddress: '发件人地址',
  receiverName: '收件人姓名',
  receiverPhone: '收件人电话',
  receiverAddress: '收件人地址',
  weight: '重量(kg)',
  packageCount: '件数',
  temperature: '温层',
  externalCode: '外部编码',
  notes: '备注',
}

const REQUIRED_FIELDS = [
  'senderName',
  'senderPhone',
  'senderAddress',
  'receiverName',
  'receiverPhone',
  'receiverAddress',
  'weight',
  'packageCount',
  'temperature',
]

function validateRow(row, rowIndex) {
  const errors = []

  for (const field of REQUIRED_FIELDS) {
    const value = row[field]
    if (!value || String(value).trim() === '') {
      errors.push({
        row: rowIndex,
        field,
        label: FIELD_LABELS[field],
        message: `${FIELD_LABELS[field]}：不能为空`,
      })
    }
  }

  if (row.senderPhone && !PHONE_REGEX.test(String(row.senderPhone).trim())) {
    errors.push({
      row: rowIndex,
      field: 'senderPhone',
      label: FIELD_LABELS.senderPhone,
      message: '发件人电话：格式错误（应为11位手机号）',
    })
  }

  if (row.receiverPhone && !PHONE_REGEX.test(String(row.receiverPhone).trim())) {
    errors.push({
      row: rowIndex,
      field: 'receiverPhone',
      label: FIELD_LABELS.receiverPhone,
      message: '收件人电话：格式错误（应为11位手机号）',
    })
  }

  const weight = parseFloat(row.weight)
  if (row.weight && (isNaN(weight) || weight <= 0)) {
    errors.push({
      row: rowIndex,
      field: 'weight',
      label: FIELD_LABELS.weight,
      message: '重量(kg)：必须为正数',
    })
  }

  const count = parseInt(row.packageCount, 10)
  if (row.packageCount && (isNaN(count) || count <= 0 || String(count) !== String(row.packageCount).trim())) {
    errors.push({
      row: rowIndex,
      field: 'packageCount',
      label: FIELD_LABELS.packageCount,
      message: '件数：必须为正整数',
    })
  }

  if (row.temperature && !TEMPERATURE_VALUES.includes(String(row.temperature).trim())) {
    errors.push({
      row: rowIndex,
      field: 'temperature',
      label: FIELD_LABELS.temperature,
      message: `温层：值不在范围内（可选：${TEMPERATURE_VALUES.join(' / ')}）`,
    })
  }

  return errors
}

function validateAll(rows, existingExternalCodes) {
  const allErrors = []
  const externalCodeMap = new Map()

  for (let i = 0; i < rows.length; i++) {
    const rowIndex = i + 1
    const row = rows[i]

    const rowErrors = validateRow(row, rowIndex, rows, existingExternalCodes)
    allErrors.push(...rowErrors)

    const code = row.externalCode?.trim()
    if (code) {
      if (existingExternalCodes && existingExternalCodes.has(code)) {
        allErrors.push({
          row: rowIndex,
          field: 'externalCode',
          label: FIELD_LABELS.externalCode,
          message: `外部编码 "${code}"：与数据库中已有数据重复`,
        })
      }

      if (externalCodeMap.has(code)) {
        const dupRow = externalCodeMap.get(code)
        if (!allErrors.some((e) => e.row === rowIndex && e.field === 'externalCode' && e.message.includes('同批次'))) {
          allErrors.push({
            row: rowIndex,
            field: 'externalCode',
            label: FIELD_LABELS.externalCode,
            message: `外部编码 "${code}"：与第 ${dupRow} 行重复`,
          })
        }
      } else {
        externalCodeMap.set(code, rowIndex)
      }
    }
  }

  return allErrors
}

export { FIELD_LABELS, REQUIRED_FIELDS, TEMPERATURE_VALUES, PHONE_REGEX, validateRow, validateAll }
