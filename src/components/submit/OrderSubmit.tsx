'use client'

import { useState, useMemo, useEffect } from 'react'
import { Send, CheckCircle, AlertCircle, Package, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react'
import type { OrderRow } from '@/types'
import { validateAllRows } from '@/lib/validators/order-validator'
import { saveWaybills } from '@/lib/db/queries'
import { generateId } from '@/lib/utils/helpers'
import { aggregateByExternalCode, countTotalItems, countUniqueSkus } from '@/lib/utils/order-aggregator'
import { showToast } from '@/components/ui/Toast'

interface OrderSubmitProps {
  rows: OrderRow[]
  onSubmitSuccess: () => void
}

export default function OrderSubmit({ rows, onSubmitSuccess }: OrderSubmitProps) {
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const validatedRows = validateAllRows(rows)
  const hasErrors = validatedRows.some((r) => (r._errors?.length || 0) > 0)
  const validRows = validatedRows.filter((r) => !r._errors || r._errors.length === 0)
  const errorCount = validatedRows.reduce((s, r) => s + (r._errors?.length || 0), 0)

  // Aggregate into outbound orders
  const orderGroups = useMemo(() => aggregateByExternalCode(validRows), [validRows])
  const totalItems = countTotalItems(orderGroups)
  const uniqueSkuCount = countUniqueSkus(orderGroups)
  const orderCount = orderGroups.length

  // Auto-expand first group
  useEffect(() => {
    if (orderGroups.length > 0) {
      setExpandedGroups(new Set([orderGroups[0].externalCode]))
    }
  }, [orderGroups])

  const toggleExpand = (code: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const handleSubmit = async () => {
    if (hasErrors) {
      showToast('error', `存在 ${errorCount} 个错误，请先修正后再提交`)
      return
    }

    setSubmitting(true)
    setProgress(0)
    setResult(null)

    try {
      // Defensive: check for duplicate SKU within each order group
      const duplicateErrors: string[] = []
      orderGroups.forEach((group) => {
        const seenSkus = new Set<string>()
        group.items.forEach((item) => {
          if (seenSkus.has(item.skuCode)) {
            duplicateErrors.push(`出库单"${group.externalCode || '(未编码)'}"中SKU"${item.skuCode}"重复`)
          }
          seenSkus.add(item.skuCode)
        })
      })
      if (duplicateErrors.length > 0) {
        showToast('error', duplicateErrors[0])
        setSubmitting(false)
        return
      }

      const sessionId = `session_${Date.now()}`
      const allRecords = orderGroups.flatMap((group) =>
        group.items.map((item) => ({
          id: generateId(),
          sessionId,
          externalCode: group.externalCode || undefined,
          storeName: group.storeName,
          receiverName: group.receiverName,
          receiverPhone: group.receiverPhone,
          receiverAddress: group.receiverAddress,
          skuCode: item.skuCode,
          skuName: item.skuName,
          skuQuantity: item.skuQuantity,
          skuSpec: item.skuSpec,
          remark: item.remark,
          createdAt: group.createdAt,
        }))
      )

      const total = allRecords.length
      let successCount = 0

      // Submit in batches of 500 in parallel (max 3 concurrent)
      const batchSize = 500
      const batches: any[][] = []
      for (let i = 0; i < allRecords.length; i += batchSize) {
        batches.push(allRecords.slice(i, i + batchSize))
      }

      const concurrency = 3
      for (let b = 0; b < batches.length; b += concurrency) {
        const concurrentBatches = batches.slice(b, b + concurrency)
        const results = await Promise.all(
          concurrentBatches.map((chunk) => saveWaybills(chunk))
        )
        successCount += results.reduce((s, c) => s + c, 0)
        setProgress(Math.round((Math.min((b + concurrency) * batchSize, total) / total) * 100))
      }

      setProgress(100)
      setResult({ success: successCount, failed: total - successCount })
      showToast('success', `提交完成！共 ${orderCount} 个出库单，${successCount} 条明细`)
    } catch (err) {
      showToast('error', `提交失败: ${err instanceof Error ? err.message : '未知错误'}`)
      setResult({ success: 0, failed: totalItems })
    } finally {
      setSubmitting(false)
    }
  }

  // === SUCCESS SCREEN ===
  if (result && result.success > 0) {
    return (
      <div className="flex items-center justify-center py-12 animate-fade-in">
        <div className="card max-w-lg w-full text-center">
          <div className="p-8">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">提交成功</h2>
            <p className="text-sm text-gray-500 mb-6">
              共提交 {orderCount} 个出库单，{result.success} 条 SKU 明细
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 bg-gray-50 rounded-[6px]">
                <p className="text-lg font-bold text-gray-800">{orderCount}</p>
                <p className="text-[10px] text-gray-400">出库单</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-[6px]">
                <p className="text-lg font-bold text-gray-800">{totalItems}</p>
                <p className="text-[10px] text-gray-400">SKU项数</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-[6px]">
                <p className="text-lg font-bold text-gray-800">{uniqueSkuCount}</p>
                <p className="text-[10px] text-gray-400">SKU种类</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button className="btn btn-primary w-full" onClick={onSubmitSuccess}>
                <Package size={16} /> 查看运单列表 <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // === GROUPED ORDER VIEW ===
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary */}
      <div className="card">
        <div className="card-body">
          <h3 className="card-title mb-4">出库单概览</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="stat-card">
              <p className="stat-value">{orderCount}</p>
              <p className="stat-label">出库单数</p>
            </div>
            <div className="stat-card">
              <p className="stat-value" style={{ color: '#0fc6c2' }}>{totalItems}</p>
              <p className="stat-label">SKU明细条数</p>
            </div>
            <div className="stat-card">
              <p className="stat-value" style={{ color: '#e6a23c' }}>{uniqueSkuCount}</p>
              <p className="stat-label">SKU种类</p>
            </div>
            <div className="stat-card">
              <p className="stat-value" style={{ color: '#f56c6c' }}>
                {orderGroups.reduce((s, g) => s + g.items.reduce((si, i) => si + i.skuQuantity, 0), 0)}
              </p>
              <p className="stat-label">总数量</p>
            </div>
          </div>
        </div>
      </div>

      {/* Errors warning */}
      {hasErrors && (
        <div className="el-alert el-alert--error">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">存在 {errorCount} 个错误</p>
            <p className="text-xs mt-0.5">请返回「预览编辑」修正后再提交</p>
          </div>
        </div>
      )}

      {/* Outbound Order List */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">
          出库单列表
          <span className="text-xs font-normal text-gray-400 ml-2">点击展开查看 SKU 明细</span>
        </h4>

        {orderGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.externalCode)
          const itemCount = group.items.length
          const totalQty = group.items.reduce((s, i) => s + i.skuQuantity, 0)

          return (
            <div key={group.externalCode || Math.random().toString()} className="card overflow-hidden">
              {/* Order header */}
              <div
                className="card-body flex items-center gap-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => toggleExpand(group.externalCode)}
              >
                <button className="text-gray-400 flex-shrink-0">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-800">
                      出库单
                    </span>
                    {group.externalCode && (
                      <span className="text-xs font-mono text-[#0fc6c2] bg-[#0fc6c2]/5 px-1.5 py-0.5 rounded">
                        {group.externalCode}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                      {itemCount} 项 / {totalQty} 件
                    </span>
                  </div>
                  {/* Shared receiver info */}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[10px] text-gray-500">
                    {group.storeName && <span>门店: {group.storeName}</span>}
                    {group.receiverName && <span>收件人: {group.receiverName}</span>}
                    {group.receiverPhone && <span>电话: {group.receiverPhone}</span>}
                    {group.receiverAddress && (
                      <span className="truncate max-w-[200px]" title={group.receiverAddress}>
                        地址: {group.receiverAddress}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* SKU items (expandable) */}
              {isExpanded && (
                <div className="border-t border-[#ebeef5]">
                  <table className="el-table !border-0">
                    <thead>
                      <tr>
                        <th className="!text-[10px] !py-2">#</th>
                        <th className="!text-[10px] !py-2">SKU编码</th>
                        <th className="!text-[10px] !py-2">SKU名称</th>
                        <th className="!text-[10px] !py-2">规格</th>
                        <th className="!text-[10px] !py-2 !text-right">数量</th>
                        <th className="!text-[10px] !py-2">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="!text-[10px] !py-1.5 text-gray-400">{idx + 1}</td>
                          <td className="!text-[10px] !py-1.5 font-mono">{item.skuCode}</td>
                          <td className="!text-[10px] !py-1.5 max-w-[150px] truncate" title={item.skuName}>{item.skuName}</td>
                          <td className="!text-[10px] !py-1.5">{item.skuSpec || '-'}</td>
                          <td className="!text-[10px] !py-1.5 !text-right font-medium">{item.skuQuantity}</td>
                          <td className="!text-[10px] !py-1.5 max-w-[120px] truncate" title={item.remark || ''}>{item.remark || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Submit Area */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col items-center gap-4 py-4">
            <button
              className="btn btn-primary btn-lg"
              disabled={hasErrors || submitting || orderGroups.length === 0}
              onClick={handleSubmit}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  提交中 ({progress}%)
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send size={16} />
                  提交 {orderCount} 个出库单 ({totalItems} 条明细)
                </span>
              )}
            </button>

            {submitting && (
              <div className="w-full max-w-md">
                <div className="el-progress">
                  <div className="el-progress__bar" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-center">正在保存...</p>
              </div>
            )}

            {!submitting && !hasErrors && orderGroups.length > 0 && (
              <p className="text-xs text-gray-400 text-center max-w-md">
                提交后数据将保存到系统数据库，可在「运单列表」中查看
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Step Guide */}
      <div className="flex items-center justify-center gap-6 py-2 text-xs text-gray-400">
        {['导入解析', '预览确认', '提交下单', '运单列表'].map((label, idx) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              idx === 2
                ? 'bg-[#0fc6c2] text-white'
                : idx < 2
                ? 'bg-[#0fc6c2]/10 text-[#0fc6c2]'
                : 'bg-gray-100 text-gray-400'
            }`}>
              {idx + 1}
            </div>
            <span className={idx === 2 ? 'text-gray-600 font-medium' : ''}>{label}</span>
            {idx < 3 && <ArrowRight size={12} className="text-gray-300" />}
          </div>
        ))}
      </div>
    </div>
  )
}
