import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { cn } from '../../lib/utils'

// Tabs Context
interface TabsContextValue {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined)

interface TabsProps {
  defaultValue?: string
  children: ReactNode
  className?: string
  onChange?: (value: string) => void
  value?: string
  onValueChange?: (value: string) => void
}

export function Tabs({ defaultValue, value, children, className, onChange, onValueChange }: TabsProps) {
  const [activeTab, setActiveTab] = useState(value ?? defaultValue ?? '')

  useEffect(() => {
    if (value !== undefined) {
      setActiveTab(value)
    }
  }, [value])

  const handleSetActiveTab = (tab: string) => {
    if (value === undefined) {
      setActiveTab(tab)
    }
    onChange?.(tab)
    onValueChange?.(tab)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleSetActiveTab }}>
      <div className={cn('', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: ReactNode
  className?: string
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      className={cn(
        'flex border-b border-gray-200 space-x-1',
        className
      )}
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')

  const isActive = context.activeTab === value

  return (
    <button
      onClick={() => context.setActiveTab(value)}
      className={cn(
        'px-4 py-2 text-sm font-medium text-gray-600 border-b-2 border-transparent transition-colors',
        'hover:text-gray-900 hover:border-gray-300',
        isActive && 'text-blue-600 border-blue-600',
        className
      )}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')

  if (context.activeTab !== value) return null

  return (
    <div className={cn('mt-4', className)}>
      {children}
    </div>
  )
}

// Alternative simple tabs without context
interface SimpleTabsProps {
  tabs: { id: string; label: string; icon?: ReactNode }[]
  activeTab: string
  onChange: (tab: string) => void
  className?: string
}

export function SimpleTabs({ tabs, activeTab, onChange, className }: SimpleTabsProps) {
  return (
    <div className={cn('flex border-b border-gray-200', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            'hover:text-gray-900',
            activeTab === tab.id
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}