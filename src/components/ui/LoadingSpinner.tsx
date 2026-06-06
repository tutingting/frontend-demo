'use client'

interface LoadingSpinnerProps {
  size?: number
  text?: string
}

export default function LoadingSpinner({ size = 24, text }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div
        className="border-[3px] border-gray-200 border-t-[#0fc6c2] rounded-full animate-spin"
        style={{ width: size, height: size }}
      />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  )
}
