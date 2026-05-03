import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { useState, useRef } from 'react'
import { theme } from '@/styles/themes'

interface MenuItem {
  name: string
  href: string
  icon: any
  subItems?: MenuItem[]
}

interface MenuDropdownProps {
  items: MenuItem[]
  onClose: () => void
  isActive: (href: string) => boolean
  moduleTheme: { main: string; light: string; hover: string; border: string }
  level?: number
}

export function MenuDropdown({ items, onClose, isActive, moduleTheme, level = 0 }: MenuDropdownProps) {
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getLevelColor = () => {
    if (level === 0) return moduleTheme.main
    if (level === 1) return moduleTheme.hover
    return moduleTheme.border
  }

  const handleMouseEnter = (name: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpenSubMenu(name)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpenSubMenu(null)
    }, 200)
  }

  return (
    <div className="py-2">
      {items.map((item) => (
        <div key={item.name} className="relative">
          {item.subItems && item.subItems.length > 0 ? (
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter(item.name)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" style={{ color: getLevelColor() }} />
                  <span style={{ color: moduleTheme.hover }}>{item.name}</span>
                </div>
                <ChevronRight className="w-3 h-3" style={{ color: moduleTheme.main }} />
              </div>
              {openSubMenu === item.name && (
                <div 
                  className="absolute left-full top-0 ml-1 w-64 bg-white rounded-lg shadow-xl border z-50 py-2"
                  style={{ borderTop: '2px solid ' + moduleTheme.main }}
                  onMouseEnter={() => handleMouseEnter(item.name)}
                  onMouseLeave={handleMouseLeave}
                >
                  <MenuDropdown 
                    items={item.subItems} 
                    onClose={onClose} 
                    isActive={isActive}
                    moduleTheme={moduleTheme}
                    level={level + 1}
                  />
                </div>
              )}
            </div>
          ) : (
            <Link
              to={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 py-2 text-sm block transition-colors",
                isActive(item.href) 
                  ? "border-l-4 font-medium" 
                  : "hover:bg-gray-50"
              )}
              style={isActive(item.href) ? { 
                backgroundColor: moduleTheme.light, 
                color: moduleTheme.hover,
                borderLeftColor: moduleTheme.main 
              } : { color: moduleTheme.hover }}
            >
              <item.icon className="w-4 h-4" style={{ color: getLevelColor() }} />
              {item.name}
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}
