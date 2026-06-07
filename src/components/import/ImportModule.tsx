'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, FileSpreadsheet, File, AlertCircle, Plus, Trash2 } from 'lucide-react'
import type { FileType, ParseRule, OrderRow } from '@/types'
import { parseExcel } from '@/lib/engine/parsers/excel-parser'
import { parseWord } from '@/lib/engine/parsers/word-parser'
import { parsePdf } from '@/lib/engine/parsers/pdf-parser'
import { executeRule } from '@/lib/engine/rule-engine'
import { generateRule, generateFilePreview } from '@/lib/ai/llm'
import { detectFileType, readFileAsArrayBuffer, generateId } from '@/lib/utils/helpers'
import { showToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { deleteRule, saveRule } from '@/lib/db/queries'
import RuleEditor from './RuleEditor'

interface ImportModuleProps {
  rules: ParseRule[]
  onRulesChange: (rules: ParseRule[]) => void
  onDataImported: (rows: OrderRow[], rule: ParseRule) => void
  onNavigateToPreview: () => void
}

export default function ImportModule({
  rules,
  onRulesChange,
  onDataImported,
  onNavigateToPreview,
}: ImportModuleProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedRuleId, setSelectedRuleId] = useState<string>('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [showNewRuleModal, setShowNewRuleModal] = useState(false)
  const [showAiSuggestModal, setShowAiSuggestModal] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<ParseRule | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [filePreview, setFilePreview] = useState<string>('')
  const [fileInfo, setFileInfo] = useState<{ fileType: FileType; sheets: { name: string; rows: number }[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0])
  }, [])

  const handleFileSelect = async (file: File) => {
    const type = detectFileType(file)
    if (type === 'unknown') {
      showToast('error', '不支持的文件格式，请上传 Excel(.xlsx/.xls)、Word(.docx) 或 PDF 文件')
      return
    }
    setSelectedFile(file)
    setSelectedRuleId('')
    setParseError(null)
    setFileInfo(null)

    // Show file info
    if (type === 'excel') {
      try {
        const buffer = await readFileAsArrayBuffer(file)
        const sheets = parseExcel(buffer)
        setFileInfo({
          fileType: 'excel',
          sheets: sheets.map((s) => ({ name: s.name, rows: s.rows.length })),
        })
      } catch {
        // Just show the file name
      }
    }
    showToast('info', `已选择文件: ${file.name} (${(file.size / 1024).toFixed(0)}KB)`)
  }

  const handleRuleSelect = (ruleId: string) => {
    setSelectedRuleId(ruleId)
    setParseError(null)
  }

  const handleAiSuggest = async () => {
    if (!selectedFile) return
    setAiLoading(true)
    setShowAiSuggestModal(true)

    try {
      const buffer = await readFileAsArrayBuffer(selectedFile)
      const fileType = detectFileType(selectedFile) as FileType
      let rawPreview: string[][] = []
      let pdfText = ''

      if (fileType === 'excel') {
        const sheets = parseExcel(buffer)
        rawPreview = sheets[0]?.rows || []
      } else if (fileType === 'word') {
        const result = await parseWord(buffer)
        rawPreview = result.paragraphs.map((p) => [p])
      } else if (fileType === 'pdf') {
        const result = await parsePdf(buffer)
        rawPreview = [[result.pages.map((p) => p.text).join('\n---\n')]]
        pdfText = result.fullText
      }

      const preview = generateFilePreview(fileType, rawPreview, pdfText)
      setFilePreview(preview)

      const suggestion = await generateRule(
        fileType,
        selectedFile.name,
        preview,
        ['externalCode', 'storeName', 'receiverName', 'receiverPhone', 'receiverAddress', 'skuCode', 'skuName', 'skuQuantity', 'skuSpec', 'remark']
      )

      const rule: ParseRule = {
        id: generateId(),
        name: suggestion.ruleName,
        description: suggestion.description,
        fileType: suggestion.fileType,
        transforms: suggestion.transforms,
        fieldMappings: suggestion.fieldMappings,
        aiGenerated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setAiSuggestion(rule)
    } catch (err) {
      console.error('AI 分析失败:', err)
      showToast('error', `AI 分析失败: ${err instanceof Error ? err.message : '请稍后重试'}`)
      setShowAiSuggestModal(false)
    } finally {
      setAiLoading(false)
    }
  }

  const handleSaveAiRule = (rule: ParseRule) => {
    const updatedRules = [...rules.filter((r) => r.id !== rule.id), rule]
    onRulesChange(updatedRules)
    setSelectedRuleId(rule.id)
    setShowAiSuggestModal(false)
    setAiSuggestion(null)
    saveRule(rule).catch(() => showToast('error', '规则保存到数据库失败'))
    showToast('success', '规则已保存')
  }

  const handleNewRule = () => setShowNewRuleModal(true)

  const handleSaveNewRule = (rule: ParseRule) => {
    const updatedRules = [...rules.filter((r) => r.id !== rule.id), rule]
    onRulesChange(updatedRules)
    setSelectedRuleId(rule.id)
    setShowNewRuleModal(false)
    saveRule(rule).catch(() => showToast('error', '规则保存到数据库失败'))
    showToast('success', '规则已保存')
  }

  const handleDeleteRule = (id: string) => {
    const updatedRules = rules.filter((r) => r.id !== id)
    onRulesChange(updatedRules)
    if (selectedRuleId === id) setSelectedRuleId('')
    deleteRule(id).catch(() => {})
    showToast('info', '规则已删除')
  }

  const handleStartParse = async () => {
    if (!selectedFile || !selectedRuleId) {
      showToast('error', '请先选择文件和解析规则')
      return
    }

    const rule = rules.find((r) => r.id === selectedRuleId)
    if (!rule) {
      showToast('error', '所选规则不存在，请重新选择')
      return
    }

    setParsing(true)
    setParseError(null)
    setProgress(5)
    setProgressText('读取文件中...')

    try {
      const buffer = await readFileAsArrayBuffer(selectedFile)
      const fileType = detectFileType(selectedFile) as FileType

      // Validate file type matches rule type (default to 'excel' if undefined)
      const ruleFileType = rule.fileType || 'excel'
      if (fileType !== ruleFileType) {
        showToast('warning', `文件类型(${fileType})与规则类型(${rule.fileType || '未设置'})不匹配，仍尝试解析`)
      }

      setProgress(20)
      setProgressText('执行解析规则...')

      let rows: OrderRow[] = []

      if (fileType === 'excel') {
        const sheets = parseExcel(buffer)
        let allData: string[][] = sheets[0]?.rows || []
        let sheetRowCounts: number[] | undefined

        const hasMultiSheetMerge = rule.transforms.some((t) => t.type === 'multi_sheet_merge')
        if (hasMultiSheetMerge) {
          allData = sheets.flatMap((s) => s.rows)
          if (sheets.length > 1) {
            sheetRowCounts = sheets.map((s) => s.rows.length)
          }
        }

        if (allData.length === 0) {
          throw new Error('文件中未找到有效数据行（表格为空）')
        }

        setProgress(50)
        const result = executeRule(rule, allData, undefined, sheetRowCounts)
        rows = result.rows
        if (result.errors.length > 0) {
          result.errors.forEach((e) => showToast('warning', e))
        }
      } else if (fileType === 'word') {
        const result = await parseWord(buffer)
        if (result.paragraphs.length === 0) {
          throw new Error('Word 文件内容为空或无法解析')
        }
        const wordData = result.paragraphs.map((p) => [p])
        const engineResult = executeRule(rule, wordData)
        rows = engineResult.rows
      } else if (fileType === 'pdf') {
        const result = await parsePdf(buffer)
        if (result.pages.length === 0) {
          throw new Error('PDF 文件内容为空或无法解析')
        }

        // Use detected tables if available
        let pdfData: string[][]
        if (result.tables.length > 0) {
          pdfData = result.tables.flatMap((t) => t.rows)
        } else {
          const pdfLines = result.fullText.split('\n')
          pdfData = pdfLines.map((line) => [line])
        }

        const engineResult = executeRule(rule, pdfData)
        rows = engineResult.rows
      }

      setProgress(80)
      setProgressText('数据校验中...')

      if (rows.length === 0) {
        setParseError('未能从文件中解析出有效数据。可能原因：1) 规则与文件结构不匹配；2) 文件格式特殊需要调整规则。建议使用 AI 生成规则或手动调整。')
        setParsing(false)
        return
      }

      rows = rows.map((r) => ({
        ...r,
        id: r.id || generateId(),
        skuQuantity: Number(r.skuQuantity) || 0,
      }))

      setProgress(100)
      setProgressText('解析完成')

      onDataImported(rows, rule)
      showToast('success', `解析完成！共 ${rows.length} 条数据`)
      setTimeout(() => onNavigateToPreview(), 600)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误'
      setParseError(msg)
      showToast('error', `解析失败: ${msg}`)
    } finally {
      setParsing(false)
    }
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'excel': return <FileSpreadsheet size={20} className="text-green-600" />
      case 'word': return <FileText size={20} className="text-blue-600" />
      case 'pdf': return <File size={20} className="text-red-600" />
      default: return <File size={20} className="text-gray-400" />
    }
  }

  const selectedRule = rules.find((r) => r.id === selectedRuleId)

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Upload */}
      <div className="card">
        <div className="card-body">
          <div
            className={`el-upload-dragger ${dragActive ? 'is-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.docx,.pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            <Upload size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium text-[#0fc6c2] cursor-pointer">点击上传</span> 或拖拽文件到此区域
            </p>
            <p className="text-xs text-gray-400">支持 .xlsx .xls .docx .pdf</p>
          </div>

          {selectedFile && (
            <div className="mt-3 p-3 bg-gray-50 rounded-[4px] flex items-center gap-3">
              {getFileIcon(detectFileType(selectedFile))}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                {fileInfo && fileInfo.sheets && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fileInfo.sheets.length} 个工作表, {fileInfo.sheets[0]?.rows || '?'} 行数据
                  </p>
                )}
              </div>
              <button onClick={() => { setSelectedFile(null); setFileInfo(null); setParseError(null) }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors">移除</button>
            </div>
          )}
        </div>
      </div>

      {/* Rule Selection */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h2 className="card-title">选择解析规则</h2>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" onClick={handleNewRule} disabled={!selectedFile}>
                <Plus size={14} /> 新建规则
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleAiSuggest} disabled={!selectedFile || aiLoading}>
                {aiLoading ? '分析中...' : 'AI 生成规则'}
              </button>
            </div>
          </div>

          {rules.length === 0 ? (
            <div className="el-empty py-8">
              <AlertCircle size={28} className="mb-3 text-gray-300" />
              <p className="el-empty__title">暂无解析规则</p>
              <p className="el-empty__description">请新建规则或使用 AI 生成规则</p>
              <button className="btn btn-primary btn-sm mt-2" onClick={handleNewRule}>新建规则</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-3 rounded-[4px] border-2 cursor-pointer transition-all group ${
                    selectedRuleId === rule.id
                      ? 'border-[#0fc6c2] bg-[#f0fdfb]'
                      : 'border-[#ebeef5] hover:border-gray-200 bg-white'
                  }`}
                  onClick={() => handleRuleSelect(rule.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800 truncate">{rule.name}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {rule.aiGenerated && <span className="el-tag el-tag--primary" style={{ fontSize: 10 }}>AI</span>}
                      <button
                        className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); handleDeleteRule(rule.id) }}
                        title="删除规则"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {rule.description && <p className="text-xs text-gray-400 truncate">{rule.description}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] el-tag el-tag--info" style={{ padding: '1px 6px' }}>{rule.fileType}</span>
                    <span className="text-[10px] text-gray-400">{rule.fieldMappings.length} 字段</span>
                    <span className="text-[10px] text-gray-400">{rule.transforms.length} 步骤</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Parse Error */}
      {parseError && (
        <div className="el-alert el-alert--error">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">解析失败</p>
            <p className="text-xs mt-1">{parseError}</p>
            <div className="flex gap-2 mt-2">
              <button className="btn btn-ghost btn-sm" onClick={handleAiSuggest}>
                AI 重新生成规则
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleNewRule}>
                手动配置规则
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="card">
        <div className="card-body flex items-center justify-between">
          <div>
            {selectedRule && (
              <span className="text-xs text-gray-500">
                已选规则: <span className="font-medium text-gray-700">{selectedRule.name}</span>
                {selectedRule.transforms.length > 0 && (
                  <span className="ml-2">· {selectedRule.transforms.length} 个处理步骤</span>
                )}
              </span>
            )}
          </div>
          <button
            className="btn btn-primary"
            disabled={!selectedFile || !selectedRuleId || parsing}
            onClick={handleStartParse}
          >
            {parsing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {progressText || '解析中...'} ({progress}%)
              </span>
            ) : (
              '开始解析'
            )}
          </button>
        </div>
        {parsing && (
          <div className="px-5 pb-4">
            <div className="el-progress">
              <div className="el-progress__bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal open={showNewRuleModal} onClose={() => setShowNewRuleModal(false)} title="新建解析规则" width="max-w-4xl">
        <RuleEditor
          initialRule={null}
          filePreview={filePreview}
          onSave={handleSaveNewRule}
          onCancel={() => setShowNewRuleModal(false)}
        />
      </Modal>
      <Modal open={showAiSuggestModal} onClose={() => { setShowAiSuggestModal(false); setAiSuggestion(null) }} title="AI 推荐规则" width="max-w-4xl">
        {aiLoading ? (
          <LoadingSpinner text="AI 正在分析文件结构..." />
        ) : aiSuggestion ? (
          <RuleEditor
            initialRule={aiSuggestion}
            filePreview={filePreview}
            onSave={handleSaveAiRule}
            onCancel={() => { setShowAiSuggestModal(false); setAiSuggestion(null) }}
          />
        ) : null}
      </Modal>
    </div>
  )
}
