import { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { validateAll, TEMPERATURE_VALUES } from '../utils/validators'

const COLUMNS = [
  { key: 'externalCode', label: '外部编码', width: 120 },
  { key: 'senderName', label: '发件人姓名', width: 100 },
  { key: 'senderPhone', label: '发件人电话', width: 130 },
  { key: 'senderAddress', label: '发件人地址', width: 200 },
  { key: 'receiverName', label: '收件人姓名', width: 100 },
  { key: 'receiverPhone', label: '收件人电话', width: 130 },
  { key: 'receiverAddress', label: '收件人地址', width: 200 },
  { key: 'weight', label: '重量(kg)', width: 90 },
  { key: 'packageCount', label: '件数', width: 70 },
  { key: 'temperature', label: '温层', width: 80 },
  { key: 'notes', label: '备注', width: 150 },
]

const EMPTY_ROW = {
  externalCode: '',
  senderName: '',
  senderPhone: '',
  senderAddress: '',
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  weight: '',
  packageCount: '',
  temperature: '',
  notes: '',
}

function DataPreview({ data, onDataChange }) {
  const [rows, setRows] = useState(() => [...data])
  const [editCell, setEditCell] = useState(null)
  const [tooltip, setTooltip] = useState(null)

  const errors = useMemo(() => {
    return validateAll(rows, null)
  }, [rows])

  useEffect(() => {
    onDataChange?.(rows, errors)
  }, [rows, errors, onDataChange])

  const getFieldErrors = (rowIndex, field) => {
    return errors.filter((e) => e.row === rowIndex && e.field === field)
  }

  const handleCellClick = (rowIdx, fieldKey) => {
    setEditCell({ row: rowIdx, field: fieldKey })
  }

  const handleCellChange = (rowIdx, fieldKey, value) => {
    const newRows = [...rows]
    newRows[rowIdx] = { ...newRows[rowIdx], [fieldKey]: value }
    setRows(newRows)
  }

  const handleCellBlur = () => {
    setEditCell(null)
  }

  const handleCellKeyDown = (e, rowIdx, fieldKey) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const colIdx = COLUMNS.findIndex((c) => c.key === fieldKey)
      if (colIdx < COLUMNS.length - 1) {
        setEditCell({ row: rowIdx, field: COLUMNS[colIdx + 1].key })
      } else if (rowIdx < rows.length - 1) {
        setEditCell({ row: rowIdx + 1, field: COLUMNS[0].key })
      } else {
        setEditCell(null)
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const colIdx = COLUMNS.findIndex((c) => c.key === fieldKey)
      const nextCol = e.shiftKey ? colIdx - 1 : colIdx + 1
      if (nextCol >= 0 && nextCol < COLUMNS.length) {
        setEditCell({ row: rowIdx, field: COLUMNS[nextCol].key })
      } else if (!e.shiftKey && rowIdx < rows.length - 1) {
        setEditCell({ row: rowIdx + 1, field: COLUMNS[0].key })
      }
    } else if (e.key === 'Escape') {
      setEditCell(null)
    }
  }

  const handleDeleteRow = (rowIdx) => {
    const newRows = rows.filter((_, i) => i !== rowIdx)
    setRows(newRows)
    setEditCell(null)
  }

  const handleAddRow = () => {
    setRows([...rows, { ...EMPTY_ROW }])
  }

  const handleExport = () => {
    const exportData = rows.map((row) => {
      const obj = {}
      COLUMNS.forEach((col) => {
        obj[col.label] = row[col.key] ?? ''
      })
      return obj
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '运单数据')

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const file = new Blob([excelBuffer], { type: 'application/octet-stream' })
    saveAs(file, '运单数据_预览.xlsx')
  }

  const showTooltip = (e, rowIdx, fieldKey) => {
    const fieldErrors = getFieldErrors(rowIdx, fieldKey)
    if (fieldErrors.length > 0) {
      const rect = e.target.getBoundingClientRect()
      setTooltip({
        x: rect.left,
        y: rect.bottom + 4,
        messages: fieldErrors.map((err) => err.message),
      })
    }
  }

  const hideTooltip = () => {
    setTooltip(null)
  }

  if (rows.length === 0) {
    return (
      <div className="module-container">
        <h2 className="module-title">模块二：数据预览与编辑</h2>
        <div className="empty-state">
          <p>暂无数据，请先在模块一中导入 Excel 文件</p>
        </div>
      </div>
    )
  }

  const errorCount = errors.length
  const hasErrors = errorCount > 0

  return (
    <div className="module-container">
      <div className="module-header">
        <h2 className="module-title">模块二：数据预览与编辑</h2>
        <div className="module-actions">
          {hasErrors && (
            <span className="error-summary">
              ⚠ 共 {errorCount} 个错误，请修正后再提交
            </span>
          )}
          <button className="btn btn-secondary" onClick={handleExport}>
            导出为 Excel
          </button>
          <button className="btn btn-secondary" onClick={handleAddRow}>
            + 新增空行
          </button>
        </div>
      </div>

      {hasErrors && (
        <div className="error-list">
          <h4>全部错误列表（共 {errorCount} 条）：</h4>
          <ul>
            {errors.map((err, i) => (
              <li key={i}>
                第 {err.row} 行，{err.label}：{err.message.replace(`${err.label}：`, '')}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th className="row-num-col">#</th>
              {COLUMNS.map((col) => (
                <th key={col.key} style={{ minWidth: col.width, width: col.width }}>
                  {col.label}
                  {col.key !== 'externalCode' && col.key !== 'notes' && (
                    <span className="required-star">*</span>
                  )}
                </th>
              ))}
              <th className="action-col">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={getFieldErrors(rowIdx + 1, '__any__').length > 0 ? '' : ''}
              >
                <td className="row-num-col">{rowIdx + 1}</td>
                {COLUMNS.map((col) => {
                  const fieldErrors = getFieldErrors(rowIdx + 1, col.key)
                  const isError = fieldErrors.length > 0
                  const isEditing =
                    editCell &&
                    editCell.row === rowIdx &&
                    editCell.field === col.key

                  return (
                    <td
                      key={col.key}
                      className={`data-cell ${isError ? 'cell-error' : ''} ${isEditing ? 'cell-editing' : ''}`}
                      onClick={() => handleCellClick(rowIdx, col.key)}
                      onMouseEnter={(e) => isError && showTooltip(e, rowIdx, col.key)}
                      onMouseLeave={hideTooltip}
                    >
                      {isEditing ? (
                        col.key === 'temperature' ? (
                          <select
                            value={row[col.key] || ''}
                            onChange={(e) => handleCellChange(rowIdx, col.key, e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, col.key)}
                            autoFocus
                            className="cell-select"
                          >
                            <option value="">-- 选择 --</option>
                            {TEMPERATURE_VALUES.map((v) => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={row[col.key] || ''}
                            onChange={(e) => handleCellChange(rowIdx, col.key, e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, col.key)}
                            autoFocus
                            className="cell-input"
                          />
                        )
                      ) : (
                        <span className="cell-value">{row[col.key] || ''}</span>
                      )}
                    </td>
                  )
                })}
                <td className="action-col">
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteRow(rowIdx)}
                    title="删除此行"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tooltip && (
        <div
          className="error-tooltip"
          style={{ left: tooltip.x, top: tooltip.y, position: 'fixed' }}
        >
          {tooltip.messages.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>
      )}

      <div className="table-footer">
        <span>共 {rows.length} 条数据</span>
        {hasErrors && <span className="error-summary">，{errorCount} 个错误</span>}
      </div>
    </div>
  )
}

export default DataPreview
