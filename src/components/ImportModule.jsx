import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import {
  autoDetectTemplate,
  applyMapping,
  importToRows,
  getSavedMapping,
} from '../utils/templateMatcher'
import { FIELD_LABELS } from '../utils/validators'

function ImportModule({ onDataImported }) {
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [importStatus, setImportStatus] = useState('')
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 })
  const [detectedTemplate, setDetectedTemplate] = useState(null)

  const processFile = useCallback((file) => {
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls'].includes(ext)) {
      setImportStatus('错误：仅支持 .xlsx 或 .xls 格式的 Excel 文件')
      return
    }

    setFileName(file.name)
    setImportStatus('正在解析文件...')
    setProgress({ current: 0, total: 0, percent: 0 })
    setDetectedTemplate(null)

    const reader = new FileReader()

    reader.onerror = () => {
      setImportStatus('错误：文件读取失败，请检查文件是否损坏或编码异常')
    }

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result)
        const workbook = XLSX.read(data, { type: 'array' })

        const { headers, dataRows, sheetName, headerRowIndex } = importToRows(workbook)

        const totalRows = dataRows.length
        setProgress({ current: 0, total: totalRows, percent: 0 })

        const templateResult = autoDetectTemplate(headers)

        if (templateResult && templateResult.template) {
          let finalMapping = templateResult.mapping

          const saved = getSavedMapping()
          if (saved) {
            const savedHeaders = new Set(
              Object.keys(FIELD_LABELS).map((k) => {
                const idx = saved[k]
                if (idx !== undefined && idx >= 0 && idx < headers.length) {
                  return String(headers[idx]).trim().toLowerCase()
                }
                return null
              }).filter(Boolean)
            )

            const currentHeaders = new Set(
              Object.keys(FIELD_LABELS).map((k) => {
                const idx = templateResult.mapping[k]
                if (idx !== undefined && idx >= 0 && idx < headers.length) {
                  return String(headers[idx]).trim().toLowerCase()
                }
                return null
              }).filter(Boolean)
            )

            const overlap = [...savedHeaders].filter((h) => currentHeaders.has(h)).length
            if (overlap >= 5) {
              finalMapping = { ...saved }
            }
          }

          setDetectedTemplate(templateResult.template)
          setImportStatus(`正在处理 ${totalRows} 条数据...`)

          const mappedRows = []
          const batchSize = 200

          function processBatch(startIdx) {
            const endIdx = Math.min(startIdx + batchSize, dataRows.length)
            for (let i = startIdx; i < endIdx; i++) {
              mappedRows.push(applyMapping(dataRows[i], finalMapping))
            }
            const current = endIdx
            setProgress({
              current,
              total: totalRows,
              percent: Math.round((current / totalRows) * 100),
            })

            if (endIdx < dataRows.length) {
              setTimeout(() => processBatch(endIdx), 0)
            } else {
              const matchedCount = Object.values(finalMapping).filter((v) => v >= 0).length
              let statusMsg = `导入成功！共 ${totalRows} 条数据，自动识别为"${templateResult.template.name}"，匹配 ${matchedCount}/11 个字段`
              if (sheetName) {
                statusMsg += `（Sheet: "${sheetName}"`
                if (headerRowIndex > 0) statusMsg += `，表头位于第 ${headerRowIndex + 1} 行`
                statusMsg += `）`
              }
              setImportStatus(statusMsg)
              onDataImported(mappedRows)
            }
          }

          processBatch(0)
        } else {
          setImportStatus('错误：无法识别 Excel 文件的列名格式，请检查表头')
        }
      } catch (err) {
        setImportStatus(`错误：${err.message || '文件解析失败'}`)
      }
    }

    reader.readAsArrayBuffer(file)
  }, [onDataImported])

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) processFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  return (
    <div className="module-container">
      <h2 className="module-title">模块一：模板管理与文件导入</h2>

      <p className="hint-text" style={{ marginBottom: 16 }}>
        支持 .xlsx / .xls 格式，系统将自动识别列名并匹配字段（无需手动调整）
      </p>

      <label
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="drop-zone-content">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="12" y2="12" />
            <line x1="15" y1="15" x2="12" y2="12" />
          </svg>
          <p className="drop-zone-text">
            {fileName
              ? `已选择：${fileName}`
              : '拖拽 Excel 文件到此处，或点击选择文件'}
          </p>
          <p className="drop-zone-hint">文件格式：.xlsx / .xls</p>
        </div>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </label>

      {importStatus && (
        <div className={`status-message ${importStatus.startsWith('错误') ? 'status-error' : importStatus.startsWith('警告') ? 'status-warning' : 'status-success'}`}>
          {importStatus}
        </div>
      )}

      {progress.total > 0 && (
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <span className="progress-text">
            {progress.percent}% （{progress.current} / {progress.total} 条）
          </span>
        </div>
      )}

      {detectedTemplate && progress.percent >= 100 && (
        <div className="mapping-panel" style={{ marginTop: 16 }}>
          <h3>自动识别结果</h3>
          <p className="hint-text" style={{ marginBottom: 12 }}>
            已自动匹配模板：<strong>{detectedTemplate.name}</strong>
          </p>
          <div className="mapping-grid">
            <div className="mapping-grid-header">
              <span>业务字段</span>
              <span>识别状态</span>
            </div>
            {Object.entries(FIELD_LABELS).map(([key, label]) => (
              <div key={key} className="mapping-row">
                <span className="mapping-label">
                  {label}
                  {key !== 'externalCode' && key !== 'notes' && <span className="required-star">*</span>}
                </span>
                <span style={{ padding: '8px 12px', fontSize: 13, background: 'white' }}>
                  <span style={{ color: '#52c41a' }}>✓ 已识别</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ImportModule
