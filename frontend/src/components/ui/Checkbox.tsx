import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="checkbox"
            id={id}
            className="peer sr-only"
            ref={ref}
            {...props}
          />
          <label
            htmlFor={id}
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded border border-input bg-background transition-colors',
              'peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground',
              'hover:border-primary/50 hover:bg-accent',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-destructive',
              className
            )}
          >
            <Check className="h-3.5 w-3.5 text-current" />
          </label>
        </div>
        {label && (
          <label htmlFor={id} className="text-sm text-gray-700 cursor-pointer">
            {label}
          </label>
        )}
      </div>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }