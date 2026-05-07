import * as XLSX from 'xlsx'

const FIELD_KEYS = {
  externalCode: 'externalCode',
  senderName: 'senderName',
  senderPhone: 'senderPhone',
  senderAddress: 'senderAddress',
  receiverName: 'receiverName',
  receiverPhone: 'receiverPhone',
  receiverAddress: 'receiverAddress',
  weight: 'weight',
  packageCount: 'packageCount',
  temperature: 'temperature',
  notes: 'notes',
}

const TEMPLATES = [
  {
    name: '标准模板A',
    headers: {
      externalCode: ['外部编码', '外部订单号', '订单编号', '外部系统编号', '外部单号', '外部ID', '外部编号'],
      senderName: ['发件人姓名', '寄件人姓名', '发件人', '寄件人', '发货人姓名', '发送人', '发货人', '发件方'],
      senderPhone: ['发件人电话', '寄件人电话', '发件人联系方式', '寄件人联系方式', '发件人手机', '发件电话', '寄件电话', '发货人电话', '发货电话', '发件人联系电话'],
      senderAddress: ['发件人地址', '寄件人地址', '发件地址', '寄件地址', '发货地址', '发货人地址', '发件人详细地址'],
      receiverName: ['收件人姓名', '收货人姓名', '收件人', '收货人', '收件方', '接收人', '收货方'],
      receiverPhone: ['收件人电话', '收货人电话', '收件人联系方式', '收货人联系方式', '收件人手机', '收件电话', '收货电话', '收件人联系电话'],
      receiverAddress: ['收件人地址', '收货人地址', '收件地址', '收货地址', '收件人详细地址', '收货详细地址'],
      weight: ['重量(kg)', '重量', '重量（kg）', '重量kg', '货物重量', '重量(KG)', '重量(Kg)', '实际重量', '计费重量'],
      packageCount: ['件数', '包裹数量', '数量', '包裹数', '件', '包裹件数', '总件数'],
      temperature: ['温层', '温度要求', '温区', '温度', '温度层', '温度类型', '温层类型', '存储温度', '运输温度'],
      notes: ['备注', '备注说明', '附加说明', '说明', '附注', '备注信息', '补充说明'],
    },
  },
  {
    name: '电商模板B',
    headers: {
      externalCode: ['外部订单号', '外部编码', '订单编号', '外部单号', '外部ID', '客户单号', '外部订单号'],
      senderName: ['发货人', '发件人', '发件人姓名', '寄件人姓名', '寄件人', '发货人姓名', '发件方', '发货方'],
      senderPhone: ['发货电话', '发件人电话', '发件电话', '寄件人电话', '发件人联系方式', '发货人电话', '发货联系电话'],
      senderAddress: ['发货地址', '发件人地址', '发件地址', '寄件人地址', '发货人地址', '发货方地址'],
      receiverName: ['收货人', '收件人', '收件人姓名', '收货人姓名', '收件方', '收货方', '接收人'],
      receiverPhone: ['收货电话', '收件人电话', '收件电话', '收货人电话', '收件人联系方式', '收货联系电话'],
      receiverAddress: ['收货地址', '收件人地址', '收件地址', '收货人地址'],
      weight: ['重量(kg)', '重量', '重量（kg）', '货物重量', '重量(KG)', '实际重量', '包裹重量'],
      packageCount: ['数量', '件数', '包裹数量', '件', '包裹件数', '总件数', '包裹数'],
      temperature: ['温度要求', '温层', '温区', '温度类型', '温度', '温度层', '存储温度', '运输温度'],
      notes: ['附言', '备注', '备注说明', '附加说明', '说明', '附注', '补充说明', '备注信息'],
    },
  },
  {
    name: '英文模板C',
    headers: {
      externalCode: ['ExternalCode', 'OrderCode', 'OrderNo', 'ExternalID', 'external_code', 'RefNo', 'ReferenceNo', 'ExternalRef', 'Ref Code', 'RefCode'],
      senderName: ['SenderName', 'Sender', 'FromName', 'sender_name', 'From', 'ShipperName', 'Shipper'],
      senderPhone: ['SenderPhone', 'SenderTel', 'FromPhone', 'sender_phone', 'ShipperPhone', 'ShipperTel', 'SenderContact', 'Sender Tel'],
      senderAddress: ['SenderAddress', 'FromAddress', 'sender_address', 'ShipperAddress', 'SenderAddr', 'Sender Address'],
      receiverName: ['ReceiverName', 'Receiver', 'ToName', 'receiver_name', 'To', 'RecipientName', 'ConsigneeName', 'Consignee'],
      receiverPhone: ['ReceiverPhone', 'ReceiverTel', 'ToPhone', 'receiver_phone', 'RecipientPhone', 'ConsigneePhone', 'Receiver Tel'],
      receiverAddress: ['ReceiverAddress', 'ToAddress', 'receiver_address', 'RecipientAddress', 'ConsigneeAddress', 'Receiver Address'],
      weight: ['Weight(kg)', 'Weight', 'weight', 'WeightKg', 'ActualWeight', 'GrossWeight'],
      packageCount: ['Packages', 'PackageCount', 'Count', 'Quantity', 'Qty', 'Pieces', 'Pcs', 'TotalPcs'],
      temperature: ['Temperature', 'TempLayer', 'Temp', 'temperature', 'TempType', 'StorageTemp', 'Temp Zone', 'TempZone'],
      notes: ['Notes', 'Remarks', 'Comments', 'Note', 'Remark', 'Comment'],
    },
  },
  {
    name: '分组模板D',
    headers: {
      externalCode: ['外部编码', '订单编号', '外部系统编号', '外部单号', '外部ID'],
      senderName: ['发件人', '发件人姓名', '寄件人', '发件方', '发货人'],
      senderPhone: ['发件人电话', '发件电话', '寄件人电话', '发件人联系方式'],
      senderAddress: ['发件人地址', '发件地址', '寄件人地址'],
      receiverName: ['收件人', '收件人姓名', '收货人', '收件方'],
      receiverPhone: ['收件人电话', '收件电话', '收货人电话', '收件人联系方式'],
      receiverAddress: ['收件人地址', '收件地址', '收货人地址'],
      weight: ['重量(kg)', '重量', '重量（kg）', '货物重量', '重量(KG)', '重量(Kg)'],
      packageCount: ['件数', '包裹数量', '件', '数量', '总件数'],
      temperature: ['温层', '温度', '温度类型', '温度层', '温度要求', '温区'],
      notes: ['备注', '附注', '说明', '附加说明', '备注说明'],
    },
  },
]

