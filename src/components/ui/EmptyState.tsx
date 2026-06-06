'use client'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon && <div className="text-gray-300 mb-4">{icon}</div>}
      <h3 className="text-base font-medium text-gray-600 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 mb-4 text-center max-w-md">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}
