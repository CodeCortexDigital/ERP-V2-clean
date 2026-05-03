import { useState } from 'react'
import { Plus, Eye, Edit, Trash2, Award, Clock, Video, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface TrainingProgram {
  id: number
  title: string
  provider: string
  start_date: string
  end_date: string
  duration_hours: number
  mode: 'online' | 'in_person' | 'hybrid'
  participants: number
  status: 'upcoming' | 'ongoing' | 'completed'
  certificate_issued: boolean
}

const SAMPLE_PROGRAMS: TrainingProgram[] = [
  { id: 1, title: 'Advanced Teaching Methodologies', provider: 'Higher Education Commission', start_date: '2024-03-20', end_date: '2024-03-22', duration_hours: 18, mode: 'in_person', participants: 45, status: 'upcoming', certificate_issued: false },
  { id: 2, title: 'Digital Learning Tools', provider: 'Microsoft Education', start_date: '2024-02-10', end_date: '2024-02-15', duration_hours: 24, mode: 'online', participants: 120, status: 'completed', certificate_issued: true },
]

export default function ProfessionalDevelopment() {
  const [programs] = useState(SAMPLE_PROGRAMS)
  const safePrograms = programs || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Professional Development</h1>
          <p className="text-gray-500">Manage training programs and faculty development</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Program
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program Title</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {safePrograms.map((program) => (
              <tr key={program.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{program.title}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{program.provider}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{program.start_date} → {program.end_date}</td>
                <td className="px-4 py-3 text-sm text-center text-gray-500">{program.duration_hours}h</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    {program.mode === 'online' && <Video className="h-4 w-4" />}
                    {program.mode === 'in_person' && <MapPin className="h-4 w-4" />}
                    {program.mode}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-500">{program.participants}</td>
                <td className="px-4 py-3 text-sm">
                  <Badge variant={program.status === 'upcoming' ? 'warning' : program.status === 'ongoing' ? 'info' : 'success'}>
                    {program.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  {program.certificate_issued ? (
                    <Award className="h-5 w-5 text-green-500 mx-auto" />
                  ) : (
                    <Clock className="h-5 w-5 text-gray-400 mx-auto" />
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  <div className="flex justify-center gap-2">
                    <button className="text-blue-600 hover:text-blue-800">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-green-600 hover:text-green-800">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-800">
                      <Trash2 className="h-4 w-4" />
                    </button>
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
