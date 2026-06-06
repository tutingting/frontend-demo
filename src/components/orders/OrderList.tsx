'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, Package, RefreshCw, Calendar, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react'
import type { PaginatedResult } from '@/types'
import type { OrderSummary } from '@/lib/db/queries'
import { getOrders } from '@/lib/db/queries'
import { formatDate } from '@/lib/utils/helpers'

const PAGE_SIZE = 10

export default function OrderList() {
  const [ordersResult, setOrdersResult] = useState<PaginatedResult<OrderSummary> | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('external_code')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async (p: number, s: string, sf: string, sd: string, ed: string) => {
    setLoading(true)
    try {
      const result = await getOrders({
        page: p,
        pageSize: PAGE_SIZE,
        search: s || undefined,
        searchField: s ? sf : undefined,
        startDate: sd || undefined,
        endDate: ed || undefined,
      })
      setOrdersResult(result)
    } catch {
      setOrdersResult(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(page, search, searchField, startDate, endDate)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    setPage(1)
    fetchData(1, search, searchField, startDate, endDate)
  }

  const handleReset = () => {
    setSearch('')
    setSearchField('external_code')
    setStartDate('')
    setEndDate('')
    setPage(1)
    fetchData(1, '', 'external_code', '', '')
  }

  const orders = ordersResult?.data || []
  const totalOrders = ordersResult?.total || 0
  const totalPages = ordersResult?.totalPages || 1
  const currentPage = Math.min(page, totalPages)
  const totalItemCount = orders.reduce((s, o) => s + o.itemCount, 0)

  // Auto-expand first order when data loads
  useEffect(() => {
    if (orders.length > 0) {
      const firstId = orders[0].externalCode || `order_${orders[0].created_at}_${orders[0].itemCount}`
      setExpandedOrders(new Set([firstId]))
    } else {
      setExpandedOrders(new Set())
    }
  }, [orders]) // eslint-disable-line react-hooks/exhaustive-deps

  const getOrderId = (order: OrderSummary, idx: number) =>
    order.externalCode || `order_${idx}_${order.created_at}`

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  const FIELD_LABELS: Record<string, string> = {
    external_code: '外部编码',
    receiver_name: '收件人姓名',
    store_name: '收货门店',
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">搜索字段</label>
              <select className="el-select w-full" value={searchField} onChange={(e) => setSearchField(e.target.value)}>
                {Object.entries(FIELD_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="text-[10px] text-gray-400 mb-1 block">关键词</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="el-input !pl-7" placeholder="输入搜索关键词..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">开始日期</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="date" className="el-input !pl-7" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={endDate || undefined} />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">结束日期</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="date" className="el-input !pl-7" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || undefined} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#ebeef5]">
            <button className="btn btn-primary btn-sm" onClick={handleSearch}><Search size={13} /> 搜索查询</button>
            <button className="btn btn-ghost btn-sm" onClick={handleReset}><RefreshCw size={13} /> 重置</button>
            <span className="text-[10px] text-gray-400 ml-auto">
              按外部编码、收件人姓名、门店搜索，支持按提交时间范围筛选
            </span>
          </div>
        </div>
      </div>

      {/* Order List */}
      <div className="space-y-3">
        {loading ? (
          <div className="card">
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-[3px] border-gray-200 border-t-[#0fc6c2] rounded-full animate-spin" />
            </div>
          </div>
        ) : totalOrders === 0 ? (
          <div className="card">
            <div className="el-empty py-16">
              <Package size={48} className="el-empty__icon mb-4" />
              <p className="el-empty__title text-base">暂无出库单记录</p>
              <p className="el-empty__description text-sm">
                {search || startDate || endDate ? '没有匹配的出库单，请调整筛选条件' : '还没有提交过出库单，请按以下步骤操作：'}
              </p>
              {!search && !startDate && !endDate && (
                <div className="text-left inline-block mt-4 space-y-2">
                  {[
                    ['导入文件', '上传 Excel / PDF / Word 文件'],
                    ['解析规则', '选择或通过 AI 生成规则，点击开始解析'],
                    ['预览编辑', '核对并修正数据'],
                    ['提交下单', '提交后出库单将显示在这里'],
                  ].map(([step, desc], i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-5 h-5 rounded-full bg-[#0fc6c2]/10 text-[#0fc6c2] flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</div>
                      <span>在「<strong className="text-gray-700">{step}</strong>」{desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span>
                共 <strong className="text-gray-700">{totalOrders}</strong> 个出库单，<strong className="text-gray-700">{totalItemCount}</strong> 条 SKU 明细
                {search && <span className="ml-1">(搜索: {search})</span>}
                {(startDate || endDate) && <span className="ml-1">(日期: {startDate || '不限'} ~ {endDate || '不限'})</span>}
              </span>
            </div>

            {/* Order cards */}
            {orders.map((order, idx) => {
              const orderId = getOrderId(order, idx)
              const isExpanded = expandedOrders.has(orderId)
              const hasMultipleItems = order.itemCount > 1
              return (
                <div key={orderId} className="card overflow-hidden">
                  <div
                    className={`card-body flex items-center gap-3 transition-colors ${
                      hasMultipleItems ? 'cursor-pointer hover:bg-gray-50/50' : ''
                    }`}
                    onClick={() => hasMultipleItems ? toggleExpand(orderId) : undefined}
                  >
                    {hasMultipleItems ? (
                      <button className="text-gray-400 flex-shrink-0">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRightIcon size={16} />}
                      </button>
                    ) : (
                      <div className="w-4 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-gray-800">出库单</span>
                        {order.externalCode && (
                          <span className="text-xs font-mono text-[#0fc6c2] bg-[#0fc6c2]/5 px-1.5 py-0.5 rounded">{order.externalCode}</span>
                        )}
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                          {order.itemCount} 项 / {order.totalQuantity} 件
                        </span>
                        <span className="text-[10px] text-gray-300">{formatDate(order.created_at)}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[10px] text-gray-500">
                        {order.storeName && <span>门店: {order.storeName}</span>}
                        {order.receiverName && <span>收件人: {order.receiverName}</span>}
                        {order.receiverPhone && <span>电话: {order.receiverPhone}</span>}
                        {order.receiverAddress && (
                          <span className="truncate max-w-[200px]" title={order.receiverAddress}>地址: {order.receiverAddress}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {(hasMultipleItems ? isExpanded : true) && (
                    <div className="border-t border-[#ebeef5] overflow-x-auto">
                      <table className="el-table !border-0">
                        <thead>
                          <tr>
                            <th className="!text-[10px] !py-2">#</th>
                            <th className="!text-[10px] !py-2">外部编码</th>
                            <th className="!text-[10px] !py-2">SKU编码</th>
                            <th className="!text-[10px] !py-2">SKU名称</th>
                            <th className="!text-[10px] !py-2">规格</th>
                            <th className="!text-[10px] !py-2 !text-right">数量</th>
                            <th className="!text-[10px] !py-2">备注</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td className="!text-[10px] !py-1.5 text-gray-400">{idx + 1}</td>
                              <td className="!text-[10px] !py-1.5 font-mono max-w-[90px] truncate" title={item.externalCode || ''}>{item.externalCode || '-'}</td>
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

            {/* Pagination */}
            <div className="el-pagination mt-4">
              <span className="el-pagination__info">
                共 {totalOrders} 个出库单，第 {currentPage}/{totalPages} 页
              </span>
              <div className="flex items-center gap-1">
                <button className="el-pagination__btn" disabled={currentPage <= 1} onClick={() => setPage(1)} title="首页">
                  <ChevronLeft size={12} /><ChevronLeft size={12} className="-ml-1" />
                </button>
                <button className="el-pagination__btn" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-gray-600 min-w-[60px] text-center font-mono">{currentPage} / {totalPages}</span>
                <button className="el-pagination__btn" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  <ChevronRight size={14} />
                </button>
                <button className="el-pagination__btn" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)} title="末页">
                  <ChevronRight size={12} /><ChevronRight size={12} className="-ml-1" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="text-center text-[10px] text-gray-300 py-1">
        数据来源：Neon 数据库 · 按外部编码聚合为出库单展示 · 每页 {PAGE_SIZE} 单
      </div>
    </div>
  )
}
