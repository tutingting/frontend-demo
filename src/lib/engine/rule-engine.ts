import type { ParseRule, OrderRow, FieldMapping, TransformStep, FieldError } from '@/types'

export interface EngineResult {
  rows: OrderRow[]
  errors: string[]
}

export function executeRule(rule: ParseRule, rawData: string[][], sheetName?: string, sheetRowCounts?: number[]): EngineResult {
  let rows: Record<string, string>[] = rawData.map((row) => {
    const obj: Record<string, string> = {}
    row.forEach((cell, idx) => {
      obj[`col_${idx}`] = cell
      obj[`col_${String.fromCharCode(65 + idx)}`] = cell
    })
    return obj
  })

  const errors: string[] = []

  // Handle multi_sheet_merge flag first (set during import)
  // Apply transforms sequentially
  for (const step of rule.transforms) {
    const result = applyTransform(step, rows, rawData, sheetRowCounts)
    rows = result.data
    if (result.error) errors.push(result.error)
  }

  // Apply field mappings
  const orderRows = rows.map((row, idx) => mapFields(row, idx, rule.fieldMappings))

  // Handle group concat
  let finalRows: Record<string, unknown>[] = orderRows
  if (rule.groupConcat) {
    finalRows = applyGroupConcat(orderRows, rule.groupConcat.groupByField, rule.groupConcat.sharedFields)
  }

  // Handle matrix transpose
  if (rule.matrixTranspose) {
    finalRows = applyMatrixTranspose(finalRows as Record<string, string>[], rawData, rule.matrixTranspose as unknown as Record<string, unknown>)
  }

  // Add row indices and type coercion
  const resultRows: OrderRow[] = finalRows.map((row, idx) => ({
    ...row,
    id: `row_${idx}_${Date.now()}`,
    skuCode: String(row.skuCode || ''),
    skuName: String(row.skuName || ''),
    skuQuantity: Number(row.skuQuantity) || 0,
    storeName: row.storeName == null ? undefined : String(row.storeName),
    receiverName: row.receiverName == null ? undefined : String(row.receiverName),
    receiverPhone: row.receiverPhone == null ? undefined : String(row.receiverPhone),
    receiverAddress: row.receiverAddress == null ? undefined : String(row.receiverAddress),
    externalCode: row.externalCode == null ? undefined : String(row.externalCode),
    skuSpec: row.skuSpec == null ? undefined : String(row.skuSpec),
    remark: row.remark == null ? undefined : String(row.remark),
    _rowIndex: idx + 1,
    _errors: [] as FieldError[],
  })) as unknown as OrderRow[]

  return { rows: resultRows, errors }
}

