import { useState, useEffect } from 'react'
import { Plus, Trash2, Users, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import api from '@/services/api'

export default function ExamRegistrations() {
  const [registrations, setRegistrations] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ exam_id: '', student_id: '' })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [regRes, examsRes, studentsRes] = await Promise.all([
        api.get('/education/exams/registrations/'),
        api.get('/auth/exams/'),
        api.get('/auth/students/')
      ])
      
      const regList = Array.isArray(regRes.data) ? regRes.data : regRes.data?.results || []
      const examList = Array.isArray(examsRes.data) ? examsRes.data : examsRes.data?.results || []
      const studentList = Array.isArray(studentsRes.data) ? studentsRes.data : studentsRes.data?.results || []

      setRegistrations(regList)
      setExams(examList)
      setStudents(studentList)
    } catch (error) { 
      console.error('Error fetching registration data:', error) 
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/education/exams/registrations/', formData)
      await fetchData()
      setShowForm(false)
      setFormData({ exam_id: '', student_id: '' })
    } catch (error) { 
      console.error('Error submitting registration:', error) 
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Remove registration?')) {
      await api.delete(`/education/exams/registrations/${id}/`)
      await fetchData()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />Exam Registrations
          </h1>
          <p className="text-gray-500">Register students for exams</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />Register Student
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrations ({registrations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading registrations...</div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Exam</th>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Registration Date</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg: any) => (
                    <tr key={reg.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{reg.exam_name || reg.exam_id}</td>
                      <td className="px-4 py-3">{reg.student_name || reg.student_id}</td>
                      <td className="px-4 py-3">{new Date(reg.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><Badge variant="success">Registered</Badge></td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleDelete(reg.id)} className="text-red-600 hover:text-red-800 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {registrations.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-gray-500">No registrations found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Register Student for Exam</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Select Exam</label>
                <select 
                  className="w-full border rounded-lg p-2.5 text-sm bg-white" 
                  value={formData.exam_id} 
                  onChange={(e) => setFormData({...formData, exam_id: e.target.value})} 
                  required
                >
                  <option value="">-- Choose Exam --</option>
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.exam_code || e.code} - {e.title || e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Select Student</label>
                <select 
                  className="w-full border rounded-lg p-2.5 text-sm bg-white" 
                  value={formData.student_id} 
                  onChange={(e) => setFormData({...formData, student_id: e.target.value})} 
                  required
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.student_id} - {s.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Register</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
