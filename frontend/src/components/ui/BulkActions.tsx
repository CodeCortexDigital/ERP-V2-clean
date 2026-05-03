import { useState } from 'react'
import { Trash2, Download, MoreHorizontal, Edit, Archive } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

interface BulkAction {
  id: string
  label: string
  icon: React.ElementType
  onClick: (ids: number[]) => void
  variant?: 'default' | 'destructive'
}

interface BulkActionsBarProps {
  selectedIds: number[]
  onClearSelection: () => void
  actions?: BulkAction[]
}

export function BulkActionsBar({
  selectedIds,
  onClearSelection,
  actions = defaultActions,
}: BulkActionsBarProps) {
  if (selectedIds.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-lg border bg-white px-4 py-2 shadow-lg">
      <span className="text-sm font-medium text-gray-900">
        {selectedIds.length} selected
      </span>
      <div className="h-4 w-px bg-gray-200" />
      {actions.map((action) => (
        <Button
          key={action.id}
          variant={action.variant === 'destructive' ? 'ghost' : 'outline'}
          size="sm"
          onClick={() => action.onClick(selectedIds)}
          className={cn(
            action.variant === 'destructive' && 'text-destructive hover:text-destructive'
          )}
        >
          <action.icon className="h-4 w-4 mr-1" />
          {action.label}
        </Button>
      ))}
      <Button variant="ghost" size="sm" onClick={onClearSelection}>
        Clear
      </Button>
    </div>
  )
}

const defaultActions: BulkAction[] = [
  {
    id: 'edit',
    label: 'Edit',
    icon: Edit,
    onClick: (ids) => console.log('Edit', ids),
  },
  {
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    onClick: (ids) => console.log('Archive', ids),
  },
  {
    id: 'export',
    label: 'Export',
    icon: Download,
    onClick: (ids) => console.log('Export', ids),
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    onClick: (ids) => console.log('Delete', ids),
    variant: 'destructive',
  },
]

interface RowActionsMenuProps {
  actions: {
    label: string
    icon: React.ElementType
    onClick: () => void
    variant?: 'default' | 'destructive'
  }[]
}

export function RowActionsMenu({ actions }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="h-8 w-8 p-0"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-1 w-48 rounded-md border bg-white py-1 shadow-lg">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.onClick()
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100',
                  action.variant === 'destructive' && 'text-destructive'
                )}
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}