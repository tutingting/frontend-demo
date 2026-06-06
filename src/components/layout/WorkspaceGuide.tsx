'use client'

import { Upload, ClipboardList, Send, Package, ArrowRight } from 'lucide-react'

export default function WorkspaceGuide() {
  return (
    <div className="card mb-6 overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-[#0fc6c2]/5 to-transparent border-b border-[#ebeef5]">
        <h2 className="text-base font-semibold text-gray-800">欢迎使用智能批量下单系统</h2>
        <p className="text-xs text-gray-500 mt-1">
          只需 4 步，即可完成批量下单。以下是完整的操作流程：
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#ebeef5]">
        <div className="p-5">
          <div className="w-9 h-9 rounded-full bg-[#0fc6c2]/10 flex items-center justify-center mb-3">
            <span className="text-sm font-bold text-[#0fc6c2]">1</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
            <Upload size={14} className="text-[#0fc6c2]" /> 导入文件
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            上传 Excel、Word 或 PDF 格式的文件。支持拖拽或点击上传，选择或创建解析规则。
          </p>
        </div>

        <div className="p-5">
          <div className="w-9 h-9 rounded-full bg-[#0fc6c2]/10 flex items-center justify-center mb-3">
            <span className="text-sm font-bold text-[#0fc6c2]">2</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
            <ClipboardList size={14} className="text-[#0fc6c2]" /> 预览编辑
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            检查解析结果是否正确。可在表格中直接编辑修改数据，修正错误项。
          </p>
        </div>

        <div className="p-5">
          <div className="w-9 h-9 rounded-full bg-[#0fc6c2]/10 flex items-center justify-center mb-3">
            <span className="text-sm font-bold text-[#0fc6c2]">3</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
            <Send size={14} className="text-[#0fc6c2]" /> 提交下单
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            将数据提交到系统。系统会自动校验数据完整性，生成运单记录。
          </p>
        </div>

        <div className="p-5">
          <div className="w-9 h-9 rounded-full bg-[#0fc6c2]/10 flex items-center justify-center mb-3">
            <span className="text-sm font-bold text-[#0fc6c2]">4</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
            <Package size={14} className="text-[#0fc6c2]" /> 运单列表
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            查看所有已提交的运单记录，支持按门店、收件人等字段搜索查询。
          </p>
        </div>
      </div>
    </div>
  )
}