const FIELD_KEYWORDS = {
  externalCode: {
    must: [['编码', '编号', '订单号', '单号', 'code', 'id', 'ref', 'order']],
    reject: [['姓名', '电话', '地址', 'name', 'phone', 'address', '重', '件', '备注', 'note', 'temp', '温']],
  },
  senderName: {
    must: [['发', '寄', 'send', 'from', 'shipper'], ['姓名', '人', 'name', '方']],
    reject: [['收', 'receive', 'to', 'consignee', '电话', 'phone', '地址', 'address', '编码', 'code']],
  },
  senderPhone: {
    must: [['发', '寄', 'send', 'from', 'shipper'], ['电话', '手机', '联系', 'phone', 'tel', 'contact']],
    reject: [['收', 'receive', 'to', 'consignee', '地址', 'address', '编码', 'code']],
  },
  senderAddress: {
    must: [['发', '寄', 'send', 'from', 'shipper'], ['地址', 'address', 'addr']],
    reject: [['收', 'receive', 'to', 'consignee']],
  },
  receiverName: {
    must: [['收', 'receive', 'to', 'recipient', 'consignee'], ['姓名', '人', 'name', '方']],
    reject: [['发', '寄', 'send', 'from', 'shipper', '电话', 'phone', '地址', 'address', '编码', 'code']],
  },
  receiverPhone: {
    must: [['收', 'receive', 'to', 'recipient', 'consignee'], ['电话', '手机', '联系', 'phone', 'tel', 'contact']],
    reject: [['发', '寄', 'send', 'from', 'shipper', '地址', 'address', '编码', 'code']],
  },
  receiverAddress: {
    must: [['收', 'receive', 'to', 'recipient', 'consignee'], ['地址', 'address', 'addr']],
    reject: [['发', '寄', 'send', 'from', 'shipper']],
  },
  weight: {
    must: [['重', 'weight', 'kg', '公斤', '千克']],
    reject: [],
  },
  packageCount: {
    must: [['件', '数量', '包裹', 'pack', 'count', 'qty', 'piece', 'pcs']],
    reject: [['重', 'weight', 'kg', '电话', 'phone', '地址', 'address', '姓名', 'name']],
  },
  temperature: {
    must: [['温', 'temp', '温度']],
    reject: [],
  },
  notes: {
    must: [['备注', '说明', '附注', 'note', 'remark', 'comment', 'memo']],
    reject: [],
  },
}

function normalize(str) {
  if (!str) return ''
  return String(str)
    .trim()
    .replace(/[\s_\-（）()【】{}[\]/,.\t\n\r:：]/g, '')
    .toLowerCase()
}

function containsAnyKeyword(normalizedText, keywords) {
  return keywords.some((kw) => normalizedText.includes(normalize(String(kw))))
}

function containsAllKeywordGroups(normalizedText, groups) {
  return groups.every((group) => containsAnyKeyword(normalizedText, group))
}

function fuzzyMatchField(normalizedHeader, fieldKey) {
  const rule = FIELD_KEYWORDS[fieldKey]
  if (!rule) return false
  const passesMust = containsAllKeywordGroups(normalizedHeader, rule.must)
  if (!passesMust) return false
  const passesReject = rule.reject.length === 0 || !containsAnyKeyword(normalizedHeader, rule.reject)
  return passesReject
}

function countFieldMatchesInRow(headers) {
  const normalized = headers.map((h) => normalize(String(h)))
  const matched = new Set()

  for (const key of Object.keys(FIELD_KEYWORDS)) {
    for (let i = 0; i < normalized.length; i++) {
      if (normalized[i] && fuzzyMatchField(normalized[i], key)) {
        matched.add(key)
        break
      }
    }
  }
  return matched.size
}

function isHeaderLike(text) {
  if (!text) return false
  const t = normalize(text)
  const keywords = [
    '姓名', '电话', '地址', '重量', '件数', '温层', '备注', '编码', '编号',
    'name', 'phone', 'address', 'weight', 'count', 'qty', 'temp', 'note', 'code',
    'sender', 'receiver', 'shipper', 'consignee', 'kg'
  ]
  return keywords.some((k) => t.includes(k))
}

function findHeaderRow(rawData) {
  let bestRow = 0
  let bestScore = 0

  for (let i = 0; i < Math.min(rawData.length, 8); i++) {
    const row = rawData[i] || []
    const nonEmpty = row.filter((c) => String(c ?? '').trim() !== '').length
    if (nonEmpty === 0) continue
    if (nonEmpty < 2) continue

    const headerLikeCount = row.filter((c) => isHeaderLike(String(c))).length
    if (headerLikeCount < 2) continue

    const fieldMatchCount = countFieldMatchesInRow(row)
    const score = headerLikeCount * 2 + fieldMatchCount * 3

    if (score > bestScore) {
      bestScore = score
      bestRow = i
    }
  }

  return bestRow
}

function autoDetectTemplate(headers) {
  const normalizedHeaders = headers.map((h) => normalize(String(h)))

  let bestMatch = null
  let bestScore = 0

  for (const template of TEMPLATES) {
    let score = 0
    const mapping = {}
    const usedColumns = new Set()

    for (const [fieldKey, aliases] of Object.entries(template.headers)) {
      let found = false

      for (const alias of aliases) {
        const normalizedAlias = normalize(alias)
        const idx = normalizedHeaders.findIndex(
          (h, i) => !usedColumns.has(i) && h === normalizedAlias
        )
        if (idx !== -1) {
          mapping[fieldKey] = idx
          usedColumns.add(idx)
          score += 2
          found = true
          break
        }
      }

      if (!found) {
        mapping[fieldKey] = -1
      }
    }

    for (const fieldKey of Object.keys(FIELD_KEYS)) {
      if (mapping[fieldKey] >= 0) continue

      for (let i = 0; i < normalizedHeaders.length; i++) {
        if (usedColumns.has(i)) continue
        if (fuzzyMatchField(normalizedHeaders[i], fieldKey)) {
          mapping[fieldKey] = i
          usedColumns.add(i)
          score += 1
          break
        }
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = { template, mapping, score }
    }
  }

  return bestMatch
}

const SKIP_SHEET_KEYWORDS = ['说明', 'instruction', 'sheet', 'readme', '指南', '示例', 'sample']

function findDataSheet(workbook) {
  if (workbook.SheetNames.length === 1) {
    return workbook.SheetNames[0]
  }

  for (let i = workbook.SheetNames.length - 1; i >= 0; i--) {
    const name = normalize(workbook.SheetNames[i])
    const shouldSkip = SKIP_SHEET_KEYWORDS.some((k) => name.includes(k))
    if (!shouldSkip) {
      return workbook.SheetNames[i]
    }
  }

  return workbook.SheetNames[0]
}

function getSavedMapping() {
  try {
    const saved = localStorage.getItem('template_mapping')
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function saveMapping(mapping) {
  try {
    localStorage.setItem('template_mapping', JSON.stringify(mapping))
  } catch {
    // localStorage may be full
  }
}

function applyMapping(rowArray, mapping) {
  const result = {}
  for (const [key, idx] of Object.entries(mapping)) {
    result[key] = idx >= 0 && idx < rowArray.length ? String(rowArray[idx] ?? '') : ''
  }
  return result
}

function importToRows(workbook) {
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Excel文件中没有找到Sheet')
  }

  const sheetName = findDataSheet(workbook)
  const sheet = workbook.Sheets[sheetName]
  if (!sheet || !sheet['!ref']) {
    throw new Error(`Sheet "${sheetName}" 为空`)
  }

  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  if (rawData.length < 2) {
    throw new Error('Excel文件至少需要包含表头和一行数据')
  }

  const headerRowIndex = findHeaderRow(rawData)

  const headers = rawData[headerRowIndex]
  const dataRows = rawData.slice(headerRowIndex + 1).filter((row) => {
    if (!row.some((cell) => String(cell ?? '').trim() !== '')) return false
    const nonEmpty = row.filter((c) => String(c ?? '').trim() !== '').length
    if (nonEmpty <= 1) return false
    return !row.every((c) => isHeaderLike(String(c)))
  })

  if (dataRows.length === 0) {
    throw new Error('Excel文件中没有有效数据行')
  }

  return { headers, dataRows, sheetName, headerRowIndex }
}

export {
  FIELD_KEYS,
  TEMPLATES,
  autoDetectTemplate,
  applyMapping,
  importToRows,
  saveMapping,
  getSavedMapping,
}
