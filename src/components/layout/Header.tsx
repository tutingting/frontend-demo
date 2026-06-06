'use client'

import { Package, Upload, FileSpreadsheet, ClipboardList, Send, Check } from 'lucide-react'

export type TabKey = 'import' | 'rules' | 'preview' | 'submit' | 'orders'

// Steps in the main workflow (orders is a standalone query, not a step)
const WORKFLOW_STEPS: TabKey[] = ['import', 'preview', 'submit']

interface StepDef {
  key: TabKey
  label: string
  icon: React.ReactNode
  description: string
}

const STEPS: StepDef[] = [
  {
    key: 'import',
    label: '导入文件',
    icon: <Upload size={16} />,
    description: '上传 Excel、Word 或 PDF 文件，选择或创建解析规则',
  },
  {
    key: 'preview',
    label: '预览编辑',
    icon: <ClipboardList size={16} />,
    description: '检查解析结果，编辑修正数据，确认无误后提交',
  },
  {
    key: 'submit',
    label: '提交下单',
    icon: <Send size={16} />,
    description: '将数据提交到系统，生成运单记录',
  },
]

interface HeaderProps {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  hasData: boolean
  errorCount: number
  importedCount: number
}

export default function Header({ activeTab, onTabChange, hasData, errorCount, importedCount }: HeaderProps) {
  const currentStepIndex = WORKFLOW_STEPS.indexOf(activeTab)
  const showSteps = WORKFLOW_STEPS.includes(activeTab)

  const getStepStatus = (stepKey: TabKey): 'completed' | 'active' | 'upcoming' => {
    const stepIdx = WORKFLOW_STEPS.indexOf(stepKey)
    if (activeTab === stepKey) return 'active'
    if (currentStepIndex < 0) return 'upcoming'
    if (stepIdx < currentStepIndex) return 'completed'
    return 'upcoming'
  }

  const isTopTab = (key: TabKey) => key === 'rules' || key === 'orders'

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top bar */}
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0fc6c2] flex items-center justify-center">
              <Package size={18} className="text-white" />
            </div>
            <h1 className="text-base font-bold text-gray-900">智能批量下单系统</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Error badge on preview */}
            {activeTab === 'preview' && errorCount > 0 && (
              <span className="text-xs text-red-500 bg-red-50 px-2.5 py-1 rounded-full font-medium">
                {errorCount} 个错误待修正
              </span>
            )}

            {/* Top-level tabs (always visible, independent of workflow) */}
            <button
              onClick={() => onTabChange('orders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'orders'
                  ? 'bg-[#0fc6c2]/10 text-[#0fc6c2]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Package size={13} />
              运单列表
            </button>
            <button
              onClick={() => onTabChange('rules')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'rules'
                  ? 'bg-[#0fc6c2]/10 text-[#0fc6c2]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileSpreadsheet size={13} />
              解析规则管理
            </button>
          </div>
        </div>

        {/* Step Wizard (import → preview → submit only) */}
        {showSteps && (
          <div className="pb-3">
            <div className="flex items-center">
              {STEPS.map((step, idx) => {
                const status = getStepStatus(step.key)
                const isClickable = status === 'completed' || status === 'active'

                return (
                  <div key={step.key} className="flex items-center flex-1 min-w-0">
                    <button
                      onClick={() => isClickable ? onTabChange(step.key) : undefined}
                      disabled={!isClickable}
                      className={`flex items-center gap-2 min-w-0 ${
                        !isClickable ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors ${
                          status === 'completed'
                            ? 'bg-[#0fc6c2] text-white'
                            : status === 'active'
                            ? 'bg-[#0fc6c2]/10 text-[#0fc6c2] border-2 border-[#0fc6c2]'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {status === 'completed' ? <Check size={14} /> : idx + 1}
                      </div>
                      <div className="flex-shrink-0">
                        <div
                          className={`text-xs font-medium leading-tight ${
                            status === 'active' ? 'text-[#0fc6c2]' : status === 'completed' ? 'text-gray-700' : 'text-gray-400'
                          }`}
                        >
                          {step.label}
                        </div>
                        {status === 'active' && (
                          <div className="text-[10px] text-gray-400 leading-tight mt-0.5 max-w-[120px] truncate">
                            {step.description}
                          </div>
                        )}
                      </div>
                    </button>

                    {idx < STEPS.length - 1 && (
                      <div className="flex-1 mx-3 min-w-[20px]">
                        <div
                          className={`h-0.5 rounded-full ${
                            (status === 'completed')
                              ? 'bg-[#0fc6c2]'
                              : 'bg-gray-200'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Standalone tab headers (orders / rules) */}
        {activeTab === 'orders' && (
          <div className="pb-3">
            <p className="text-xs text-gray-500">
              查看所有已提交的运单记录，按外部编码聚合为出库单展示。
              <button onClick={() => onTabChange('import')} className="text-[#0fc6c2] font-medium ml-1 hover:underline">
                返回下单流程
              </button>
            </p>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="pb-3">
            <p className="text-xs text-gray-500">
              管理文件解析规则。可以手动创建、编辑规则，或通过 AI 智能生成。
              <button onClick={() => onTabChange('import')} className="text-[#0fc6c2] font-medium ml-1 hover:underline">
                返回导入
              </button>
            </p>
          </div>
        )}
      </div>
    </header>
  )
}
