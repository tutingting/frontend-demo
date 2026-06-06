import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '智能批量下单系统',
  description: '智能多格式批量下单系统 - 物流/快递行业',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
