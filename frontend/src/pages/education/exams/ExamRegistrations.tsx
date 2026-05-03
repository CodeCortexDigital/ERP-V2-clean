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
      setRegistrations(regRes.data.results || [])
      setExams(examsRes.data.results || [])
      setStudents(studentsRes.data.results || [])
    } catch (error) { console.error(error) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/education/exams/registrations/', formData)
      await fetchData()
      setShowForm(false)
      setFormData({ exam_id: '', student_id: '' })
    } catch (error) { console.error(error) }
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
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-blue-600" />Exam Registrations</h1><p className="text-gray-500">Register students for exams</p></div>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />Register Student</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Registrations ({registrations.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-center py-8">Loading...</div> : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th>Exam</th><th>Student</th><th>Registration Date</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{registrations.map((reg: any) => (<tr key={reg.id} className="border-b"><td className="px-4 py-3">{reg.exam_name || reg.exam_id}</td><td className="px-4 py-3">{reg.student_name || reg.student_id}</td><td className="px-4 py-3">{new Date(reg.created_at).toLocaleDateString()}</td><td className="px-4 py-3"><Badge variant="success">Registered</Badge></td><td className="px-4 py-3"><button onClick={() => handleDelete(reg.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></button></td></tr>))}</tbody></table>
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white rounded-lg w-full max-w-md p-6"><h2 className="text-xl font-bold mb-4">Register Student</h2><form onSubmit={handleSubmit} className="space-y-4"><select className="w-full border rounded-lg p-2" value={formData.exam_id} onChange={(e) => setFormData({...formData, exam_id: e.target.value})} required><option value="">Select Exam</option>{exams.map((e) => <option key={e.id} value={e.id}>{e.code} - {e.title}</option>)}</select><select className="w-full border rounded-lg p-2" value={formData.student_id} onChange={(e) => setFormData({...formData, student_id: e.target.value})} required><option value="">Select Student</option>{students.map((s) => <option key={s.id} value={s.id}>{s.student_id} - {s.full_name}</option>)}</select><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit">Register</Button></div></form></div></div>)}
    </div>
  )
}
