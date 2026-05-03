import { useState, useEffect } from 'react'
import { Save, CheckCircle, XCircle, Users, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import api from '@/services/api'

interface Student {
  id: string
  student_id: string
  full_name: string
}

interface Course {
  id: string
  code: string
  name: string
}

export default function MarkAttendance() {
  const [students, setStudents] = useState<Student[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceStatus, setAttendanceStatus] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const fetchCourses = async () => {
    try {
      const res = await api.get('/auth/courses/')
      setCourses(res.data.results || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchStudents = async () => {
    if (!selectedCourse) return
    setLoading(true)
    setMessage('Loading students...')
    try {
      const res = await api.get('/auth/students/')
      setStudents(res.data.results || [])
      
      const initialStatus: Record<string, string> = {}
      res.data.results?.forEach((student: Student) => {
        initialStatus[student.id] = 'present'
      })
      setAttendanceStatus(initialStatus)
      setMessage(`Loaded ${res.data.results?.length || 0} students`)
    } catch (error) {
      console.error('Error fetching students:', error)
      setMessage('Error loading students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    if (selectedCourse) {
      fetchStudents()
    }
  }, [selectedCourse])

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceStatus(prev => ({ ...prev, [studentId]: status }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('Saving attendance...')
    try {
      // Save each student's attendance individually
      for (const [studentId, status] of Object.entries(attendanceStatus)) {
        const student = students.find(s => s.id === studentId)
        const course = courses.find(c => c.id === selectedCourse)
        
        await api.post('/education/attendance/mark/', {
          student_id: studentId,
          student_name: student?.full_name || '',
          course_id: selectedCourse,
          course_name: course?.name || '',
          date: selectedDate,
          status: status
        })
      }
      setMessage('Attendance saved successfully!')
      alert('Attendance saved successfully!')
    } catch (error: any) {
      console.error('Error saving attendance:', error)
      if (error.response?.status === 401) {
        setMessage('Authentication failed. Please login again.')
        alert('Session expired. Please refresh the page.')
      } else {
        setMessage('Error saving attendance')
        alert('Error saving attendance: ' + (error.response?.data?.detail || error.message))
      }
    } finally {
      setSaving(false)
    }
  }

  const markAll = (status: string) => {
    const newStatus: Record<string, string> = {}
    students.forEach(student => {
      newStatus[student.id] = status
    })
    setAttendanceStatus(newStatus)
    setMessage(`All students marked as ${status}`)
  }

  const selectedCourseObj = courses.find(c => c.id === selectedCourse)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-blue-600" />
          Mark Attendance
        </h1>
        <p className="text-gray-500 mt-1">Mark student attendance for courses</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="block text-sm font-medium mb-1">Select Course</Label>
              <select
                className="w-full border rounded-lg p-2"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="">-- Select a course --</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-auto">
              <Label className="block text-sm font-medium mb-1">Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-48"
              />
            </div>
            <Button onClick={fetchStudents} disabled={!selectedCourse || loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Load Students
            </Button>
          </div>
          {message && <p className="text-sm text-gray-500 mt-3">{message}</p>}
        </CardContent>
      </Card>

      {selectedCourse && selectedCourseObj && (
        <>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => markAll('present')}>
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              Mark All Present
            </Button>
            <Button variant="outline" onClick={() => markAll('absent')}>
              <XCircle className="w-4 h-4 text-red-600 mr-2" />
              Mark All Absent
            </Button>
          </div>

          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>
                Students in {selectedCourseObj.code} - {selectedCourseObj.name}
              </CardTitle>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Attendance'}
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading students...</div>
              ) : students.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No students enrolled in this course</div>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50">
                      <tr><th className="px-4 py-3">Student ID</th><th className="px-4 py-3">Student Name</th><th className="px-4 py-3 text-center">Present</th><th className="px-4 py-3 text-center">Absent</th></tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id} className="border-b">
                          <td className="px-4 py-3">{student.student_id}</td>
                          <td className="px-4 py-3">{student.full_name}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              className={`px-3 py-1 rounded-full ${
                                attendanceStatus[student.id] === 'present' 
                                  ? 'bg-green-600 text-white' 
                                  : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                              onClick={() => handleStatusChange(student.id, 'present')}
                            >
                              Present
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              className={`px-3 py-1 rounded-full ${
                                attendanceStatus[student.id] === 'absent' 
                                  ? 'bg-red-600 text-white' 
                                  : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                              onClick={() => handleStatusChange(student.id, 'absent')}
                            >
                              Absent
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
