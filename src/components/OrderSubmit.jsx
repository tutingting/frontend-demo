import { useState } from 'react'
import { supabase } from '../supabase'

function OrderSubmit({ rows, errors, onSubmitted }) {
  const [submitting, setSubmitting] = useState(false)
  const [submitProgress, setSubmitProgress] = useState({ current: 0, total: 0, percent: 0 })
  const [result, setResult] = useState(null)

  const hasErrors = errors.length > 0

  const handleSubmit = async () => {
    if (hasErrors) {
      alert(`存在 ${errors.length} 个校验错误，请先在预览页面修正后再提交。`)
      return
    }

    if (rows.length === 0) {
      alert('没有可提交的数据')
      return
    }

    setSubmitting(true)
    setResult(null)
    setSubmitProgress({ current: 0, total: rows.length, percent: 0 })

    const batchId = `BATCH_${Date.now()}`
    let successCount = 0
    let failCount = 0
    const failures = []
    const batchSize = 50

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map((row) => ({
        external_code: row.externalCode?.trim() || null,
        sender_name: row.senderName?.trim() || '',
        sender_phone: row.senderPhone?.trim() || '',
        sender_address: row.senderAddress?.trim() || '',
        receiver_name: row.receiverName?.trim() || '',
        receiver_phone: row.receiverPhone?.trim() || '',
        receiver_address: row.receiverAddress?.trim() || '',
        weight_kg: parseFloat(row.weight) || 0,
        package_count: parseInt(row.packageCount, 10) || 0,
        temperature: row.temperature?.trim() || '',
        notes: row.notes?.trim() || null,
        batch_id: batchId,
      }))

      try {
        const { error } = await supabase.from('shipping_orders').insert(batch)

        if (error) {
          batch.forEach((item, idx) => {
            failCount++
            failures.push({
              row: i + idx + 1,
              message: error.message,
            })
          })
        } else {
          successCount += batch.length
        }
      } catch (err) {
        batch.forEach((item, idx) => {
          failCount++
          failures.push({
            row: i + idx + 1,
            message: err.message || '未知错误',
          })
        })
      }

      const processed = Math.min(i + batchSize, rows.length)
      setSubmitProgress({
        current: processed,
        total: rows.length,
        percent: Math.round((processed / rows.length) * 100),
      })
    }

    setResult({
      success: successCount,
      fail: failCount,
      failures,
      batchId,
    })

    setSubmitting(false)
    onSubmitted?.()
  }

  return (
    <div className="module-container">
      <h2 className="module-title">模块三：提交下单</h2>

      {rows.length === 0 ? (
        <div className="empty-state">
          <p>暂无待提交的数据，请先在模块一中导入 Excel 文件</p>
        </div>
      ) : (
        <>
          <div className="submit-info">
            <p>待提交数据：<strong>{rows.length}</strong> 条</p>
            {hasErrors ? (
              <p className="error-summary">
                ⚠ 存在 <strong>{errors.length}</strong> 个校验错误，请修正后再提交
              </p>
            ) : (
              <p className="status-success">✓ 全部数据校验通过，可以提交</p>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={hasErrors || submitting}
            style={{ marginTop: 16 }}
          >
            {submitting ? '提交中...' : '提交下单'}
          </button>

          {submitting && (
            <div className="progress-container" style={{ marginTop: 16 }}>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${submitProgress.percent}%` }}
                />
              </div>
              <span className="progress-text">
                {submitProgress.percent}% （{submitProgress.current} / {submitProgress.total} 条）
              </span>
            </div>
          )}

          {result && (
            <div className="submit-result">
              <h3>提交结果汇总</h3>
              <div className="result-stats">
                <div className="result-stat result-success">
                  <span className="result-num">{result.success}</span>
                  <span className="result-label">成功</span>
                </div>
                <div className="result-stat result-fail">
                  <span className="result-num">{result.fail}</span>
                  <span className="result-label">失败</span>
                </div>
              </div>
              <p className="result-batch">批次号：{result.batchId}</p>
              {result.failures.length > 0 && (
                <div className="result-failures">
                  <h4>失败详情：</h4>
                  <ul>
                    {result.failures.map((f, i) => (
                      <li key={i}>第 {f.row} 行：{f.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default OrderSubmit
