import mammoth from 'mammoth'

export interface WordParseResult {
  html: string
  text: string
  paragraphs: string[]
}

export async function parseWord(buffer: ArrayBuffer): Promise<WordParseResult> {
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
  const html = result.value

  // Also get raw text
  const textResult = await mammoth.extractRawText({ arrayBuffer: buffer })
  const text = textResult.value

  const paragraphs = text
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  return { html, text, paragraphs }
}
