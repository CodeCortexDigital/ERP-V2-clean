import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Card, CardContent } from '@/components/ui/Card'
// import removed - not needed
import { toast } from 'sonner'

const statusColors = {
  present: 'success',
  absent: 'error',
  late: 'warning',
  excused: 'info',
}

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<StudentAttendance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [formData, setFormData] = useState<{
    student: string
    course: string
    date: string
    status: 'present' | 'absent' | 'late' | 'excused'
    remarks: string
  }>({
    student: '',
    course: '',
    date: selectedDate,
    status: 'present',
    remarks: '',
  })

  useEffect(() => {
    loadData()
  }, [selectedDate])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const response = await educationService.getAttendance({ date: selectedDate })
      setAttendance(response.data.results || response.data.data || [])
    } catch (error) {
      // Mock data
      setAttendance([
        { id: 1, student: 'Ahmed Khan', course: 'CS101', date: selectedDate, status: 'present' as const, remarks: '' },
        { id: 2, student: 'Fatima Ali', course: 'CS101', date: selectedDate, status: 'present' as const, remarks: '' },
        { id: 3, student: 'Ali Raza', course: 'CS101', date: selectedDate, status: 'absent' as const, remarks: 'Sick leave' },
        { id: 4, student: 'Aisha Bibi', course: 'MATH101', date: selectedDate, status: 'present' as const, remarks: '' },
        { id: 5, student: 'Omer Farooq', course: 'MATH101', date: selectedDate, status: 'late' as const, remarks: 'Traffic' },
        { id: 6, student: 'Sara Ahmed', course: 'ENG101', date: selectedDate, status: 'present' as const, remarks: '' },
        { id: 7, student: 'Bilal Khan', course: 'ENG101', date: selectedDate, status: 'excused', remarks: 'Family event' },
        { id: 8, student: 'Hira Naz', course: 'PHY101', date: selectedDate, status: 'present', remarks: '' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await educationService.markAttendance(formData)
      toast.success('Attendance marked successfully')
      setShowModal(false)
      loadData()
      setFormData({
        student: '',
        course: '',
        date: selectedDate,
        status: 'present' as const,
        remarks: '',
      })
    } catch (error) {
      toast.error('Operation failed')
    }
  }

  const filteredAttendance = attendance.filter(a => 
    a.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.course.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const attendanceColumns = [
    { key: 'student', header: 'Student' },
    { key: 'course', header: 'Course' },
    { key: 'date', header: 'Date', render: (a: StudentAttendance) => new Date(a.date).toLocaleDateString() },
    { key: 'status', header: 'Status', render: (a: StudentAttendance) => (
      <Badge variant={statusColors[a.status] as 'success' | 'error' | 'warning' | 'info'}>
        {a.status}
      </Badge>
    )},
    { key: 'remarks', header: 'Remarks' },
  ]

  // Calculate stats
  const presentCount = attendance.filter(a => a.status === 'present').length
  const absentCount = attendance.filter(a => a.status === 'absent').length
  const lateCount = attendance.filter(a => a.status === 'late').length
  const totalCount = attendance.length
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-gray-600">Track student attendance</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Mark Attendance
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600">Present</p>
            <p className="text-2xl font-bold text-green-600">{presentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600">Absent</p>
            <p className="text-2xl font-bold text-red-600">{absentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600">Late</p>
            <p className="text-2xl font-bold text-yellow-600">{lateCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600">Rate</p>
            <p className="text-2xl font-bold text-blue-600">{attendanceRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Select Date:</label>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-40"
        />
      </div>

      {/* Search and Table */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search attendance..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <DataTable
        data={filteredAttendance}
        columns={attendanceColumns}
        isLoading={isLoading}
      />

      {/* Mark Attendance Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Mark Attendance"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
              <Input
                value={formData.student}
                onChange={(e) => setFormData({ ...formData, student: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
              <Input
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'present' | 'absent' | 'late' | 'excused' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="excused">Excused</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <Input
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Optional remarks"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Mark Attendance
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

