import { Link } from 'react-router-dom'
import { Calendar, Users, CheckCircle, FileText, BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

export default function AttendancePage() {
  const features = [
    { title: 'Mark Attendance', href: '/education/attendance/mark', icon: CheckCircle, color: 'bg-green-500' },
    { title: 'View Records', href: '/education/attendance/list', icon: Calendar, color: 'bg-blue-500' },
    { title: 'Sessions', href: '/education/attendance/sessions', icon: Users, color: 'bg-purple-500' },
    { title: 'Summary', href: '/education/attendance/summary', icon: BarChart3, color: 'bg-orange-500' },
    { title: 'Dashboard', href: '/education/attendance/dashboard', icon: BarChart3, color: 'bg-indigo-500' },
    { title: 'Reports', href: '/education/attendance/reports', icon: FileText, color: 'bg-red-500' },
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Attendance Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => (
          <Link key={f.title} to={f.href}>
            <Card className="hover:shadow-lg cursor-pointer">
              <CardContent className="pt-6">
                <div className={`${f.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
