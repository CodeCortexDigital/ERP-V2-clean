import { useState, useCallback, useEffect } from 'react'

interface AsyncState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
}

interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

export function useAsync<T>(initialData: T | null = null, options?: UseAsyncOptions<T>) {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    isLoading: false,
    error: null,
  })

  const execute = useCallback(async (fn: () => Promise<T>) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const result = await fn()
      setState({ data: result, isLoading: false, error: null })
      options?.onSuccess?.(result)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }))
      options?.onError?.(error as Error)
      throw error
    }
  }, [options])

  const reset = useCallback(() => {
    setState({ data: initialData, isLoading: false, error: null })
  }, [initialData])

  return { ...state, execute, reset }
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      return initialValue
    }
  })

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }

  return [storedValue, setValue] as const
}