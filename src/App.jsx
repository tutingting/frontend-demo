import { useState } from 'react'
import ImportModule from './components/ImportModule'
import DataPreview from './components/DataPreview'
import OrderSubmit from './components/OrderSubmit'
import OrderList from './components/OrderList'
import './App.css'

const TABS = [
  { key: 'import', label: '📥 模块一：导入文件' },
  { key: 'preview', label: '📋 模块二：预览编辑' },
  { key: 'submit', label: '📮 模块三：提交下单' },
  { key: 'list', label: '📦 模块四：运单列表' },
]

function App() {
  const [activeTab, setActiveTab] = useState('import')
  const [importedData, setImportedData] = useState([])
  const [previewErrors, setPreviewErrors] = useState([])
  const [importKey, setImportKey] = useState(0)

  const handleDataImported = (data) => {
    setImportedData(data)
    setImportKey((k) => k + 1)
  }

  const handleDataChange = (rows, errors) => {
    setImportedData(rows)
    setPreviewErrors(errors)
  }

  const handleSetActiveTab = (tab) => {
    setActiveTab(tab)
  }

  const handleSubmitted = () => {
    setActiveTab('list')
  }

  const errorCount = previewErrors.length

  return (
    <div className="app">
      <header className="app-header">
        <h1>📦 物流运单管理系统</h1>
        <p className="app-subtitle">Excel 模板导入 · 数据校验 · 提交下单 · 运单管理</p>
      </header>

      <nav className="tab-nav">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.key === 'preview' && importedData.length > 0 && (
              <span className={`tab-badge ${errorCount > 0 ? 'badge-error' : 'badge-success'}`}>
                {importedData.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {activeTab === 'import' && (
          <ImportModule
            onDataImported={handleDataImported}
            onSetActiveTab={handleSetActiveTab}
          />
        )}

        {activeTab === 'preview' && (
          <DataPreview
            key={importKey}
            data={importedData}
            onDataChange={handleDataChange}
          />
        )}

        {activeTab === 'submit' && (
          <OrderSubmit
            rows={importedData}
            errors={previewErrors}
            onSubmitted={handleSubmitted}
          />
        )}

        {activeTab === 'list' && <OrderList />}
      </main>
    </div>
  )
}

export default App
