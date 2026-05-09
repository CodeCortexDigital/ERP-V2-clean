import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Edit, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface Timetable {
  id: number
  name: string
  type: 'class' | 'teacher'
  associated_with: string
  total_periods: number
  status: 'active' | 'draft' | 'archived'
  created_date: string
  last_modified: string
}

const SAMPLE_TIMETABLES: Timetable[] = [
  { id: 1, name: 'Class 9-A Timetable', type: 'class', associated_with: '9-A', total_periods: 8, status: 'active', created_date: '2026-01-15', last_modified: '2026-05-08' },
  { id: 2, name: 'Class 9-B Timetable', type: 'class', associated_with: '9-B', total_periods: 8, status: 'active', created_date: '2026-01-15', last_modified: '2026-05-07' },
  { id: 3, name: 'Class 10-A Timetable', type: 'class', associated_with: '10-A', total_periods: 9, status: 'active', created_date: '2026-02-01', last_modified: '2026-05-06' },
  { id: 4, name: 'Dr. Ahmed Raza Timetable', type: 'teacher', associated_with: 'TCH-001', total_periods: 18, status: 'active', created_date: '2026-03-10', last_modified: '2026-05-09' },
  { id: 5, name: 'Prof. Sara Khan Timetable', type: 'teacher', associated_with: 'TCH-002', total_periods: 16, status: 'active', created_date: '2026-03-10', last_modified: '2026-05-05' },
]

export default function TimetableManagement() {
  const navigate = useNavigate()
  const [timetables, setTimetables] = useState(SAMPLE_TIMETABLES)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTimetables = useMemo(() => {
    if (!searchQuery) return timetables
    const term = searchQuery.toLowerCase()
    return timetables.filter((tt) =>
      tt.name.toLowerCase().includes(term) ||
      tt.associated_with.toLowerCase().includes(term) ||
      tt.type.toLowerCase().includes(term)
    )
  }, [searchQuery, timetables])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable Management</h1>
          <p className="text-gray-500">Create and manage class and teacher timetables</p>
        </div>
        <Button onClick={() => navigate('/education/timetable/editor')}>
          <Plus className="h-4 w-4 mr-2" />Create Timetable
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700">{timetables.length}</p>
          <p className="text-xs text-gray-600">Total Timetables</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-700">{timetables.filter(t => t.type === 'class').length}</p>
          <p className="text-xs text-gray-600">Class Timetables</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700">{timetables.filter(t => t.type === 'teacher').length}</p>
          <p className="text-xs text-gray-600">Teacher Timetables</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Badge variant="success" className="text-xs">Active</Badge>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{timetables.filter(t => t.status === 'active').length}</p>
          <p className="text-xs text-gray-600">Active Status</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-1/2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search timetables"
            className="pl-10"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Timetable Name</th>
              <th className="px-4 py-3 font-medium text-gray-700">Type</th>
              <th className="px-4 py-3 font-medium text-gray-700">Associated With</th>
              <th className="px-4 py-3 font-medium text-gray-700">Periods</th>
              <th className="px-4 py-3 font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 font-medium text-gray-700">Last Modified</th>
              <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTimetables.map((tt) => (
              <tr key={tt.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-slate-900">{tt.name}</td>
                <td className="px-4 py-3">
                  <Badge variant={tt.type === 'class' ? 'secondary' : 'outline'}>
                    {tt.type === 'class' ? 'Class' : 'Teacher'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-900">{tt.associated_with}</td>
                <td className="px-4 py-3 text-slate-900">{tt.total_periods}</td>
                <td className="px-4 py-3">
                  <Badge variant={tt.status === 'active' ? 'success' : tt.status === 'draft' ? 'warning' : 'secondary'}>
                    {tt.status.charAt(0).toUpperCase() + tt.status.slice(1)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{tt.last_modified}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate('/education/timetable/view')}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate('/education/timetable/editor')}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
