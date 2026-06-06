import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.AI_API_BASE_URL || 'https://api.deepseek.com'
const API_KEY = process.env.AI_API_KEY || ''
const MODEL = process.env.AI_MODEL || 'deepseek-chat'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const messages = body.messages
    const temperature = body.temperature ?? 0.3

    if (!API_KEY) {
      return NextResponse.json({
        choices: [{
          message: {
            content: JSON.stringify({
              ruleName: '手动规则',
              description: '请配置 API Key 后使用 AI 生成功能',
              fileType: 'excel',
              transforms: [{ type: 'header_row', params: { row: 1 } }],
              fieldMappings: [],
              confidence: 0,
              notes: ['未配置 API Key，请设置 AI_API_KEY 环境变量'],
            }),
          },
        }],
      })
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: '无效的消息格式' }, { status: 400 })
    }

    // Sanitize: replace backslash with forward slash to prevent JSON escape issues
    // Excel files often contain raw escape sequences (\xNN) that break JSON parsing
    function sanitize(str: string): string {
      return str.replace(/\\/g, '/')
    }

    const trimmedMessages = messages.map((msg: any, idx: number) => {
      let content = typeof msg.content === 'string' ? msg.content : String(msg.content || '')
      // Trim length
      if (content.length > 12000) content = content.slice(0, 12000) + '...(truncated)'
      // Only sanitize user messages (contain file preview) - keep system prompt intact
      if (idx > 0) content = sanitize(content)
      return { ...msg, content }
    })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    // Build body manually to avoid JSON.stringify issues with certain chars
    const bodyObj = {
      model: MODEL,
      messages: trimmedMessages,
      temperature,
      max_tokens: 4096,
    }

    const res = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(bodyObj),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`DeepSeek error ${res.status}:`, errorText.slice(0, 1000))
      return NextResponse.json(
        { error: `AI API 请求失败 (${res.status})` },
        { status: 502 }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('LLM call failed:', err)
    const msg = err instanceof Error ? err.message : '未知错误'
    return NextResponse.json(
      { error: `AI 调用失败: ${msg}` },
      { status: 500 }
    )
  }
}
