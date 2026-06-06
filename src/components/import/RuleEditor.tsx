'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import type { ParseRule, FieldMapping, TransformStep, TransformType, FileType } from '@/types'
import { generateId } from '@/lib/utils/helpers'
import { showToast } from '@/components/ui/Toast'

const TRANSFORM_LABELS: Record<TransformType, string> = {
  skip_rows: '跳过头部行',
  header_row: '指定表头行',
  footer_extract: '尾部信息提取',
  cell_extract: '定位单元格取值',
  max_rows: '截取前N行',
  per_sheet_max_rows: '每Sheet截取前N行',
  group_concat: '跨行聚合',
  matrix_transpose: '矩阵转置',
  multi_sheet_merge: '多Sheet合并',
  card_split: '卡片式拆分',
  text_parse: '纯文本解析',
  cell_split: '复合单元格拆分',
  column_sum: '多列求和',
  default_value: '默认值',
  static_value: '静态值',
  column_mapping: '列映射',
}

const TARGET_FIELDS = [
  { value: 'externalCode', label: '外部编码', required: false },
  { value: 'storeName', label: '收货门店 (A组)', required: false },
  { value: 'receiverName', label: '收件人姓名 (B组)', required: false },
  { value: 'receiverPhone', label: '收件人电话 (B组)', required: false },
  { value: 'receiverAddress', label: '收件人地址 (B组)', required: false },
  { value: 'skuCode', label: 'SKU编码', required: true },
  { value: 'skuName', label: 'SKU名称', required: true },
  { value: 'skuQuantity', label: '发货数量', required: true },
  { value: 'skuSpec', label: '规格型号', required: false },
  { value: 'remark', label: '备注', required: false },
]

interface RuleEditorProps {
  initialRule: ParseRule | null
  filePreview?: string
  onSave: (rule: ParseRule) => void
  onCancel: () => void
}

