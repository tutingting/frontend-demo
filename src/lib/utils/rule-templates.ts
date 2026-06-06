import type { ParseRule } from '@/types'
import { generateId } from './helpers'

// Empty rule template for manual creation
export function createEmptyRule(): ParseRule {
  return {
    id: generateId(),
    name: '',
    description: '',
    fileType: 'excel',
    transforms: [],
    fieldMappings: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// Pre-built template for 欢乐牧场 inventory export format
export function happyFarmTemplateRule(): ParseRule {
  return {
    id: generateId(),
    name: '欢乐牧场库存模板',
    description: '适用于欢乐牧场库存查询导出格式：一个外部商品编码对应多个SKU，数量来自门店分配列',
    fileType: 'excel',
    transforms: [
      { type: 'header_row', params: { row: 1 } },
      { type: 'column_sum', params: { targetField: 'skuQuantity', sourceColumns: ['银泰', '金银湖', '金桥', '门店B', '门店D'] } },
    ],
    fieldMappings: [
      { targetField: 'skuCode', sourceColumn: 'SKU条码', isRequired: true, aiConfidence: 1 },
      { targetField: 'skuName', sourceColumn: 'SKU名称', isRequired: true, aiConfidence: 1 },
      { targetField: 'externalCode', sourceColumn: '外部商品编码', aiConfidence: 1 },
      { targetField: 'storeName', sourceColumn: '货主名称', aiConfidence: 0.8 },
      { targetField: 'skuSpec', sourceColumn: '规格', aiConfidence: 1 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// Pre-built template for standard Excel files with header row
export function standardExcelRule(): ParseRule {
  return {
    id: generateId(),
    name: '标准Excel模板',
    description: '适用于标准表格结构的Excel文件，第一行为表头',
    fileType: 'excel',
    transforms: [
      { type: 'header_row', params: { row: 1 } },
    ],
    fieldMappings: [
      { targetField: 'externalCode', sourceColumn: '外部编码', aiConfidence: 0.5 },
      { targetField: 'externalCode', sourceColumn: '订单编号', aiConfidence: 0.5 },
      { targetField: 'externalCode', sourceColumn: '出库单号', aiConfidence: 0.5 },
      { targetField: 'externalCode', sourceColumn: '配送单号', aiConfidence: 0.5 },
      { targetField: 'externalCode', sourceColumn: '运单号', aiConfidence: 0.5 },
      { targetField: 'storeName', sourceColumn: '收货门店', aiConfidence: 0.5 },
      { targetField: 'storeName', sourceColumn: '门店名称', aiConfidence: 0.5 },
      { targetField: 'storeName', sourceColumn: '调入门店', aiConfidence: 0.5 },
      { targetField: 'storeName', sourceColumn: '收货机构', aiConfidence: 0.5 },
      { targetField: 'receiverName', sourceColumn: '收件人姓名', aiConfidence: 0.5 },
      { targetField: 'receiverName', sourceColumn: '收货人', aiConfidence: 0.5 },
      { targetField: 'receiverName', sourceColumn: '联系人', aiConfidence: 0.5 },
      { targetField: 'receiverPhone', sourceColumn: '收件人电话', aiConfidence: 0.5 },
      { targetField: 'receiverPhone', sourceColumn: '联系电话', aiConfidence: 0.5 },
      { targetField: 'receiverPhone', sourceColumn: '手机号码', aiConfidence: 0.5 },
      { targetField: 'receiverPhone', sourceColumn: '电话', aiConfidence: 0.5 },
      { targetField: 'receiverAddress', sourceColumn: '收件人地址', aiConfidence: 0.5 },
      { targetField: 'receiverAddress', sourceColumn: '收货地址', aiConfidence: 0.5 },
      { targetField: 'receiverAddress', sourceColumn: '地址', aiConfidence: 0.5 },
      { targetField: 'skuCode', sourceColumn: 'SKU编码', isRequired: true, aiConfidence: 0.5 },
      { targetField: 'skuCode', sourceColumn: '物料编码', isRequired: true, aiConfidence: 0.5 },
      { targetField: 'skuCode', sourceColumn: '商品编码', isRequired: true, aiConfidence: 0.5 },
      { targetField: 'skuCode', sourceColumn: '产品编码', isRequired: true, aiConfidence: 0.5 },
      { targetField: 'skuName', sourceColumn: 'SKU名称', isRequired: true, aiConfidence: 0.5 },
      { targetField: 'skuName', sourceColumn: '物料名称', isRequired: true, aiConfidence: 0.5 },
      { targetField: 'skuName', sourceColumn: '商品名称', isRequired: true, aiConfidence: 0.5 },
      { targetField: 'skuName', sourceColumn: '产品名称', isRequired: true, aiConfidence: 0.5 },
      { targetField: 'skuQuantity', sourceColumn: '发货数量', isRequired: true, aiConfidence: 0.5 },
      { targetField: 'skuQuantity', sourceColumn: '配送数量', isRequired: true, aiConfidence: 0.5 },
      { targetField: 'skuQuantity', sourceColumn: '数量', isRequired: true, aiConfidence: 0.5 },
      { targetField: 'skuQuantity', sourceColumn: '出库数量', isRequired: true, aiConfidence: 0.5 },
      { targetField: 'skuSpec', sourceColumn: '规格型号', aiConfidence: 0.5 },
      { targetField: 'skuSpec', sourceColumn: '规格', aiConfidence: 0.5 },
      { targetField: 'remark', sourceColumn: '备注', aiConfidence: 0.5 },
      { targetField: 'remark', sourceColumn: '摘要', aiConfidence: 0.5 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// Pre-built template for 配送发货单 format (黎明屯 style)
// Structure:
//   Rows 1-3: title headers
//   Row 4:    table header (物料编码 | 物料名称 | ...)
//   Rows 5-6: SKU data
//   Row 7:    合计 (summary, to discard)
//   Row 8:    外部编码:xxx \t 收货门店:xxx
//   Row 9:    收件人电话:xxx \t 收件人地址:xxx
//
// cell_extract extracts values from raw cells by (row, col) position
export function deliveryOrderRule(): ParseRule {
  return {
    id: generateId(),
    name: '配送发货单模板',
    description: '适用于配送发货单格式：第4行为表头第5-6行SKU明细，第8-9行提取收件人/门店/外部编码信息',
    fileType: 'excel',
    transforms: [
      // Step 1: Extract values from specific cells in raw data (1-based row/col)
      { type: 'cell_extract', params: {
        extractions: [
          // Row 8: "外部编码:PS2512220005001" in col 1, "收货门店:xxx" in col 2
          { row: 8, col: 1, targetField: 'externalCode', extract: '外部编码[：:\\s]*([^\\t]+)' },
          { row: 8, col: 2, targetField: 'storeName', extract: '收货门店[：:\\s]*([^\\t]+)' },
          // Row 9: "收件人电话:xxx" in col 1, "收件人地址:xxx" in col 2
          { row: 9, col: 1, targetField: 'receiverPhone', extract: '收件人电话[：:\\s]*([^\\t]+)' },
          { row: 9, col: 2, targetField: 'receiverAddress', extract: '收件人地址[：:\\s]*([^\\t]+)' },
          // Also try to extract receiverName if available on row 8 col 3+ or separate
        ]
      }},
      // Step 2: Only keep up to row 6 (discard 合计 + key-value rows)
      { type: 'per_sheet_max_rows', params: { count: 6 } },
      // Step 3: Skip title header rows
      { type: 'skip_rows', params: { count: 3 } },
      // Step 4: Use row 1 (which is row 4 in original) as column headers
      { type: 'header_row', params: { row: 1 } },
    ],
    fieldMappings: [
      // From cell_extract (keys injected into every row)
      { targetField: 'externalCode', sourceColumn: 'externalCode', aiConfidence: 1 },
      { targetField: 'storeName', sourceColumn: 'storeName', aiConfidence: 1 },
      { targetField: 'receiverName', sourceColumn: 'receiverName', aiConfidence: 1 },
      { targetField: 'receiverPhone', sourceColumn: 'receiverPhone', aiConfidence: 1 },
      { targetField: 'receiverAddress', sourceColumn: 'receiverAddress', aiConfidence: 1 },
      // From table header (row 4)
      { targetField: 'skuCode', sourceColumn: '物料编码', isRequired: true, aiConfidence: 1 },
      { targetField: 'skuCode', sourceColumn: '商品编码', isRequired: true, aiConfidence: 1 },
      { targetField: 'skuCode', sourceColumn: 'SKU编码', isRequired: true, aiConfidence: 1 },
      { targetField: 'skuName', sourceColumn: '物料名称', isRequired: true, aiConfidence: 1 },
      { targetField: 'skuName', sourceColumn: '商品名称', isRequired: true, aiConfidence: 1 },
      { targetField: 'skuName', sourceColumn: 'SKU名称', isRequired: true, aiConfidence: 1 },
      { targetField: 'skuQuantity', sourceColumn: '发货数量', isRequired: true, aiConfidence: 1 },
      { targetField: 'skuQuantity', sourceColumn: '配送数量', isRequired: true, aiConfidence: 1 },
      { targetField: 'skuQuantity', sourceColumn: '数量', isRequired: true, aiConfidence: 1 },
      { targetField: 'skuSpec', sourceColumn: '规格型号', aiConfidence: 1 },
      { targetField: 'skuSpec', sourceColumn: '规格', aiConfidence: 1 },
      { targetField: 'remark', sourceColumn: '备注', aiConfidence: 1 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
