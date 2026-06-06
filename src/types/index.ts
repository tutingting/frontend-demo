// ===== 订单数据结构 =====
export interface OrderRow {
  id: string
  externalCode?: string           // 外部编码
  storeName?: string              // 收货门店 (A组)
  receiverName?: string           // 收件人姓名 (B组)
  receiverPhone?: string          // 收件人电话 (B组)
  receiverAddress?: string        // 收件人地址 (B组)
  skuCode: string                 // SKU编码
  skuName: string                 // SKU名称
  skuQuantity: number             // 发货数量
  skuSpec?: string                // 规格型号
  remark?: string                 // 备注
  // 内部字段
  _rowIndex: number               // 原始行号
  _errors?: FieldError[]          // 校验错误
  _duplicate?: boolean            // 重复标记
  _duplicateWith?: string         // 与哪条重复
}

export interface FieldError {
  field: string
  message: string
}

// ===== 解析规则 =====
export type FileType = 'excel' | 'word' | 'pdf'

export type TransformType =
  | 'skip_rows'           // 跳过头部N行
  | 'header_row'          // 指定表头行号
  | 'footer_extract'      // 尾部信息提取
  | 'cell_extract'        // 定位单元格取值 (params: {extractions: [{row, col, targetField, extract?}]})
  | 'max_rows'            // 只保留前N行 (params: {count: number})
  | 'per_sheet_max_rows'  // 每Sheet只保留前N行 (params: {count: number})
  | 'group_concat'        // 跨行聚合
  | 'matrix_transpose'    // 矩阵转置
  | 'multi_sheet_merge'   // 多Sheet合并
  | 'card_split'          // 卡片式拆分
  | 'text_parse'          // 纯文本解析
  | 'cell_split'          // 复合单元格拆分
  | 'column_sum'          // 多列求和 (params: {targetField: string, sourceColumns: string[]})
  | 'default_value'       // 默认值
  | 'static_value'        // 静态值
  | 'column_mapping'      // 列映射

export interface TransformStep {
  type: TransformType
  params: Record<string, unknown>
}

export interface FieldMapping {
  targetField: string       // 目标字段名 (如 skuCode)
  sourceColumn?: string     // 源列名/列号
  defaultValue?: string     // 默认值
  isRequired?: boolean
  fromFooter?: boolean      // 是否来自尾部信息区
  footerKey?: string        // 尾部信息区的key
  aiConfidence?: number     // AI推测置信度 0-1
}

export interface GroupConcatConfig {
  groupByField: string      // 按什么字段聚合 (如 externalCode)
  sharedFields: string[]    // 共享字段列表
}

export interface MatrixTransposeConfig {
  rowFields: string[]       // 作为行的字段
  columnHeaderRow: number   // 列头所在行
  valueField: string        // 值字段名
  transposeTo: string[]     // 转置后的字段映射
}

export interface ParseRule {
  id: string
  name: string
  description?: string
  fileType: FileType
  transforms: TransformStep[]
  fieldMappings: FieldMapping[]
  groupConcat?: GroupConcatConfig
  matrixTranspose?: MatrixTransposeConfig
  multiSheet?: {
    sameStructure: boolean
    sheetNames?: string[]
  }
  cardConfig?: {
    startPattern: string     // 卡片起始标记正则
    headerLines?: number
  }
  textConfig?: {
    recordSeparator?: string // 记录分隔符
    linePattern?: string     // 行提取正则
  }
  createdAt: string
  updatedAt: string
  aiGenerated?: boolean
}

// ===== 导入会话 =====
export interface ImportSession {
  id: string
  ruleId: string
  ruleName: string
  fileName: string
  fileType: FileType
  status: 'parsing' | 'parsed' | 'submitted' | 'failed'
  totalRows: number
  successRows: number
  failedRows: number
  createdAt: string
  updatedAt: string
}

// ===== 出库单聚合（同一外部编码聚合为一个出库单） =====
export interface OrderItem {
  skuCode: string
  skuName: string
  skuQuantity: number
  skuSpec?: string
  remark?: string
}

export interface OrderGroup {
  externalCode: string
  storeName?: string
  receiverName?: string
  receiverPhone?: string
  receiverAddress?: string
  items: OrderItem[]
  rowIndexes: number[]           // 原始行号列表
  createdAt: string
}

// ===== 运单记录（数据库持久化） =====
export interface WaybillRecord {
  id: string
  sessionId: string
  externalCode?: string
  storeName?: string
  receiverName?: string
  receiverPhone?: string
  receiverAddress?: string
  skuCode: string
  skuName: string
  skuQuantity: number
  skuSpec?: string
  remark?: string
  createdAt: string
}

// ===== 分页 =====
export interface PaginationParams {
  page: number
  pageSize: number
  search?: string
  searchField?: string
  startDate?: string
  endDate?: string
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ===== AI 规则生成 =====
export interface AiRuleSuggestion {
  ruleName: string
  description: string
  fileType: FileType
  transforms: TransformStep[]
  fieldMappings: FieldMapping[]
  confidence: number
  notes: string[]
}
