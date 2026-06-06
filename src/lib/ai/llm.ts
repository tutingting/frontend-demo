import type { AiRuleSuggestion, FileType } from '@/types'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function callLLM(messages: ChatMessage[], temperature = 0.3): Promise<string> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)

    const res = await fetch('/api/ai/generate-rule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, temperature }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || `AI服务暂时不可用 (${res.status})`)
    }

    const data = await res.json()
    return data.choices[0].message.content
  } catch (err) {
    console.error('LLM call failed:', err)
    throw err
  }
}

function buildRuleGenerationPrompt(
  fileType: FileType,
  fileName: string,
  filePreview: string,
  requiredFields: string[]
): ChatMessage[] {
  const systemPrompt = `你是一个智能解析规则生成器。你需要分析上传的文件结构，然后生成一套解析规则，将文件内容提取为结构化的订单数据。

目标字段说明：
- externalCode (外部编码，可选)
- storeName (收货门店)
- receiverName (收件人姓名)
- receiverPhone (收件人电话)
- receiverAddress (收件人地址)
- skuCode (SKU编码，必填)
- skuName (SKU名称，必填)
- skuQuantity (发货数量，必填，正数)
- skuSpec (规格型号，可选)
- remark (备注，可选)

注意 A组/B组规则：
- A组(门店模式)：只需 storeName，不需要 receiverName/phone/address
- B组(收件人模式)：需要 receiverName + receiverPhone + receiverAddress，不需要 storeName
- 两组都填也可以，但至少需要填一组

可用的转换步骤类型：
- skip_rows: 跳过头部N行，params: { count: number }
- header_row: 指定表头所在行号，params: { row: number }
- footer_extract: 从尾部提取信息，params: { patterns: {key: string, regex: string}[] }
- group_concat: 按某字段聚合，params: { groupBy: string, sharedFields: string[] }
- matrix_transpose: 矩阵转置（每个门店列变成一行），params: { rowIdentifierCol: string, columnStartIdx: number, valueColumns: string[] }
  ⚠️ 注意：只有当每一行是一个商品，且每个门店的数量分布在不同列中，需要把列转成行时才用。
  如果不需要把列转为行，只是要把多个列的值加起来作为总数量，请用 column_sum 而不是 matrix_transpose。
- multi_sheet_merge: 多Sheet合并，params: { sheetNames?: string[], allSheets: boolean }
- card_split: 卡片式拆分，params: { startPattern: string, headerLines: number }
- text_parse: 纯文本解析，params: { recordSeparator: string, linePatterns: Record<string, string> }
- cell_split: 复合单元格拆分，params: { column: string, separator: string }
- column_sum: 多列求和（如各门店分配数量合计为发货数量），params: { targetField: string, sourceColumns: string[] }
  适用于：一行是一条商品记录，多个门店列（如银泰、金桥、门店B）的数量需要加起来作为发货数量。
- column_mapping: 列映射，params: { mappings: {source: string, target: string, confidence: number}[] }
- default_value: 设置默认值，params: { field: string, value: string }
- static_value: 静态值，params: { field: string, value: string }

请严格按照以下JSON格式返回解析规则，不要包含其他文字：
{
  "ruleName": "规则名称",
  "description": "规则描述",
  "transforms": [...],
  "fieldMappings": [
    {
      "targetField": "字段名",
      "sourceColumn": "源列名/列标题",
      "defaultValue": null,
      "isRequired": true/false,
      "fromFooter": true/false,
      "footerKey": null,
      "aiConfidence": 0.0-1.0
    }
  ],
  "confidence": 0.0-1.0,
  "notes": ["注意点1", "注意点2"]
}`

  const userPrompt = `文件类型: ${fileType}
文件名: ${fileName}
目标字段: ${requiredFields.join(', ')}

文件内容预览（前3000字符）:
${filePreview}

请分析这份文件的结构，生成合适的解析规则。注意：
1. 不要硬编码具体列名，用列标题或列号描述
2. 对于置信度低的映射标注 low confidence
3. 如果文件有特殊结构（如矩阵、卡片式），使用对应的transform步骤`

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]
}

export async function generateRule(
  fileType: FileType,
  fileName: string,
  filePreview: string,
  requiredFields: string[]
): Promise<AiRuleSuggestion> {
  const messages = buildRuleGenerationPrompt(fileType, fileName, filePreview, requiredFields)
  const response = await callLLM(messages)

  try {
    const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed: AiRuleSuggestion = JSON.parse(cleaned)
    return parsed
  } catch {
    return {
      ruleName: `AI建议_${fileName}`,
      description: 'AI自动分析生成的规则',
      fileType,
      transforms: [{ type: 'header_row', params: { row: 1 } }],
      fieldMappings: [],
      confidence: 0,
      notes: ['AI响应解析失败，请手动配置规则'],
    }
  }
}

// Helper: extract text preview from file content for AI analysis
export function generateFilePreview(
  fileType: FileType,
  rawContent: string[][],
  pdfText?: string
): string {
  if (fileType === 'pdf' && pdfText) {
    return sanitizePreview(pdfText.slice(0, 2000))
  }

  const lines = rawContent.map((row, i) => `[行${i + 1}] ${row.join('\t')}`)
  return sanitizePreview(lines.slice(0, 30).join('\n').slice(0, 2000))
}

// Strip chars that could break JSON serialization in downstream API calls
function sanitizePreview(text: string): string {
  return text
    // Remove non-printable control chars (keep \n \t \r)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    // Replace backslash with safe alternative to avoid JSON escape issues
    .replace(/\\/g, '/')
}
