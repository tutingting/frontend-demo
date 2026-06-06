// PDF.js dynamic import for browser compatibility
export interface PdfParseResult {
  pages: {
    pageNumber: number
    text: string
    items: { text: string; x: number; y: number; fontSize?: number }[]
  }[]
  fullText: string
  tables: { pageNumber: number; rows: string[][] }[]
}

let pdfjsLib: any = null

async function getPdfJs() {
  if (!pdfjsLib) {
    const pdfjs = await import('pdfjs-dist')
    // Use local worker from public/ directory
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
    pdfjsLib = pdfjs
  }
  return pdfjsLib
}

export async function parsePdf(buffer: ArrayBuffer): Promise<PdfParseResult> {
  const pdfjs = await getPdfJs()
  const loadingTask = pdfjs.getDocument({ data: buffer })
  const pdf = await loadingTask.promise

  const pages: PdfParseResult['pages'] = []
  const fullTextParts: string[] = []
  const tables: PdfParseResult['tables'] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const tokenizedText = await page.getTextContent()
    const viewport = page.getViewport({ scale: 1 })

    const items = tokenizedText.items.map((item: any) => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      fontSize: Math.round((item.transform[0] || 0) * 100) / 100,
      width: item.width || 0,
    }))

    // Group by y-position to form lines
    const lineMap = new Map<number, { texts: { text: string; x: number }[]; y: number }>()
    const yTolerance = Math.max(viewport.height * 0.012, 3)

    for (const item of items) {
      if (!item.text.trim()) continue
      let found = false
      for (const [key, line] of lineMap) {
        if (Math.abs(item.y - line.y) <= yTolerance) {
          line.texts.push({ text: item.text, x: item.x })
          found = true
          break
        }
      }
      if (!found) {
        const key = Math.round(item.y / yTolerance) * yTolerance
        lineMap.set(key, { texts: [{ text: item.text, x: item.x }], y: item.y })
      }
    }

    // Sort lines by y (top to bottom), items by x (left to right)
    const sortedLines = Array.from(lineMap.entries())
      .sort((a, b) => b[1].y - a[1].y) // PDF y is inverted (top=high)
      .map(([, line]) => {
        line.texts.sort((a, b) => a.x - b.x)
        return line.texts.map((t) => t.text).join('')
      })

    const pageText = sortedLines.join('\n')
    pages.push({
      pageNumber: i,
      text: pageText,
      items: items.map((item: { text: string; x: number; y: number }) => ({ text: item.text, x: item.x, y: item.y })),
    })
    fullTextParts.push(`=== 第${i}页 ===\n${pageText}`)

    // Detect tables: look for repeating patterns of aligned text
    if (sortedLines.length > 5) {
      const tableRows: string[][] = []
      let inTable = false
      for (const line of sortedLines) {
        // Check if line looks like a table row (contains multiple segments with spaces/tabs)
        const trimmed = line.trim()
        if (!trimmed) {
          if (inTable) inTable = false
          continue
        }
        // Use regex to split on multiple spaces (2+)
        const cells = trimmed.split(/\s{2,}|\t/).filter(Boolean)
        if (cells.length >= 3) {
          inTable = true
          tableRows.push(cells)
        } else if (inTable && cells.length >= 2) {
          tableRows.push(cells)
        } else {
          inTable = false
        }
      }
      if (tableRows.length >= 3) {
        tables.push({ pageNumber: i, rows: tableRows })
      }
    }
  }

  return {
    pages,
    fullText: fullTextParts.join('\n\n'),
    tables,
  }
}
