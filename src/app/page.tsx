'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ParseRule, OrderRow } from '@/types'
import Header, { type TabKey } from '@/components/layout/Header'
import ImportModule from '@/components/import/ImportModule'
import RulesList from '@/components/import/RulesList'
import DataPreview from '@/components/preview/DataPreview'
import OrderSubmit from '@/components/submit/OrderSubmit'
import OrderList from '@/components/orders/OrderList'
import WorkspaceGuide from '@/components/layout/WorkspaceGuide'
import ToastContainer from '@/components/ui/Toast'
import { getRules } from '@/lib/db/queries'
import { standardExcelRule, happyFarmTemplateRule, deliveryOrderRule } from '@/lib/utils/rule-templates'

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>('import')
  const [rules, setRules] = useState<ParseRule[]>([])
  const [importedData, setImportedData] = useState<OrderRow[]>([])
  const [currentRule, setCurrentRule] = useState<ParseRule | null>(null)
  const [loading, setLoading] = useState(true)
  // Track if user has ever imported data (for step guidance)
  const [hasEverImported, setHasEverImported] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('has_imported') === 'true'
    }
    return false
  })

  // Load rules
  useEffect(() => {
    const loadRules = async () => {
      try {
        let allRules = await getRules()

        // Remove corrupt rules: too many transforms/mappings indicates AI merging bug
        allRules = allRules.filter(
          (r) => (r.transforms?.length || 0) <= 8 && (r.fieldMappings?.length || 0) <= 30
        )

        // Remove AI-generated rules with matrix_transpose (known to produce incorrect data)
        allRules = allRules.filter(
          (r) => !r.transforms?.some((t) => t.type === 'matrix_transpose')
        )

        // Ensure pre-built templates are always available
        const templateNames = new Set(allRules.map((r) => r.name))
        if (!templateNames.has('标准Excel模板')) {
          allRules.unshift(standardExcelRule())
        }
        if (!templateNames.has('配送发货单模板')) {
          allRules.push(deliveryOrderRule())
        }
        if (!templateNames.has('欢乐牧场库存模板')) {
          allRules.push(happyFarmTemplateRule())
        }

        setRules(allRules)
      } catch {
        // API unavailable, no rules loaded
      } finally {
        setLoading(false)
      }
    }
    loadRules()
  }, [])

  const handleRulesChange = useCallback((newRules: ParseRule[]) => {
    setRules(newRules)
  }, [])

  const handleDataImported = useCallback((rows: OrderRow[], rule: ParseRule) => {
    setImportedData(rows)
    setCurrentRule(rule)
    setHasEverImported(true)
  }, [])

  const handleDataChange = useCallback((rows: OrderRow[]) => {
    setImportedData(rows)
  }, [])

  const handleSubmitted = useCallback(() => {
    setImportedData([])
    setCurrentRule(null)
    setActiveTab('orders')
  }, [])

  const handleNavigateToPreview = useCallback(() => {
    setActiveTab('preview')
  }, [])

  const handleNavigateToSubmit = useCallback(() => {
    setActiveTab('submit')
  }, [])

  const errorCount = importedData.reduce((sum, row) => sum + (row._errors?.length || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6fa]">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-gray-200 border-t-[#0fc6c2] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      <ToastContainer />
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          // Allow import -> preview/submit only if we have data
          if ((tab === 'preview' || tab === 'submit') && importedData.length === 0) return
          setActiveTab(tab)
        }}
        hasData={importedData.length > 0}
        errorCount={errorCount}
        importedCount={importedData.length}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Workspace Guide - shows only on import tab when no data */}
        {activeTab === 'import' && !hasEverImported && <WorkspaceGuide />}

        {activeTab === 'import' && (
          <ImportModule
            rules={rules}
            onRulesChange={handleRulesChange}
            onDataImported={handleDataImported}
            onNavigateToPreview={handleNavigateToPreview}
          />
        )}

        {activeTab === 'rules' && (
          <RulesList
            rules={rules}
            onRulesChange={handleRulesChange}
          />
        )}

        {activeTab === 'preview' && (
          <DataPreview
            rows={importedData}
            onDataChange={handleDataChange}
            onNavigateToSubmit={handleNavigateToSubmit}
          />
        )}

        {activeTab === 'submit' && (
          <OrderSubmit
            rows={importedData}
            onSubmitSuccess={handleSubmitted}
          />
        )}

        {activeTab === 'orders' && (
          <OrderList />
        )}
      </main>
    </div>
  )
}