export default function RuleEditor({ initialRule, filePreview, onSave, onCancel }: RuleEditorProps) {
  const [rule, setRule] = useState<ParseRule>(
    initialRule || {
      id: generateId(),
      name: '',
      description: '',
      fileType: 'excel',
      transforms: [],
      fieldMappings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  )

  const [showTransforms, setShowTransforms] = useState(true)
  const [showMappings, setShowMappings] = useState(true)

  // Set file preview
  useEffect(() => {
    if (filePreview && rule.fileType === 'excel') {
      // Could auto-detect from preview
    }
  }, [filePreview, rule.fileType])

  const updateField = (field: keyof ParseRule, value: unknown) => {
    setRule((prev) => ({ ...prev, [field]: value, updatedAt: new Date().toISOString() }))
  }

  const addTransform = () => {
    const newTransform: TransformStep = {
      type: 'header_row',
      params: { row: 1 },
    }
    updateField('transforms', [...rule.transforms, newTransform])
  }

  const updateTransform = (index: number, transform: TransformStep) => {
    const newTransforms = [...rule.transforms]
    newTransforms[index] = transform
    updateField('transforms', newTransforms)
  }

  const removeTransform = (index: number) => {
    updateField('transforms', rule.transforms.filter((_, i) => i !== index))
  }

  const moveTransform = (index: number, direction: 'up' | 'down') => {
    const newTransforms = [...rule.transforms]
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= newTransforms.length) return
    ;[newTransforms[index], newTransforms[target]] = [newTransforms[target], newTransforms[index]]
    updateField('transforms', newTransforms)
  }

  const addMapping = () => {
    const newMapping: FieldMapping = {
      targetField: '',
      sourceColumn: '',
      isRequired: false,
      aiConfidence: 0,
    }
    updateField('fieldMappings', [...rule.fieldMappings, newMapping])
  }

  const updateMapping = (index: number, mapping: FieldMapping) => {
    const newMappings = [...rule.fieldMappings]
    newMappings[index] = mapping
    updateField('fieldMappings', newMappings)
  }

  const removeMapping = (index: number) => {
    updateField('fieldMappings', rule.fieldMappings.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    if (!rule.name.trim()) {
      showToast('error', '请输入规则名称')
      return
    }
    if (rule.fieldMappings.length === 0) {
      showToast('warning', '至少需要添加一个字段映射')
    }
    onSave(rule)
  }

  const renderTransformParams = (transform: TransformStep, index: number) => {
    switch (transform.type) {
      case 'skip_rows':
        return (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">跳过行数:</label>
            <input
              type="number"
              min={1}
              className="input-field w-20"
              value={(transform.params.count as number) || 1}
              onChange={(e) => updateTransform(index, { ...transform, params: { count: parseInt(e.target.value) || 1 } })}
            />
          </div>
        )
      case 'header_row':
        return (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">表头行号:</label>
            <input
              type="number"
              min={1}
              className="input-field w-20"
              value={(transform.params.row as number) || 1}
              onChange={(e) => updateTransform(index, { ...transform, params: { row: parseInt(e.target.value) || 1 } })}
            />
          </div>
        )
      case 'default_value':
      case 'static_value':
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-gray-500">字段:</label>
            <select
              className="select-field w-36"
              value={(transform.params.field as string) || ''}
              onChange={(e) => updateTransform(index, { ...transform, params: { ...transform.params, field: e.target.value } })}
            >
              <option value="">选择字段</option>
              {TARGET_FIELDS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <label className="text-xs text-gray-500">值:</label>
            <input
              className="input-field w-40"
              value={(transform.params.value as string) || ''}
              onChange={(e) => updateTransform(index, { ...transform, params: { ...transform.params, value: e.target.value } })}
            />
          </div>
        )
      case 'cell_split':
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-gray-500">列名:</label>
            <input
              className="input-field w-32"
              value={(transform.params.column as string) || ''}
              onChange={(e) => updateTransform(index, { ...transform, params: { ...transform.params, column: e.target.value } })}
            />
            <label className="text-xs text-gray-500">分隔符:</label>
            <input
              className="input-field w-24"
              value={(transform.params.separator as string) || '\\n'}
              onChange={(e) => updateTransform(index, { ...transform, params: { ...transform.params, separator: e.target.value } })}
            />
          </div>
        )
      case 'group_concat':
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-gray-500">聚合字段:</label>
            <input
              className="input-field w-32"
              value={(transform.params.groupBy as string) || ''}
              onChange={(e) => updateTransform(index, { ...transform, params: { ...transform.params, groupBy: e.target.value } })}
            />
            <label className="text-xs text-gray-500">共享字段(逗号分隔):</label>
            <input
              className="input-field w-48"
              value={(transform.params.sharedFields as string) || ''}
              onChange={(e) => updateTransform(index, { ...transform, params: { ...transform.params, sharedFields: e.target.value } })}
            />
          </div>
        )
      case 'max_rows':
        return (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">只保留前</label>
            <input
              type="number" min={1}
              className="input-field w-20"
              value={(transform.params.count as number) || 1}
              onChange={(e) => updateTransform(index, { ...transform, params: { count: parseInt(e.target.value) || 1 } })}
            />
            <label className="text-xs text-gray-500">行数据</label>
          </div>
        )
      case 'per_sheet_max_rows':
        return (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">每Sheet只保留前</label>
            <input
              type="number" min={1}
              className="input-field w-20"
              value={(transform.params.count as number) || 1}
              onChange={(e) => updateTransform(index, { ...transform, params: { count: parseInt(e.target.value) || 1 } })}
            />
            <label className="text-xs text-gray-500">行数据</label>
          </div>
        )
      case 'footer_extract':
        return (
          <div className="text-xs text-gray-400">
            尾部信息提取配置（使用正则表达式）
          </div>
        )
      case 'cell_extract':
        return (
          <div className="text-xs text-gray-400">
            <p className="mb-2">从原始文件的指定行列取值（行、列均从 1 开始计数）</p>
            <div className="space-y-2">
              {(transform.params.extractions as any[] || []).map((ex: any, ei: number) => (
                <div key={ei} className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-gray-500 w-4">{ei + 1}.</span>
                  <input className="input-field w-14 text-xs" placeholder="行" type="number" min={1}
                    value={ex.row || ''}
                    onChange={(e) => {
                      const list = [...((transform.params.extractions as any[]) || [])]
                      list[ei] = { ...list[ei], row: parseInt(e.target.value) || 0 }
                      updateTransform(index, { ...transform, params: { ...transform.params, extractions: list } })
                    }} />
                  <span className="text-xs text-gray-400">列</span>
                  <input className="input-field w-14 text-xs" placeholder="列" type="number" min={1}
                    value={ex.col || ''}
                    onChange={(e) => {
                      const list = [...((transform.params.extractions as any[]) || [])]
                      list[ei] = { ...list[ei], col: parseInt(e.target.value) || 0 }
                      updateTransform(index, { ...transform, params: { ...transform.params, extractions: list } })
                    }} />
                  <span className="text-xs text-gray-400">Sheet</span>
                  <input className="input-field w-14 text-xs" placeholder="1" type="number" min={1}
                    value={ex.sheetIndex || ''}
                    onChange={(e) => {
                      const list = [...((transform.params.extractions as any[]) || [])]
                      list[ei] = { ...list[ei], sheetIndex: parseInt(e.target.value) || 1 }
                      updateTransform(index, { ...transform, params: { ...transform.params, extractions: list } })
                    }} />
                  <span className="text-xs text-gray-400">→</span>
                  <select className="select-field text-xs w-28"
                    value={ex.targetField || ''}
                    onChange={(e) => {
                      const list = [...((transform.params.extractions as any[]) || [])]
                      list[ei] = { ...list[ei], targetField: e.target.value }
                      updateTransform(index, { ...transform, params: { ...transform.params, extractions: list } })
                    }}>
                    <option value="">目标字段</option>
                    {TARGET_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <input className="input-field w-24 text-xs" placeholder="提取正则(可选)"
                    value={ex.extract || ''}
                    onChange={(e) => {
                      const list = [...((transform.params.extractions as any[]) || [])]
                      list[ei] = { ...list[ei], extract: e.target.value }
                      updateTransform(index, { ...transform, params: { ...transform.params, extractions: list } })
                    }} />
                  <button onClick={() => {
                    const list = [...((transform.params.extractions as any[]) || [])]
                    list.splice(ei, 1)
                    updateTransform(index, { ...transform, params: { ...transform.params, extractions: list } })
                  }} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <button className="btn-ghost text-xs" onClick={() => {
                const list = [...((transform.params.extractions as any[]) || []), { row: 1, col: 1, targetField: '', extract: '' }]
                updateTransform(index, { ...transform, params: { ...transform.params, extractions: list } })
              }}>
                + 添加定位
              </button>
            </div>
          </div>
        )
      default:
        return (
          <div className="text-xs text-gray-400">
            该步骤无需额外配置参数
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">规则名称 *</label>
          <input
            className="input-field"
            placeholder="输入规则名称"
            value={rule.name}
            onChange={(e) => updateField('name', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">文件类型</label>
          <select
            className="select-field"
            value={rule.fileType}
            onChange={(e) => updateField('fileType', e.target.value as FileType)}
          >
            <option value="excel">Excel</option>
            <option value="word">Word</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
        <input
          className="input-field"
          placeholder="规则描述（可选）"
          value={rule.description || ''}
          onChange={(e) => updateField('description', e.target.value)}
        />
      </div>

      {/* Transforms */}
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          onClick={() => setShowTransforms(!showTransforms)}
        >
          <span className="text-sm font-semibold text-gray-700">解析步骤 ({rule.transforms.length})</span>
          {showTransforms ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showTransforms && (
          <div className="p-4 space-y-3">
            {rule.transforms.map((transform, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex flex-col items-center gap-1 mt-1">
                  <button onClick={() => moveTransform(idx, 'up')} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">
                    <ChevronUp size={14} />
                  </button>
                  <span className="text-[10px] font-mono text-gray-400">{idx + 1}</span>
                  <button onClick={() => moveTransform(idx, 'down')} disabled={idx === rule.transforms.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">
                    <ChevronDown size={14} />
                  </button>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      className="select-field w-48"
                      value={transform.type}
                      onChange={(e) => updateTransform(idx, { type: e.target.value as TransformType, params: {} })}
                    >
                      {Object.entries(TRANSFORM_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <button onClick={() => removeTransform(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {renderTransformParams(transform, idx)}
                </div>
              </div>
            ))}
            <button className="btn-ghost text-xs w-full justify-center" onClick={addTransform}>
              <Plus size={14} className="mr-1" /> 添加步骤
            </button>
          </div>
        )}
      </div>

      {/* Field Mappings */}
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          onClick={() => setShowMappings(!showMappings)}
        >
          <span className="text-sm font-semibold text-gray-700">字段映射 ({rule.fieldMappings.length})</span>
          {showMappings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showMappings && (
          <div className="p-4 space-y-3">
            {rule.fieldMappings.map((mapping, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 mb-1 block">目标字段</label>
                    <select
                      className="select-field text-xs"
                      value={mapping.targetField}
                      onChange={(e) => updateMapping(idx, { ...mapping, targetField: e.target.value })}
                    >
                      <option value="">选择字段</option>
                      {TARGET_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}{f.required ? ' *' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 mb-1 block">源列名/列标题</label>
                    <input
                      className="input-field text-xs"
                      placeholder="列名或列号"
                      value={mapping.sourceColumn || ''}
                      onChange={(e) => updateMapping(idx, { ...mapping, sourceColumn: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 mb-1 block">默认值</label>
                    <input
                      className="input-field text-xs"
                      placeholder="（可选）"
                      value={mapping.defaultValue || ''}
                      onChange={(e) => updateMapping(idx, { ...mapping, defaultValue: e.target.value })}
                    />
                  </div>
                </div>
                {mapping.aiConfidence !== undefined && mapping.aiConfidence > 0 && (
                  <span className={`tag text-[10px] ${mapping.aiConfidence > 0.7 ? 'tag-success' : 'tag-warning'}`}>
                    {Math.round(mapping.aiConfidence * 100)}%
                  </span>
                )}
                <button onClick={() => removeMapping(idx)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button className="btn-ghost text-xs w-full justify-center" onClick={addMapping}>
              <Plus size={14} className="mr-1" /> 添加字段映射
            </button>
          </div>
        )}
      </div>

      {/* AI Notes */}
      {initialRule?.aiGenerated && initialRule.description && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-yellow-800">AI 生成说明</p>
            <p className="text-xs text-yellow-700 mt-1">{initialRule.description}</p>
          </div>
        </div>
      )}

      {/* Preview */}
      {filePreview && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">文件预览</label>
          <pre className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 max-h-40 overflow-y-auto custom-scrollbar font-mono">
            {filePreview}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button className="btn-secondary" onClick={onCancel}>取消</button>
        <button className="btn-primary" onClick={handleSave}>保存规则</button>
      </div>
    </div>
  )
}
