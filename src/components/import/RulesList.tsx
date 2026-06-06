'use client'

import { useState } from 'react'
import { FileSpreadsheet, Trash2, Copy, Plus, AlertCircle } from 'lucide-react'
import type { ParseRule } from '@/types'
import { generateId } from '@/lib/utils/helpers'
import { showToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import RuleEditor from './RuleEditor'
import { deleteRule, saveRule } from '@/lib/db/queries'

interface RulesListProps {
  rules: ParseRule[]
  onRulesChange: (rules: ParseRule[]) => void
}

export default function RulesList({ rules, onRulesChange }: RulesListProps) {
  const [editingRule, setEditingRule] = useState<ParseRule | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  const handleCopy = (rule: ParseRule) => {
    const copy: ParseRule = {
      ...rule,
      id: generateId(),
      name: `${rule.name} (副本)`,
      aiGenerated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    onRulesChange([...rules, copy])
    showToast('success', '规则已复制')
  }

  const handleDelete = (id: string) => {
    onRulesChange(rules.filter((r) => r.id !== id))
    deleteRule(id).catch(() => {})
    showToast('info', '规则已删除')
  }

  const handleEdit = (rule: ParseRule) => {
    setEditingRule(rule)
    setShowEditor(true)
  }

  const handleSaveEdit = (rule: ParseRule) => {
    const updated = rules.map((r) => (r.id === rule.id ? rule : r))
    onRulesChange(updated)
    saveRule(rule).catch(() => showToast('error', '保存到数据库失败'))
    setShowEditor(false)
    setEditingRule(null)
    showToast('success', '规则已更新')
  }

  const handleNew = () => {
    setEditingRule(null)
    setShowEditor(true)
  }

  const handleSaveNew = (rule: ParseRule) => {
    onRulesChange([...rules, rule])
    saveRule(rule).catch(() => showToast('error', '保存到数据库失败'))
    setShowEditor(false)
    showToast('success', '新规则已创建')
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900">解析规则管理</h2>
            <p className="text-xs text-gray-400 mt-0.5">共 {rules.length} 条规则</p>
          </div>
          <button className="btn-primary text-xs" onClick={handleNew}>
            <Plus size={14} className="mr-1" />新建规则
          </button>
        </div>

        {rules.length === 0 ? (
          <EmptyState
            icon={<FileSpreadsheet size={40} />}
            title="暂无解析规则"
            description="创建规则后，上传文件时即可选择对应的规则进行解析"
            action={
              <button className="btn-primary text-xs" onClick={handleNew}>新建规则</button>
            }
          />
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100/50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  <FileSpreadsheet size={20} className="text-[#0fc6c2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className="text-sm font-medium text-gray-800 truncate cursor-pointer hover:text-[#0fc6c2]"
                      onClick={() => handleEdit(rule)}
                    >
                      {rule.name}
                    </h3>
                    {rule.aiGenerated && <span className="tag tag-info text-[10px]">AI</span>}
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {rule.description || `${rule.fileType.toUpperCase()} · ${rule.transforms.length} 步处理 · ${rule.fieldMappings.length} 个字段映射`}
                  </p>
                  <p className="text-[10px] text-gray-300 mt-0.5">
                    更新于 {new Date(rule.updatedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="btn-ghost text-xs" onClick={() => handleEdit(rule)}>编辑</button>
                  <button className="btn-ghost text-xs" onClick={() => handleCopy(rule)}>
                    <Copy size={14} />
                  </button>
                  <button className="btn-ghost text-xs text-red-500 hover:text-red-600" onClick={() => handleDelete(rule.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showEditor}
        onClose={() => { setShowEditor(false); setEditingRule(null) }}
        title={editingRule ? '编辑规则' : '新建规则'}
        width="max-w-4xl"
      >
        <RuleEditor
          initialRule={editingRule}
          onSave={editingRule ? handleSaveEdit : handleSaveNew}
          onCancel={() => { setShowEditor(false); setEditingRule(null) }}
        />
      </Modal>
    </div>
  )
}
