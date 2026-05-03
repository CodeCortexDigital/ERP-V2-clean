import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Calendar, 
  FileText,
  DollarSign,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  GraduationCap,
  ClipboardList,
  Wallet,
  Mail,
  BarChart3
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/education/students', icon: Users },
  { name: 'Courses', href: '/education/courses', icon: BookOpen },
  { name: 'Exams', href: '/education/exams', icon: FileText },
  { name: 'Attendance', href: '/education/attendance', icon: Calendar },
  { name: 'Academics', href: '/education/academics', icon: GraduationCap },
  { name: 'Admissions', href: '/education/admissions', icon: ClipboardList },
  { name: 'Finance', href: '/education/finance', icon: DollarSign },
  { name: 'Communication', href: '/education/communication', icon: MessageSquare },
  { name: 'Analytics', href: '/education/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isActive = (href: string) => location.pathname === href

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Header */}
      <div className="bg-blue-700 text-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <span className="font-bold text-xl">CC</span>
              </div>
              <div>
                <h1 className="font-bold text-xl">Code Cortex</h1>
                <p className="text-white/70 text-xs">School Management System</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="text-white/80 hover:text-white">
                <Bell className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {user?.email?.[0]?.toUpperCase() || 'A'}
                  </span>
                </div>
                <span className="text-sm hidden md:block">
                  {user?.email?.split('@')[0] || 'Admin'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="lg:hidden bg-white border-b px-4 py-2">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex min-h-[calc(100vh-80px)]">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white shadow-sm overflow-y-auto">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition",
                  isActive(item.href) && "bg-blue-50 text-blue-600 font-medium"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            ))}
            <div className="border-t my-4 pt-4">
              <button
                onClick={logout}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition w-full"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <span className="font-bold text-xl text-blue-700">Code Cortex</span>
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="p-4 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition",
                      isActive(item.href) && "bg-blue-50 text-blue-600 font-medium"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                ))}
                <div className="border-t my-4 pt-4">
                  <button
                    onClick={() => { logout(); setSidebarOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition w-full"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
