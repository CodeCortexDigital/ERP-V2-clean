import { useState, useEffect, useRef } from 'react'
import { Save, CheckCircle, XCircle, Users, RefreshCw, Camera, Scan, FileImage, AlertTriangle } from 'lucide-react'
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
  
  // Face Recognition states
  const [showScanner, setShowScanner] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [classrooms, setClassrooms] = useState<any[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState('')
  const [faceScores, setFaceScores] = useState<Record<string, number>>({})
  const [scanMessage, setScanMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchCourses = async () => {
    try {
      const res = await api.get('/auth/courses/')
      setCourses(res.data.results || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchClassrooms = async () => {
    try {
      // Fetch classrooms from academics options or mock them
      const res = await api.get('/auth/academics/classes/')
      const list = res.data.results || []
      // Use classes locations as classroom representations
      const rooms = list.map((c: any) => ({
        id: c.id,
        name: c.location || c.name
      })).filter((c: any) => c.name)
      setClassrooms(rooms)
      if (rooms.length > 0) setSelectedClassroom(rooms[0].id)
    } catch (error) {
      // Set default mock classrooms if API fails
      setClassrooms([
        { id: 'room-101', name: 'Room 101' },
        { id: 'room-102', name: 'Room 102' },
        { id: 'room-201', name: 'Room 201' }
      ])
      setSelectedClassroom('room-101')
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
    fetchClassrooms()
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

  const handleFaceScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setScanMessage('Uploading classroom image to AI face recognizer...')

    const formData = new FormData()
    formData.append('classroom_id', selectedClassroom)
    formData.append('image', file)

    try {
      const response = await api.post('/ai/face-attendance/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      const { students_recognized, unknown_faces_count } = response.data
      
      const updatedStatus = { ...attendanceStatus }
      const newScores: Record<string, number> = {}
      
      // Update all students status to absent first, then mark recognized as present
      students.forEach(s => {
        updatedStatus[s.id] = 'absent'
      })
      
      students_recognized.forEach((rec: any) => {
        // Find matching student from state
        const match = students.find(s => s.student_id === rec.roll || s.id === rec.id)
        if (match) {
          updatedStatus[match.id] = 'present'
          newScores[match.id] = rec.confidence
        }
      })
      
      setAttendanceStatus(updatedStatus)
      setFaceScores(newScores)
      setScanMessage(
        `Scan complete! Recognized ${students_recognized.length} students. Marked present. Unknown faces detected: ${unknown_faces_count}`
      )
      
      // Close scanner modal after a short delay
      setTimeout(() => {
        setShowScanner(false)
        setScanning(false)
        setScanMessage('')
      }, 3000)
    } catch (err: any) {
      console.error(err)
      setScanMessage(err.response?.data?.error || 'Error calling AI Face recognition. Please make sure face is registered.')
      setScanning(false)
    }
  }

  const triggerMockScan = async () => {
    setScanning(true)
    setScanMessage('Scanning camera view... Evolving deep neural face mappings...')
    
    // Simulate API call
    setTimeout(() => {
      const updatedStatus = { ...attendanceStatus }
      const newScores: Record<string, number> = {}
      
      // Mark first 3 students present with high confidence
      students.slice(0, 3).forEach((s, idx) => {
        updatedStatus[s.id] = 'present'
        newScores[s.id] = 94.5 - (idx * 3.2)
      })
      
      // Mark others as absent
      students.slice(3).forEach((s) => {
        updatedStatus[s.id] = 'absent'
      })
      
      setAttendanceStatus(updatedStatus)
      setFaceScores(newScores)
      setScanMessage('Mock Scan Successful! Marked first 3 students present.')
      
      setTimeout(() => {
        setShowScanner(false)
        setScanning(false)
        setScanMessage('')
      }, 2000)
    }, 2000)
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
          <div className="flex gap-2 justify-between items-center">
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
            
            <Button 
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => setShowScanner(true)}
            >
              <Camera className="w-4 h-4 mr-2" />
              AI Face Recognition Scan
            </Button>
          </div>

          {/* AI Face Recognition Scanner Modal */}
          {showScanner && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                <div className="bg-purple-700 px-6 py-4 text-white flex justify-between items-center">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Scan className="w-5 h-5 animate-pulse" />
                    AI Face Recognition Scanner
                  </h3>
                  <button 
                    onClick={() => setShowScanner(false)}
                    className="text-white/80 hover:text-white font-bold text-xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Select Classroom Camera Endpoint</Label>
                    <select
                      className="w-full border rounded-lg p-2"
                      value={selectedClassroom}
                      onChange={(e) => setSelectedClassroom(e.target.value)}
                    >
                      {classrooms.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Simulated Camera Viewport */}
                  <div className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center border-2 border-purple-500">
                    {scanning ? (
                      <div className="absolute inset-x-0 h-1 bg-purple-500 animate-[bounce_1.5s_infinite] shadow-[0_0_8px_#a855f7]" />
                    ) : null}
                    
                    <div className="text-center text-slate-400 space-y-2 z-10 p-4">
                      <Camera className={`w-12 h-12 mx-auto text-purple-400 ${scanning ? 'animate-pulse' : ''}`} />
                      <p className="text-sm font-medium">
                        {scanning ? 'Analyzing facial geometry features...' : 'Classroom Camera Ready'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Upload a snapshot or run mock scan for testing
                      </p>
                    </div>
                  </div>

                  {scanMessage && (
                    <div className={`p-3 rounded-lg text-sm border ${
                      scanMessage.includes('complete') || scanMessage.includes('Successful')
                        ? 'bg-green-50 border-green-200 text-green-700' 
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}>
                      {scanMessage}
                    </div>
                  )}

                  <div className="flex gap-3 justify-end">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFaceScan}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={scanning}
                    >
                      <FileImage className="w-4 h-4 mr-2" />
                      Upload Class Picture
                    </Button>
                    <Button 
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={triggerMockScan}
                      disabled={scanning}
                    >
                      <Scan className="w-4 h-4 mr-2" />
                      Run Test Scan
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                      <tr>
                        <th className="px-4 py-3">Student ID</th>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3 text-center">AI Confidence</th>
                        <th className="px-4 py-3 text-center">Present</th>
                        <th className="px-4 py-3 text-center">Absent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id} className="border-b">
                          <td className="px-4 py-3">{student.student_id}</td>
                          <td className="px-4 py-3 flex items-center gap-2">
                            {student.full_name}
                            {faceScores[student.id] ? (
                              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                                <Scan className="w-3 h-3" /> Face Match
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {faceScores[student.id] ? (
                              <span className="text-purple-600 font-bold">{faceScores[student.id].toFixed(1)}%</span>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
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

