export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

export function downloadFile(content: Blob, filename: string) {
  const url = URL.createObjectURL(content)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function detectFileType(file: File): 'excel' | 'word' | 'pdf' | 'unknown' {
  const name = file.name.toLowerCase()
  const ext = name.split('.').pop()

  if (['xlsx', 'xls'].includes(ext || '')) return 'excel'
  if (['docx'].includes(ext || '')) return 'word'
  if (['pdf'].includes(ext || '')) return 'pdf'
  return 'unknown'
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
