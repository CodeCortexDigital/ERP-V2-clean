import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, X, Plus, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'

interface ScheduleCell {
  id: string
  day: string
  period_number: number
  subject?: string
  teacher?: string
  room?: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const PERIODS = Array.from({ length: 8 }, (_, i) => i + 1)

const SAMPLE_SUBJECTS = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Urdu', 'Islamiyat', 'P.E', 'Computer Science']
const SAMPLE_TEACHERS = ['Dr. Ahmed Raza', 'Prof. Sara Khan', 'Mr. Hassan Ali', 'Ms. Fatima Khan', 'Dr. Usman Malik']
const SAMPLE_ROOMS = ['A-101', 'A-102', 'A-103', 'Lab-01', 'Lab-02', 'Lab-03', 'Lab-04', 'Ground']

interface EditingCell {
  day: string
  period: number
}

export default function TimetableEditorPage() {
  const navigate = useNavigate()
  const [timetable, setTimetable] = useState<ScheduleCell[]>([
    { id: '1', day: 'Monday', period_number: 1, subject: 'English', teacher: 'Prof. Sara Khan', room: 'A-101' },
    { id: '2', day: 'Monday', period_number: 2, subject: 'Mathematics', teacher: 'Dr. Ahmed Raza', room: 'A-102' },
  ])
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editingData, setEditingData] = useState({ subject: '', teacher: '', room: '' })

  const handleCellClick = (day: string, period: number) => {
    const cell = timetable.find(c => c.day === day && c.period_number === period)
    setEditingCell({ day, period })
    if (cell) {
      setEditingData({
        subject: cell.subject || '',
        teacher: cell.teacher || '',
        room: cell.room || '',
      })
    } else {
      setEditingData({ subject: '', teacher: '', room: '' })
    }
  }

  const handleSaveCell = () => {
    if (!editingCell) return
    if (!editingData.subject || !editingData.teacher || !editingData.room) {
      toast.error('Please fill all fields')
      return
    }

    const existing = timetable.find(c => c.day === editingCell.day && c.period_number === editingCell.period)
    if (existing) {
      setTimetable(timetable.map(c =>
        c.day === editingCell.day && c.period_number === editingCell.period
          ? { ...c, ...editingData }
          : c
      ))
    } else {
      setTimetable([...timetable, {
        id: `${Date.now()}`,
        day: editingCell.day,
        period_number: editingCell.period,
        ...editingData
      }])
    }
    setEditingCell(null)
    toast.success('Cell updated successfully')
  }

  const handleDeleteCell = () => {
    if (!editingCell) return
    setTimetable(timetable.filter(c => !(c.day === editingCell.day && c.period_number === editingCell.period)))
    setEditingCell(null)
    toast.success('Cell deleted')
  }

  const getCellContent = (day: string, period: number) => {
    const cell = timetable.find(c => c.day === day && c.period_number === period)
    return cell
  }

  const handleSaveTimetable = () => {
    toast.success('Timetable saved successfully!')
    navigate('/education/timetable')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/education/timetable')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Timetable Editor</h1>
            <p className="text-gray-500">Drag-drop schedule creation for Class 9-A</p>
          </div>
        </div>
        <Button onClick={handleSaveTimetable}>
          <Save className="h-4 w-4 mr-2" />Save Timetable
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Editor Grid */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Grid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-max">
                  <div className="grid" style={{ gridTemplateColumns: 'auto repeat(5, 1fr)' }}>
                    {/* Header */}
                    <div className="font-bold text-gray-700 bg-gray-100 p-2 text-center">Period</div>
                    {DAYS.map(day => (
                      <div key={day} className="font-bold text-gray-700 bg-gray-100 p-2 text-center">{day}</div>
                    ))}

                    {/* Grid rows */}
                    {PERIODS.map(period => (
                      <>
                        <div key={`period-${period}`} className="font-bold text-gray-600 bg-gray-50 p-2 text-center border border-gray-200">
                          {period}
                        </div>
                        {DAYS.map(day => {
                          const cell = getCellContent(day, period)
                          return (
                            <div
                              key={`${day}-${period}`}
                              onClick={() => handleCellClick(day, period)}
                              className={`min-h-24 p-2 border border-gray-200 cursor-pointer transition-colors ${
                                cell
                                  ? 'bg-blue-50 hover:bg-blue-100'
                                  : 'bg-white hover:bg-gray-50'
                              } ${editingCell?.day === day && editingCell?.period === period ? 'ring-2 ring-blue-500' : ''}`}
                            >
                              {cell && (
                                <div className="space-y-1 text-xs">
                                  <p className="font-semibold text-slate-900">{cell.subject}</p>
                                  <p className="text-gray-600">{cell.teacher}</p>
                                  <Badge variant="outline" className="text-xs">{cell.room}</Badge>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Editor Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {editingCell ? `Edit Cell: ${editingCell.day} - Period ${editingCell.period}` : 'Select a cell to edit'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingCell && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Subject</label>
                    <select
                      value={editingData.subject}
                      onChange={(e) => setEditingData({ ...editingData, subject: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    >
                      <option value="">Select Subject</option>
                      {SAMPLE_SUBJECTS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600">Teacher</label>
                    <select
                      value={editingData.teacher}
                      onChange={(e) => setEditingData({ ...editingData, teacher: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    >
                      <option value="">Select Teacher</option>
                      {SAMPLE_TEACHERS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600">Room</label>
                    <select
                      value={editingData.room}
                      onChange={(e) => setEditingData({ ...editingData, room: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    >
                      <option value="">Select Room</option>
                      {SAMPLE_ROOMS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button size="sm" onClick={handleSaveCell} className="flex-1">
                      <Save className="h-3 w-3 mr-1" />Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDeleteCell} className="text-red-600 hover:text-red-700">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {!editingCell && (
                <div className="text-sm text-gray-500 text-center py-8">
                  Click on any cell in the grid to edit it
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full text-xs">
                <Plus className="h-3 w-3 mr-1" />Duplicate Week
              </Button>
              <Button variant="outline" size="sm" className="w-full text-xs">
                Clear Week
              </Button>
              <Button variant="outline" size="sm" className="w-full text-xs">
                Import Template
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate('/education/timetable')}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
