import { cn } from '@/lib/utils'

interface BookLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function BookLoader({ size = 'md', className }: BookLoaderProps) {
  const sizeClasses = {
    sm: 'w-8 h-6',
    md: 'w-14 h-10',
    lg: 'w-20 h-14',
  }

  return (
    <div
      className={cn(
        'relative [perspective:800px]',
        sizeClasses[size],
        className
      )}
      aria-label="Loading"
    >
      <div className="absolute inset-0 rounded-r-sm bg-[#5C53CD] shadow-lg" />
      <div className="absolute left-0 inset-y-0 w-[12%] rounded-l-sm bg-[#3A32A0]" />

      <div className="absolute left-[12%] right-0 inset-y-[6%]">
        <div className="relative h-full">
          <div className="absolute inset-0 bg-white rounded-r-sm" />
          <div className="absolute inset-0 bg-white rounded-r-sm origin-left animate-flip [backface-visibility:hidden] [transform-style:preserve-3d]" />
          <div className="absolute inset-0 bg-white rounded-r-sm origin-left animate-flip [backface-visibility:hidden] [transform-style:preserve-3d] [animation-delay:0.4s]" />
          <div className="absolute inset-0 bg-white rounded-r-sm origin-left animate-flip [backface-visibility:hidden] [transform-style:preserve-3d] [animation-delay:0.8s]" />
          <div className="absolute inset-0 bg-white rounded-r-sm origin-left animate-flip [backface-visibility:hidden] [transform-style:preserve-3d] [animation-delay:1.2s]" />
        </div>
      </div>

      <div className="absolute inset-0 rounded-r-sm bg-[#746BF3] origin-left animate-bookCover [backface-visibility:hidden] [transform-style:preserve-3d]" />
    </div>
  )
}

export function PageLoaderBook() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <BookLoader size="lg" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  )
}

export function LoadingOverlayBook({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="flex flex-col items-center gap-4 rounded-lg bg-white p-8 shadow-lg">
        <BookLoader size="lg" />
        <p className="text-sm font-medium text-gray-600">{message}</p>
      </div>
    </div>
  )
}
