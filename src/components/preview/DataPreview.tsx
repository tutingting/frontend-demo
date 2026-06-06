'use client'

import { useState, useCallback, useMemo } from 'react'
import { Download, Trash2, Plus, AlertCircle, Minus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { OrderRow } from '@/types'
import { validateAllRows } from '@/lib/validators/order-validator'
import { showToast } from '@/components/ui/Toast'

interface DataPreviewProps {
  rows: OrderRow[]
  onDataChange: (rows: OrderRow[]) => void
  onNavigateToSubmit: () => void
}

const PAGE_SIZE = 15
const FIELD_LABELS: Record<string, string> = {
  externalCode: '外部编码',
  storeName: '收货门店',
  receiverName: '收件人姓名',
  receiverPhone: '收件人电话',
  receiverAddress: '收件人地址',
  skuCode: 'SKU编码',
  skuName: 'SKU名称',
  skuQuantity: '数量',
  skuSpec: '规格型号',
  remark: '备注',
}

const REQUIRED_FIELDS = ['skuCode', 'skuName', 'skuQuantity']

export default function DataPreview({ rows, onDataChange, onNavigateToSubmit }: DataPreviewProps) {
  const [data, setData] = useState<OrderRow[]>(() => validateAllRows(rows))
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const fields = useMemo(() => {
    const fieldSet = new Set<string>()
    data.forEach((row) => {
      Object.entries(row).forEach(([key]) => {
        if (!key.startsWith('_')) fieldSet.add(key)
      })
    })
    return ['externalCode', 'storeName', 'receiverName', 'receiverPhone', 'receiverAddress',
      'skuCode', 'skuName', 'skuQuantity', 'skuSpec', 'remark'].filter((f) => fieldSet.has(f))
  }, [data])

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE))

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return data.slice(start, start + PAGE_SIZE)
  }, [data, currentPage])

  const totalErrors = data.reduce((sum, row) => sum + (row._errors?.length || 0), 0)
  const duplicateCount = data.filter((r) => r._duplicate).length

  const updateData = useCallback((newData: OrderRow[]) => {
    const validated = validateAllRows(newData)
    setData(validated)
    onDataChange(validated)
    // Adjust page if needed
    const newTotalPages = Math.max(1, Math.ceil(validated.length / PAGE_SIZE))
    if (currentPage > newTotalPages) setCurrentPage(newTotalPages)
  }, [onDataChange, currentPage])

  const handleCellEdit = (rowIndex: number, field: string, value: string) => {
    // rowIndex is global index
    const newData = data.map((row, idx) => {
      if (idx === rowIndex) {
        const updated = { ...row, [field]: value }
        if (field === 'skuQuantity') {
          updated.skuQuantity = value === '' ? 0 : Number(value)
        }
        return updated
      }
      return row
    })
    updateData(newData)
  }

  const startEdit = (rowIndex: number, field: string, currentValue: string | number) => {
    setEditingCell({ row: rowIndex, field })
    setEditValue(currentValue === null || currentValue === undefined ? '' : String(currentValue))
  }

  const commitEdit = () => {
    if (editingCell) {
      handleCellEdit(editingCell.row, editingCell.field, editValue)
      setEditingCell(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, globalRowIndex: number, fieldIdx: number) => {
    const getCellValue = (r: OrderRow, f: string): string => {
      const v = r[f as keyof OrderRow]
      return v === null || v === undefined ? '' : String(v)
    }
    if (e.key === 'Enter') {
      commitEdit()
      const nextField = fields[fieldIdx + 1]
      if (nextField && globalRowIndex < data.length - 1) {
        startEdit(globalRowIndex + 1, nextField, getCellValue(data[globalRowIndex + 1], nextField))
      } else if (nextField) {
        startEdit(globalRowIndex, nextField, getCellValue(data[globalRowIndex], nextField))
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      commitEdit()
      const nextField = e.shiftKey ? fields[fieldIdx - 1] : fields[fieldIdx + 1]
      if (nextField) {
        startEdit(globalRowIndex, nextField, getCellValue(data[globalRowIndex], nextField))
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null)
    }
  }

  const handleAddRow = () => {
    const newRow: OrderRow = {
      id: `new_${Date.now()}`,
      skuCode: '',
      skuName: '',
      skuQuantity: 0,
      _rowIndex: data.length + 1,
      _errors: [],
    }
    updateData([...data, newRow])
    // Jump to last page
    setCurrentPage(Math.max(1, Math.ceil((data.length + 1) / PAGE_SIZE)))
  }

  const handleDeleteRow = (globalRowIndex: number) => {
    const newData = data.filter((_, idx) => idx !== globalRowIndex).map((row, idx) => ({
      ...row,
      _rowIndex: idx + 1,
    }))
    updateData(newData)
    showToast('info', '行已删除')
  }

  const handleExport = () => {
    import('xlsx').then((XLSX) => {
      const exportData = data.map((row) => {
        const obj: Record<string, string | number> = {}
        fields.forEach((f) => {
          obj[FIELD_LABELS[f] || f] = row[f as keyof OrderRow] as string | number
        })
        return obj
      })
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '数据')
      XLSX.writeFile(wb, `导出数据_${new Date().toISOString().slice(0, 10)}.xlsx`)
      showToast('success', '导出成功')
    }).catch(() => showToast('error', '导出失败'))
  }

  const errorCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    data.forEach((row) => row._errors?.forEach((err) => {
      counts[err.field] = (counts[err.field] || 0) + 1
    }))
    return counts
  }, [data])

  const hasErrors = data.some((r) => (r._errors?.length || 0) > 0)

  const pageStart = (currentPage - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(currentPage * PAGE_SIZE, data.length)

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <h2 className="card-title">
              数据预览
              <span className="text-xs font-normal text-gray-400 ml-2">共 {data.length} 条</span>
            </h2>
            {totalErrors > 0 && (
              <span className="el-tag el-tag--danger text-xs">{totalErrors} 个错误</span>
            )}
            {duplicateCount > 0 && (
              <span className="el-tag el-tag--warning text-xs">{duplicateCount} 条重复</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm" onClick={handleAddRow}>
              <Plus size={14} />新增行
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleExport}>
              <Download size={14} />导出 Excel
            </button>
            <button
              className="btn btn-primary btn-sm"
              disabled={hasErrors || data.length === 0}
              onClick={onNavigateToSubmit}
            >
              提交下单 ({data.length} 条)
            </button>
          </div>
        </div>
      </div>

      {/* Error Summary */}
      {totalErrors > 0 && (
        <div className="el-alert el-alert--error">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">发现 {totalErrors} 个错误，请修正后再提交</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(errorCounts).map(([field, count]) => (
                <span key={field} className="text-xs opacity-80">
                  {FIELD_LABELS[field] || field}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <div style={{ minWidth: `${fields.length * 140 + 100}px` }}>
            {/* Fixed Header */}
            <div className="flex bg-[#f5f7fa] border-b border-[#ebeef5] sticky top-0 z-10">
              <div className="w-10 flex-shrink-0 px-2 py-3 text-xs font-medium text-gray-500 text-center">#</div>
              {fields.map((field) => (
                <div
                  key={field}
                  className="flex-1 min-w-[120px] px-4 py-3 text-xs font-medium text-gray-500 border-r border-[#ebeef5] last:border-r-0"
                >
                  {FIELD_LABELS[field] || field}
                  {REQUIRED_FIELDS.includes(field) && <span className="text-red-400 ml-0.5">*</span>}
                </div>
              ))}
              <div className="w-16 flex-shrink-0 px-2 py-3 text-xs font-medium text-white text-center sticky right-0 bg-[#0fc6c2] z-10">操作</div>
            </div>

            {/* Rows */}
            {paginatedData.map((row, localIdx) => {
              const globalIdx = (currentPage - 1) * PAGE_SIZE + localIdx
              return (
                <div
                  key={row.id || globalIdx}
                  className={`flex border-b border-[#ebeef5] ${
                    row._duplicate ? 'bg-yellow-50/50' : ''
                  } ${(row._errors?.length || 0) > 0 ? 'bg-red-50/30' : ''}`}
                >
                  <div className="w-10 flex-shrink-0 px-2 text-xs text-gray-400 flex items-center justify-center">
                    {row._rowIndex}
                  </div>
                  {fields.map((field, fieldIdx) => {
                    const value = row[field as keyof OrderRow]
                    const displayValue = value === null || value === undefined ? '' : String(value)
                    const isEditing = editingCell?.row === globalIdx && editingCell?.field === field
                    const fieldError = row._errors?.find((e) => e.field === field)
                    const isRequired = REQUIRED_FIELDS.includes(field)
                    const isQty = field === 'skuQuantity'
                    const numValue = isQty ? Number(displayValue) || 0 : 0

                    const handleQtyChange = (delta: number) => {
                      const newVal = Math.max(0, numValue + delta)
                      handleCellEdit(globalIdx, field, String(newVal))
                    }

                    return (
                      <div
                        key={field}
                        className={`flex-1 min-w-[120px] max-w-[200px] px-2 border-r border-[#ebeef5] last:border-r-0 relative overflow-hidden ${
                          fieldError || (isRequired && !displayValue) ? 'bg-red-50' : ''
                        }`}
                        style={{ height: 44 }}
                      >
                        {isEditing ? (
                          <div className="flex items-center h-full gap-0.5">
                            {isQty && (
                              <button
                                className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600 flex-shrink-0"
                                onClick={() => handleQtyChange(-1)}
                                tabIndex={-1}
                              >
                                <Minus size={10} />
                              </button>
                            )}
                            <input
                              autoFocus
                              className="flex-1 min-w-0 h-full px-1 border-2 border-[#0fc6c2] rounded text-xs outline-none bg-white"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={(e) => handleKeyDown(e, globalIdx, fieldIdx)}
                              type={isQty ? 'number' : 'text'}
                              min={isQty ? 0 : undefined}
                              step={isQty ? 1 : undefined}
                            />
                            {isQty && (
                              <button
                                className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600 flex-shrink-0"
                                onClick={() => handleQtyChange(1)}
                                tabIndex={-1}
                              >
                                <Plus size={10} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div
                            className="flex items-center h-full cursor-pointer hover:bg-gray-50 rounded px-1 truncate"
                            onClick={() => startEdit(globalIdx, field, displayValue)}
                          >
                            <span className="truncate text-xs text-gray-800" title={displayValue}>
                              {displayValue || <span className="text-gray-300">-</span>}
                            </span>
                            {isQty && displayValue && (
                              <div className="flex flex-col ml-auto flex-shrink-0">
                                <button
                                  className="w-4 h-3 flex items-center justify-center rounded-t hover:bg-gray-200 text-gray-400 hover:text-gray-600 leading-none"
                                  onClick={(e) => { e.stopPropagation(); handleQtyChange(1) }}
                                  title="增加"
                                >
                                  <ChevronUp size={10} />
                                </button>
                                <button
                                  className="w-4 h-3 flex items-center justify-center rounded-b hover:bg-gray-200 text-gray-400 hover:text-gray-600 leading-none"
                                  onClick={(e) => { e.stopPropagation(); handleQtyChange(-1) }}
                                  title="减少"
                                >
                                  <ChevronDown size={10} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {fieldError && (
                          <div className="absolute -bottom-0.5 left-1 right-1 text-[9px] text-red-500 leading-tight pointer-events-none truncate">
                            {fieldError.message}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div className="w-16 flex-shrink-0 flex items-center justify-center sticky right-0 z-10 bg-[#0fc6c2]">
                    <button
                      className="text-white/80 hover:text-white transition-colors"
                      onClick={() => handleDeleteRow(globalIdx)}
                      title="删除该行"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pagination - outside scrollable area, always fixed at bottom */}
        {data.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#ebeef5] bg-white">
            <span className="text-xs text-gray-500">
              显示第 {pageStart}-{pageEnd} 条，共 {data.length} 条
            </span>
            {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                className="w-7 h-7 flex items-center justify-center rounded text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
              </button>
              {(() => {
                const pages: (number | string)[] = []
                const startPage = Math.max(1, currentPage - 2)
                const endPage = Math.min(totalPages, currentPage + 2)
                if (startPage > 1) { pages.push(1); if (startPage > 2) pages.push('...') }
                for (let i = startPage; i <= endPage; i++) pages.push(i)
                if (endPage < totalPages) { if (endPage < totalPages - 1) pages.push('...'); pages.push(totalPages) }
                return pages.map((p, i) =>
                  typeof p === 'string' ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">...</span>
                  ) : (
                    <button
                      key={p}
                      className={`w-7 h-7 flex items-center justify-center rounded text-xs ${
                        p === currentPage
                          ? 'bg-[#0fc6c2] text-white font-medium'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  )
                )
              })()}
              <button
                className="w-7 h-7 flex items-center justify-center rounded text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={14} />
              </button>
            </div>
            )}
          </div>
        )}

        {data.length === 0 && (
          <div className="el-empty">
            <div className="el-empty__icon">
              <AlertCircle size={40} />
            </div>
            <p className="el-empty__title">暂无数据</p>
            <p className="el-empty__description">请先导入文件</p>
          </div>
        )}
      </div>
    </div>
  )
}
