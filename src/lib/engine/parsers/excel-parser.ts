import * as XLSX from 'xlsx'

export interface SheetData {
  name: string
  rows: string[][]
  maxCols: number
}

export function parseExcel(buffer: ArrayBuffer): SheetData[] {
  const workbook = XLSX.read(buffer, { type: 'array', codepage: 65001 })
  const sheets: SheetData[] = []

  workbook.SheetNames.forEach((name) => {
    const sheet = workbook.Sheets[name]
    const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: '',
      blankrows: true,
    })

    // Filter empty sheets
    const rows = jsonData.filter((row) => row.some((cell) => cell !== ''))
    if (rows.length === 0) return

    const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0)

    sheets.push({
      name,
      rows: rows.map((row) => {
        // Pad rows to maxCols
        const padded = [...row]
        while (padded.length < maxCols) padded.push('')
        return padded
      }),
      maxCols,
    })
  })

  return sheets
}

export function parseExcelSingleSheet(buffer: ArrayBuffer): string[][] {
  const sheets = parseExcel(buffer)
  return sheets[0]?.rows || []
}
