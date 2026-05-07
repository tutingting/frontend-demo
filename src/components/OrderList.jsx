import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

const PAGE_SIZE = 20

function OrderList() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    externalCode: '',
    receiverName: '',
    dateFrom: '',
    dateTo: '',
  })

  const fetchOrders = useCallback(async (pageNum, currentFilters) => {
    let query = supabase
      .from('shipping_orders')
      .select('*', { count: 'exact' })

    if (currentFilters.externalCode) {
      query = query.ilike('external_code', `%${currentFilters.externalCode}%`)
    }
    if (currentFilters.receiverName) {
      query = query.ilike('receiver_name', `%${currentFilters.receiverName}%`)
    }
    if (currentFilters.dateFrom) {
      query = query.gte('created_at', currentFilters.dateFrom)
    }
    if (currentFilters.dateTo) {
      query = query.lte('created_at', currentFilters.dateTo + 'T23:59:59')
    }

    const from = (pageNum - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('查询失败：', error.message)
      return { orders: [], total: 0 }
    }
    return { orders: data || [], total: count || 0 }
  }, [])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setLoading(true)
    })
    fetchOrders(page, filters).then((result) => {
      if (!cancelled) {
        setOrders(result.orders)
        setTotal(result.total)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [page, filters, fetchOrders])

  const handleSearch = () => {
    setPage(1)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="module-container">
      <h2 className="module-title">模块四：已导入运单列表</h2>

      <div className="search-bar">
        <div className="search-field">
          <label>外部编码</label>
          <input
            type="text"
            placeholder="搜索外部编码..."
            value={filters.externalCode}
            onChange={(e) => setFilters({ ...filters, externalCode: e.target.value })}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="search-field">
          <label>收件人姓名</label>
          <input
            type="text"
            placeholder="搜索收件人..."
            value={filters.receiverName}
            onChange={(e) => setFilters({ ...filters, receiverName: e.target.value })}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="search-field">
          <label>提交时间从</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          />
        </div>
        <div className="search-field">
          <label>至</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          />
        </div>
        <button className="btn btn-primary" onClick={handleSearch}>
          搜索
        </button>
      </div>

      <div className="table-wrapper" style={{ marginTop: 16 }}>
        {loading ? (
          <div className="empty-state"><p>加载中...</p></div>
        ) : orders.length === 0 ? (
          <div className="empty-state"><p>暂无数据</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 60 }}>ID</th>
                <th style={{ minWidth: 120 }}>外部编码</th>
                <th style={{ minWidth: 80 }}>发件人</th>
                <th style={{ minWidth: 120 }}>发件人电话</th>
                <th style={{ minWidth: 80 }}>收件人</th>
                <th style={{ minWidth: 120 }}>收件人电话</th>
                <th style={{ minWidth: 80 }}>重量(kg)</th>
                <th style={{ minWidth: 50 }}>件数</th>
                <th style={{ minWidth: 60 }}>温层</th>
                <th style={{ minWidth: 100 }}>备注</th>
                <th style={{ minWidth: 150 }}>提交时间</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.external_code || '-'}</td>
                  <td>{order.sender_name}</td>
                  <td>{order.sender_phone}</td>
                  <td>{order.receiver_name}</td>
                  <td>{order.receiver_phone}</td>
                  <td>{order.weight_kg}</td>
                  <td>{order.package_count}</td>
                  <td>{order.temperature}</td>
                  <td style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {order.notes || '-'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {order.created_at ? new Date(order.created_at).toLocaleString('zh-CN') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 0 && (
        <div className="pagination">
          <span className="pagination-info">共 {total} 条，第 {page} / {totalPages} 页</span>
          <div className="pagination-btns">
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              上一页
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderList
