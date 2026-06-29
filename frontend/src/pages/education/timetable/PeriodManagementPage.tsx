import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Edit, Trash2, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'
import academicService from '@/services/academic.service'
import { useAuth } from '@/contexts/AuthContext'

interface Period {
  id: string
  period_number: number
  name: string
  start_time: string
  end_time: string
  duration_minutes: number
  is_break: boolean
  academic_year: string
}

export default function PeriodManagementPage() {
  const navigate = useNavigate()
  const { role, user } = useAuth()
  const isAdmin = role === 'admin' || role === 'staff' || !!user?.is_staff || !!user?.is_superuser

  const [periods, setPeriods] = useState<Period[]>([])
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [activeYearId, setActiveYearId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null)

  // Form states
  const [formName, setFormName] = useState('')
  const [formNumber, setFormNumber] = useState<number>(1)
  const [formStart, setFormStart] = useState('08:00')
  const [formEnd, setFormEnd] = useState('09:00')
  const [formIsBreak, setFormIsBreak] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [periodsRes, yearsRes] = await Promise.all([
        academicService.getPeriods(),
        academicService.getAcademicYears()
      ])
      
      const periodsList = Array.isArray(periodsRes.data) ? periodsRes.data : (periodsRes.data as any)?.results || []
      const yearsList = Array.isArray(yearsRes.data) ? yearsRes.data : (yearsRes.data as any)?.results || []

      // Sort periods by period_number
      periodsList.sort((a: Period, b: Period) => a.period_number - b.period_number)
      
      setPeriods(periodsList)
      setAcademicYears(yearsList)

      const activeYear = yearsList.find((y: any) => y.is_active || y.is_current)
      if (activeYear) {
        setActiveYearId(activeYear.id)
      } else if (yearsList.length > 0) {
        setActiveYearId(yearsList[0].id)
      }
    } catch (err) {
      console.error('Error fetching periods/years:', err)
      toast.error('Failed to load periods data')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error('Only administrators can delete periods')
      return
    }
    if (!confirm('Are you sure you want to delete this period? This might impact scheduled timetables.')) return

    try {
      await academicService.deletePeriod(id)
      toast.success('Period deleted successfully')
      fetchData()
    } catch (err) {
      console.error('Error deleting period:', err)
      toast.error('Failed to delete period')
    }
  }

  const handleEdit = (period: Period) => {
    setEditingPeriod(period)
    setFormName(period.name)
    setFormNumber(period.period_number)
    // Extract HH:MM if database returns HH:MM:SS
    setFormStart(period.start_time.substring(0, 5))
    setFormEnd(period.end_time.substring(0, 5))
    setFormIsBreak(period.is_break)
    setShowForm(true)
  }

  const handleCreateClick = () => {
    setEditingPeriod(null)
    setFormName(`Period ${periods.length + 1}`)
    setFormNumber(periods.length + 1)
    setFormStart('08:00')
    setFormEnd('09:00')
    setFormIsBreak(false)
    setShowForm(true)
  }

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0
    const [startH, startM] = start.split(':').map(Number)
    const [endH, endM] = end.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM
    return endMinutes - startMinutes
  }

  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) {
      toast.error('Only administrators can save periods')
      return
    }
    if (!activeYearId) {
      toast.error('No academic year selected. Configure an academic year first.')
      return
    }

    const duration = calculateDuration(formStart, formEnd)
    if (duration <= 0) {
      toast.error('End time must be after start time')
      return
    }

    const payload = {
      name: formName,
      period_number: formNumber,
      start_time: formStart + ':00',
      end_time: formEnd + ':00',
      duration_minutes: duration,
      is_break: formIsBreak,
      academic_year: activeYearId
    }

    try {
      if (editingPeriod) {
        await academicService.updatePeriod(editingPeriod.id, payload)
        toast.success('Period updated successfully')
      } else {
        await academicService.createPeriod(payload)
        toast.success('Period created successfully')
      }
      setShowForm(false)
      fetchData()
    } catch (err: any) {
      console.error('Error saving period:', err)
      const msg = err.response?.data?.non_field_errors?.[0] || 'Failed to save period'
      toast.error(msg)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/education/timetable')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Period Management</h1>
          <p className="text-gray-500">Configure school periods and timing</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700">{periods.length}</p>
          <p className="text-xs text-gray-600">Total Periods</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-700">{periods.filter(p => !p.is_break).length}</p>
          <p className="text-xs text-gray-600">Class Periods</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-yellow-700">{periods.filter(p => p.is_break).length}</p>
          <p className="text-xs text-gray-600">Break Periods</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-purple-700">
            {periods.length > 0 ? `${periods[0].start_time.substring(0, 5)} - ${periods[periods.length - 1].end_time.substring(0, 5)}` : 'N/A'}
          </p>
          <p className="text-xs text-gray-600">School Hours</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Periods Configuration</h2>
        {isAdmin && (
          <Button onClick={handleCreateCreateClick => handleCreateClick()}>
            <Plus className="h-4 w-4 mr-2" />Add Period
          </Button>
        )}
      </div>

      {periods.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p>No periods configured yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {periods.map((period) => (
            <Card key={period.id} className={`${period.is_break ? 'border-yellow-200 bg-yellow-50/50' : 'border-gray-200'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{period.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Period {period.period_number}</p>
                  </div>
                  {period.is_break && (
                    <Badge variant="warning" className="ml-2">Break</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Start Time</p>
                    <p className="font-mono text-sm font-semibold">{period.start_time.substring(0, 5)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">End Time</p>
                    <p className="font-mono text-sm font-semibold">{period.end_time.substring(0, 5)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="text-sm font-semibold">{period.duration_minutes} minutes</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-2 pt-2 border-t mt-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(period)} className="flex-1">
                      <Edit className="h-3 w-3 mr-1" />Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(period.id)} className="flex-1 text-red-600 hover:text-red-700">
                      <Trash2 className="h-3 w-3 mr-1" />Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPeriod ? 'Edit Period' : 'Add Period'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSavePeriod} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Period Name</label>
                <Input
                  required
                  placeholder="e.g. Period 1, Recess"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Period Number</label>
                  <Input
                    type="number"
                    required
                    min={1}
                    value={formNumber}
                    onChange={(e) => setFormNumber(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Academic Year</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 bg-slate-50 border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
                    value={activeYearId}
                    onChange={(e) => setActiveYearId(e.target.value)}
                  >
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    className="w-full border rounded-lg px-3 py-2 bg-slate-50 border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    className="w-full border rounded-lg px-3 py-2 bg-slate-50 border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="formIsBreak"
                  checked={formIsBreak}
                  onChange={(e) => setFormIsBreak(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="formIsBreak" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                  Is a Break / Recess Period
                </label>
              </div>

              <div className="flex gap-2 pt-4 border-t mt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Save Period
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate('/education/timetable')}>
          Back
        </Button>
      </div>
    </div>
  )
}