function applyTransform(step: TransformStep, data: Record<string, string>[], rawData: string[][], sheetRowCounts?: number[]): {
  data: Record<string, string>[]
  error?: string
} {
  switch (step.type) {
    case 'skip_rows': {
      const count = (step.params.count as number) || 1
      return { data: data.slice(count) }
    }

    case 'header_row': {
      const rowNum = ((step.params.row as number) || 1) - 1
      if (rowNum < 0 || rowNum >= data.length) return { data }
      const headers = data[rowNum]
      const mappedData = data.slice(rowNum + 1).map((row) => {
        const named: Record<string, string> = {}
        Object.entries(headers).forEach(([key, header]) => {
          const headerStr = String(header).trim()
          if (headerStr) {
            named[headerStr] = row[key] || ''
            named[key] = row[key] || ''
          } else {
            named[key] = row[key] || ''
          }
        })
        return named
      })
      return { data: mappedData }
    }

    case 'column_mapping': {
      const mappings = step.params.mappings as { source: string; target: string; confidence?: number }[]
      if (!mappings) return { data }
      return {
        data: data.map((row) => {
          const newRow = { ...row }
          mappings.forEach((m) => {
            if (row[m.source] !== undefined) {
              newRow[m.target] = row[m.source]
            }
          })
          return newRow
        }),
      }
    }

    case 'default_value': {
      const field = step.params.field as string
      const value = step.params.value as string
      return {
        data: data.map((row) => ({
          ...row,
          [field]: row[field] || value,
        })),
      }
    }

    case 'static_value': {
      const field = step.params.field as string
      const value = step.params.value as string
      return {
        data: data.map((row) => ({
          ...row,
          [field]: value,
        })),
      }
    }

    case 'cell_split': {
      const column = step.params.column as string
      const separator = (step.params.separator as string) || '\\n'
      const newData: Record<string, string>[] = []
      data.forEach((row) => {
        const cellValue = row[column]
        const sepChar = separator.replace('\\n', '\n').replace('\\t', '\t')
        if (cellValue && cellValue.includes(sepChar)) {
          const parts = cellValue.split(sepChar).filter((p) => p.trim())
          parts.forEach((part) => {
            newData.push({ ...row, [column]: part.trim() })
          })
        } else {
          newData.push(row)
        }
      })
      return { data: newData }
    }

    case 'column_sum': {
      const targetField = step.params.targetField as string
      const sourceColumns = step.params.sourceColumns as string[]
      if (!targetField || !sourceColumns || sourceColumns.length === 0) return { data }
      // Build a fuzzy key map: try exact match, then prefix match (first 2+ chars)
      const rowKeys = data.length > 0 ? Object.keys(data[0]) : []
      const resolveCol = (col: string): string | undefined => {
        if (rowKeys.includes(col)) return col
        // Try partial match: find key that shares 2+ consecutive chars
        for (let len = col.length - 1; len >= 2; len--) {
          const prefix = col.slice(0, len)
          const found = rowKeys.find((k) => k.includes(prefix))
          if (found) return found
        }
        return undefined
      }
      return {
        data: data.map((row) => {
          const sum = sourceColumns.reduce((acc, col) => {
            const resolved = resolveCol(col)
            if (!resolved) return acc
            const val = row[resolved]
            return acc + (val ? (Number(val) || 0) : 0)
          }, 0)
          return { ...row, [targetField]: String(sum) }
        }),
      }
    }

    case 'footer_extract': {
      const patterns = step.params.patterns as { key: string; regex: string }[]
      if (!patterns) return { data }
      const removeRows = (step.params.removeRows as number) || 0
      const extracted: Record<string, string> = {}
      // Use rawData (before transforms) to preserve original cell layout for regex matching
      const fullText = rawData.map((r) => r.join(' ').trim()).filter(Boolean).join('\n')

      patterns.forEach((p) => {
        try {
          const match = fullText.match(new RegExp(p.regex, 'm'))
          if (match) extracted[p.key] = match[1]?.trim() || match[0]?.trim() || ''
        } catch {
          // Invalid regex
        }
      })

      let result = data.map((row) => ({ ...row, ...extracted }))
      // Remove footer rows after extraction (to discard 合计/key-value rows)
      if (removeRows > 0) {
        result = result.slice(0, -removeRows)
      }
      return { data: result }
    }

    case 'cell_extract': {
      const extractions = step.params.extractions as { row: number; col: number; targetField: string; extract?: string; sheetIndex?: number }[] || []
      const keepDataRows = (step.params.keepDataRows as number) || 0
      if (extractions.length === 0) return { data }

      // Pre-compute sheet row ranges
      const sheetRanges: { start: number; end: number }[] = []
      if (sheetRowCounts) {
        let offset = 0
        sheetRowCounts.forEach((count) => {
          sheetRanges.push({ start: offset, end: offset + count })
          offset += count
        })
      }

      // Build per-row injection values: each row gets values from its sheet's extractions
      // Each directive: { fields: Record<string,string>, startRow, endRow }
      const directives: { fields: Record<string, string>; startRow: number; endRow: number }[] = []

      extractions.forEach((cfg) => {
        let targetRows: { start: number; end: number }[]

        if (cfg.sheetIndex && cfg.sheetIndex >= 1 && sheetRanges.length > 0) {
          // Targeted at a specific sheet: only inject into that sheet's rows
          const sr = sheetRanges[cfg.sheetIndex - 1]
          if (!sr) return
          targetRows = [sr]
        } else {
          // No sheetIndex or single-sheet mode: inject into ALL rows
          targetRows = [{ start: 0, end: data.length }]
        }

        // Compute rawData row index for this extraction
        let rowOffset = 0
        if (cfg.sheetIndex && cfg.sheetIndex > 1 && sheetRowCounts) {
          for (let si = 0; si < cfg.sheetIndex - 1 && si < sheetRowCounts.length; si++) {
            rowOffset += sheetRowCounts[si]
          }
        }
        const rowIdx = (cfg.row - 1) + rowOffset
        const colIdx = cfg.col - 1
        if (rowIdx < 0 || rowIdx >= rawData.length) return
        const rowData = rawData[rowIdx]
        if (colIdx < 0 || colIdx >= rowData.length) return

        let value = rowData[colIdx]
        if (cfg.extract) {
          try {
            const m = value.match(new RegExp(cfg.extract))
            if (m) value = m[1]?.trim() || m[0]?.trim() || value
          } catch {}
        }
        if (!value) return

        targetRows.forEach((tr) => {
          let dir = directives.find((d) => d.startRow === tr.start && d.endRow === tr.end)
          if (!dir) {
            dir = { fields: {}, startRow: tr.start, endRow: tr.end }
            directives.push(dir)
          }
          dir.fields[cfg.targetField] = value
        })
      })

      // Apply directives row by row
      let result = data.map((row, idx) => {
        const dir = directives.find((d) => idx >= d.startRow && idx < d.endRow)
        if (dir) return { ...row, ...dir.fields }
        return row
      })
      if (keepDataRows > 0) result = result.slice(0, keepDataRows)
      return { data: result }
    }

    case 'max_rows': {
      const max = (step.params.count as number) || 0
      if (max <= 0) return { data }
      return { data: data.slice(0, max) }
    }

    case 'per_sheet_max_rows': {
      const max = (step.params.count as number) || 0
      if (max <= 0 || !sheetRowCounts || sheetRowCounts.length === 0) return { data }
      const result: Record<string, string>[] = []
      let offset = 0
      sheetRowCounts.forEach((sheetRowCount) => {
        const take = Math.min(max, sheetRowCount)
        for (let i = 0; i < take && offset + i < data.length; i++) {
          result.push(data[offset + i])
        }
        offset += sheetRowCount
      })
      return { data: result }
    }

    case 'text_parse': {
      const recordSep = (step.params.recordSeparator as string) || '━━━'
      const linePatterns = step.params.linePatterns as Record<string, string> || {}
      const fullText = data.map((r) => Object.values(r).join(' ')).join('\n')
      const records = fullText.split(recordSep).filter((r) => r.trim())
      const parsed: Record<string, string>[] = []

      records.forEach((record) => {
        const row: Record<string, string> = {}
        // Extract fields using line patterns
        const lines = record.split('\n').filter((l) => l.trim())
        lines.forEach((line) => {
          Object.entries(linePatterns).forEach(([field, pattern]) => {
            try {
              const match = line.match(new RegExp(pattern))
              if (match && !row[field]) row[field] = match[1]?.trim() || match[0]?.trim() || ''
            } catch {
              // Invalid regex
            }
          })
        })
        // Extract item lines (numbered items)
        const itemLines = lines.filter((l) => /^\d+\./.test(l.trim()))
        itemLines.forEach((itemLine) => {
          const itemRow = { ...row }
          // Try to parse: 编号. 编码 | 名称 | 规格 | 数量
          const itemMatch = itemLine.match(/^\d+\.\s*(\S+)\s*\|\s*(\S+)\s*(?:\|\s*(\S+))?\s*(?:\|\s*(\d+))?/)
          if (itemMatch) {
            itemRow.skuCode = itemMatch[1] || ''
            itemRow.skuName = itemMatch[2] || ''
            itemRow.skuSpec = itemMatch[3] || ''
            itemRow.skuQuantity = itemMatch[4] || ''
          }
          parsed.push(itemRow)
        })
        if (itemLines.length === 0 && Object.keys(row).length > 0) {
          parsed.push(row)
        }
      })

      return { data: parsed.length > 0 ? parsed : data }
    }

    case 'card_split': {
      const startPattern = (step.params.startPattern as string) || '▶'
      const fullText = data.map((r) => Object.values(r).join('\t')).join('\n')
      const lines = fullText.split('\n').filter((l) => l.trim())
      const cards: Record<string, string>[] = []
      let currentCard: Record<string, string> | null = null
      let inTable = false
      let tableHeaders: string[] = []

      lines.forEach((line) => {
        const trimmed = line.trim()
        // Detect card start
        if (trimmed.match(new RegExp(startPattern))) {
          // Save previous card
          if (currentCard && Object.keys(currentCard).length > 1) cards.push(currentCard)
          currentCard = { _cardTitle: trimmed }
          inTable = false
          tableHeaders = []
          return
        }

        if (!currentCard) {
          currentCard = { _cardTitle: '卡片' }
        }

        // Detect table header inside card
        if (trimmed.match(/SKU|编码|名称|数量|规格/)) {
          inTable = true
          tableHeaders = trimmed.split('\t').map((h) => h.trim()).filter(Boolean)
          return
        }

        // Extract key-value pairs (e.g. "收货人: 张三", "电话: 138...")
        // Also handle tab-separated KV pairs: "调入门店\t银泰店\t联系人\t王经理"
        const kvMatch = trimmed.match(/^(.+?)[:：]\s*(.+)/)
        if (kvMatch && !inTable) {
          const key = kvMatch[1].trim()
          const val = kvMatch[2].trim()
          if (key.includes('门店') || key.includes('店铺')) currentCard.storeName = val
          else if (key.includes('收货人') || key.includes('收件人') || key.includes('联系人')) currentCard.receiverName = val
          else if (key.includes('电话') || key.includes('手机') || key.includes('联系方式')) currentCard.receiverPhone = val
          else if (key.includes('地址')) currentCard.receiverAddress = val
          else currentCard[`_${key}`] = val
          return
        }

        // Handle tab-separated KV pairs: "调入门店\t银泰店\t联系人\t王经理"
        if (!inTable && trimmed.includes('\t')) {
          const cells = trimmed.split('\t').map((c) => c.trim()).filter(Boolean)
          // Only treat as KV row if first cell looks like a key (contains Chinese and known pattern)
          const firstCell = cells[0] || ''
          const hasKnownKey = firstCell.includes('门店') || firstCell.includes('收货人') || 
                              firstCell.includes('收件人') || firstCell.includes('电话') ||
                              firstCell.includes('地址') || firstCell.includes('店铺') ||
                              firstCell.includes('联系人') || firstCell.includes('手机')
          if (hasKnownKey) {
            for (let ci = 0; ci < cells.length - 1; ci += 2) {
              const key = cells[ci]
              const val = cells[ci + 1]
              if (key.includes('门店') || key.includes('店铺')) currentCard.storeName = val
              else if (key.includes('收货人') || key.includes('收件人') || key.includes('联系人')) currentCard.receiverName = val
              else if (key.includes('电话') || key.includes('手机')) currentCard.receiverPhone = val
              else if (key.includes('地址')) currentCard.receiverAddress = val
            }
            return
          }
        }

        // Table row inside card
        if (inTable && trimmed && !trimmed.startsWith('▶')) {
          const cells = trimmed.split('\t').map((c) => c.trim()).filter(Boolean)
          if (cells.length >= 2) {
            if (tableHeaders.length > 0) {
              const row: Record<string, string> = { ...currentCard }
              tableHeaders.forEach((header, idx) => {
                const cellVal = cells[idx] || ''
                if (header.includes('编码') || header.includes('SKU') || header.includes('代码')) row.skuCode = cellVal
                else if (header.includes('名称') || header.includes('品名')) row.skuName = cellVal
                else if (header.includes('数量') || header.includes('件数')) row.skuQuantity = cellVal
                else if (header.includes('规格') || header.includes('型号')) row.skuSpec = cellVal
                else if (header.includes('备注')) row.remark = cellVal
                else row[`col${idx}`] = cellVal
              })
              cards.push(row)
            } else {
              currentCard[`item_${Object.keys(currentCard).length}`] = trimmed
            }
          }
        }
      })

      // Save last card
      if (currentCard) {
        // If card has no item rows extracted, push it as a record
        const hasItems = cards.some((c) => Object.keys(c).length > 2)
        if (!hasItems) cards.push(currentCard)
      }

      return { data: cards.length > 0 ? cards : data }
    }

    case 'multi_sheet_merge': {
      // Handled at a higher level (ImportModule)
      return { data }
    }

    case 'matrix_transpose': {
      // Handled at a higher level
      return { data }
    }

    case 'group_concat': {
      // Handled at a higher level
      return { data }
    }

    default:
      return { data, error: `Unknown transform type: ${step.type}` }
  }
}

