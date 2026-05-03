import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeClasses[size],
        className
      )}
    />
  )
}

export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="flex flex-col items-center gap-4 rounded-lg bg-white p-8 shadow-lg">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-gray-600">{message}</p>
      </div>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  )
}

export function TableLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner size="md" />
    </div>
  )
}