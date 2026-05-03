import { useState, useCallback, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from './Input'
import { Button } from './Button'

interface SearchFilterProps {
  placeholder?: string
  onSearch: (query: string) => void
  onClear?: () => void
  debounceMs?: number
  className?: string
}

export function SearchFilter({
  placeholder = 'Search...',
  onSearch,
  onClear,
  debounceMs = 300,
  className = '',
}: SearchFilterProps) {
  const [query, setQuery] = useState('')

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        onSearch(query)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs, onSearch])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }, [])

  const handleClear = useCallback(() => {
    setQuery('')
    onClear?.()
  }, [onClear])

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleChange}
          className="pl-9 pr-10"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

interface FilterOption {
  value: string | number
  label: string
}

interface FilterBarProps {
  filters: {
    key: string
    label: string
    type: 'search' | 'select' | 'date' | 'dateRange'
    options?: FilterOption[]
    placeholder?: string
  }[]
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  onReset?: () => void
  className?: string
}

export function FilterBar({
  filters,
  values,
  onChange,
  onReset,
  className = '',
}: FilterBarProps) {
  const hasFilters = Object.values(values).some(
    (v) => v !== undefined && v !== null && v !== ''
  )

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {filters.map((filter) => (
        <div key={filter.key} className="min-w-[150px]">
          {filter.type === 'search' && (
            <Input
              type="text"
              placeholder={filter.placeholder || filter.label}
              value={(values[filter.key] as string) || ''}
              onChange={(e) => onChange(filter.key, e.target.value)}
            />
          )}
          {filter.type === 'select' && (
            <select
              value={(values[filter.key] as string) || ''}
              onChange={(e) => onChange(filter.key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{filter.placeholder || `Select ${filter.label}`}</option>
              {filter.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
      {hasFilters && onReset && (
        <Button variant="outline" size="sm" onClick={onReset}>
          Clear Filters
        </Button>
      )}
    </div>
  )
}