function mapFields(row: Record<string, string>, _rowIdx: number, mappings: FieldMapping[]): Record<string, string> {
  const result: Record<string, string> = {}

  Object.entries(row).forEach(([key, value]) => {
    result[key] = value
  })

  // Helper: fuzzy match column name
  // Uses keyword-based matching for Chinese column names
  const findColKey = (sourceCol: string): string | undefined => {
    if (row[sourceCol] !== undefined) return sourceCol
    // Try case-insensitive
    const lower = sourceCol.toLowerCase()
    const exact = Object.keys(row).find((k) => k.toLowerCase() === lower)
    if (exact) return exact
    // Try stripping trailing special chars (*, #, etc.) from sourceCol
    const stripped = sourceCol.replace(/[*#!@$%^&]+$/, '').trim()
    if (stripped !== sourceCol) {
      if (row[stripped] !== undefined) return stripped
      const found = Object.keys(row).find((k) => k.toLowerCase() === stripped.toLowerCase())
      if (found) return found
    }
    // Try prefix match (skipping last char)
    for (let len = sourceCol.length - 1; len >= 2; len--) {
      const prefix = sourceCol.slice(0, len)
      const found = Object.keys(row).find((k) => k.includes(prefix))
      if (found) return found
    }
    // Keyword-based matching for common field name patterns
    // Break sourceCol into meaningful keywords and check if any match
    const keywords = sourceCol
      .replace(/[：:（）()\s]/g, '')
      .split(/[\/\\|,，、]/)
      .filter(Boolean)
    for (const keyword of keywords) {
      if (keyword.length < 2) continue
      const found = Object.keys(row).find((k) => k.includes(keyword))
      if (found) return found
    }
    return undefined
  }

  mappings.forEach((mapping) => {
    if (mapping.sourceColumn) {
      const key = findColKey(mapping.sourceColumn)
      let value = key ? row[key] : undefined
      if (value !== undefined && value !== '') {
        result[mapping.targetField] = value
      } else if (mapping.defaultValue) {
        result[mapping.targetField] = mapping.defaultValue
      }
    } else if (mapping.defaultValue) {
      result[mapping.targetField] = mapping.defaultValue
    }
  })

  return result
}

function applyGroupConcat(
  rows: Record<string, string>[],
  groupByField: string,
  sharedFields: string[]
): Record<string, string>[] {
  const groups: Map<string, Record<string, string>[]> = new Map()

  rows.forEach((row) => {
    const key = row[groupByField] || '__nogroup__'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  })

  const result: Record<string, string>[] = []
  groups.forEach((groupRows) => {
    const base = { ...groupRows[0] }
    groupRows.forEach((row) => {
      sharedFields.forEach((field) => {
        if (row[field]) base[field] = row[field]
      })
    })

    groupRows.forEach((row, idx) => {
      if (idx === 0) {
        result.push({ ...base, ...row })
      } else {
        result.push({ ...row, ...Object.fromEntries(sharedFields.map((f) => [f, base[f] || row[f]])) })
      }
    })
  })

  return result
}

function applyMatrixTranspose(
  rows: Record<string, string>[],
  rawData: string[][],
  config: Record<string, unknown>
): Record<string, string>[] {
  // Matrix transpose: columns (stores/dates) become individual records
  // Expected config: { rowIdentifierCol: string, columnStartIdx: number, valueFieldMappings: {headerKey: string, field: string}[] }
  
  const rowIdentifierCol = (config.rowIdentifierCol as string) || 'col_0'
  const columnStartIdx = (config.columnStartIdx as number) || 1
  const valueFieldMappings = config.valueFieldMappings as { headerKey: string; field: string }[] || []

  if (rows.length === 0) return rows

  // Get column headers from first row or from the data structure
  // Column headers are the keys of the first row
  const allKeys = Object.keys(rows[0])
  const idKey = allKeys.find((k) => 
    k.toLowerCase().includes(rowIdentifierCol.toLowerCase()) || 
    k === rowIdentifierCol
  ) || allKeys[0]

  // Find column keys that look like store names or dates (start with col_ or are non-standard)
  const transposableKeys = allKeys.filter((k) => {
    if (k === idKey || k.startsWith('_')) return false
    // Skip keys that are clearly field names
    if (['skuCode', 'skuName', 'skuQuantity', 'skuSpec', 'remark', 'externalCode',
        'storeName', 'receiverName', 'receiverPhone', 'receiverAddress',
        '备注', 'SKU编码', 'SKU名称', '数量', '规格型号', '外部编码',
        '收货门店', '收件人姓名', '收件人电话', '收件人地址'].includes(k)) return false
    return true
  })

  if (transposableKeys.length === 0) return rows

  // Transpose: for each row, create a record for each column value
  const result: Record<string, string>[] = []
  
  rows.forEach((row) => {
    transposableKeys.forEach((columnKey) => {
      const cellValue = row[columnKey]
      if (!cellValue || cellValue === '0' || cellValue === '-') return

      const newRow: Record<string, string> = {
        ...row,
        storeName: columnKey, // The column header becomes the store name
      }

      // Apply value field mappings
      if (valueFieldMappings.length > 0) {
        valueFieldMappings.forEach((mapping) => {
          if (columnKey.includes(mapping.headerKey)) {
            newRow[mapping.field] = cellValue
          }
        })
      } else {
        // Default: map to skuQuantity
        newRow.skuQuantity = cellValue
      }

      // Remove transposed column keys
      transposableKeys.forEach((k) => { delete newRow[k] })

      result.push(newRow)
    })
  })

  return result.length > 0 ? result : rows
}
