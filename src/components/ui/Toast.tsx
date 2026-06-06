'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  message: string
}

let toastListeners: ((toast: ToastItem) => void)[] = []

export function showToast(type: ToastType, message: string) {
  const toast: ToastItem = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    message,
  }
  toastListeners.forEach((fn) => fn(toast))
}

const ICONS = {
  success: <CheckCircle size={18} className="text-green-500" />,
  error: <AlertCircle size={18} className="text-red-500" />,
  warning: <AlertTriangle size={18} className="text-yellow-500" />,
  info: <Info size={18} className="text-cyan-500" />,
}

const COLORS = {
  success: 'border-green-200 bg-green-50',
  error: 'border-red-200 bg-red-50',
  warning: 'border-yellow-200 bg-yellow-50',
  info: 'border-cyan-200 bg-cyan-50',
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    toastListeners.push((toast) => {
      setToasts((prev) => [...prev, toast])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, 4000)
    })
    return () => {
      toastListeners = []
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg animate-slide-in ${COLORS[toast.type]}`}
        >
          <span className="mt-0.5">{ICONS[toast.type]}</span>
          <p className="text-sm text-gray-800 flex-1">{toast.message}</p>
          <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
