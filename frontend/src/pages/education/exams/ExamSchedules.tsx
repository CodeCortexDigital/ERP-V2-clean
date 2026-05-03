import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Calendar, Clock, MapPin, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import api from '@/services/api'

interface ExamSchedule {
  id: string
  exam_id: string
  exam_name: string
  exam_code: string
  date: string
  start_time: string
  end_time: string
  venue: string
  room: string
  status: string
}

export default function ExamSchedules() {
  const [schedules, setSchedules] = useState<ExamSchedule[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ExamSchedule | null>(null)
  const [formData, setFormData] = useState({
    exam_id: '',
    date: '',
    start_time: '',
    end_time: '',
    venue: '',
    room: '',
    status: 'scheduled'
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [schedulesRes, examsRes] = await Promise.all([
        api.get('/education/exams/schedules/'),
        api.get('/auth/exams/')
      ])
      setSchedules(schedulesRes.data.results || [])
      setExams(examsRes.data.results || [])
    } catch (error) {
      console.error('Error fetching schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await api.put(`/education/exams/schedules/${editingItem.id}/`, formData)
      } else {
        await api.post('/education/exams/schedules/', formData)
      }
      await fetchData()
      setShowForm(false)
      setEditingItem(null)
      setFormData({ exam_id: '', date: '', start_time: '', end_time: '', venue: '', room: '', status: 'scheduled' })
    } catch (error) {
      console.error('Error saving schedule:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
      await api.delete(`/education/exams/schedules/${id}/`)
      await fetchData()
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'scheduled': return 'warning'
      case 'ongoing': return 'info'
      case 'completed': return 'success'
      default: return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="w-6 h-6 text-blue-600" />Exam Schedules</h1><p className="text-gray-500">Manage exam timetables</p></div>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />Add Schedule</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Schedules ({schedules.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-center py-8">Loading...</div> : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th>Exam</th><th>Date</th><th>Time</th><th>Venue</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {schedules.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-3"><div className="font-medium">{item.exam_name}</div><div className="text-xs text-gray-500">{item.exam_code}</div></td>
                      <td className="px-4 py-3">{item.date}</td>
                      <td className="px-4 py-3">{item.start_time} - {item.end_time}</td>
                      <td className="px-4 py-3">{item.venue} {item.room}</td>
                      <td className="px-4 py-3"><Badge variant={getStatusColor(item.status)}>{item.status}</Badge></td>
                      <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true) }} className="text-green-600"><Edit className="w-4 h-4" /></button><button onClick={() => handleDelete(item.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editingItem ? 'Edit Schedule' : 'Add Schedule'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <select className="w-full border rounded-lg p-2" value={formData.exam_id} onChange={(e) => setFormData({...formData, exam_id: e.target.value})} required>
                <option value="">Select Exam</option>
                {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.code} - {exam.title}</option>)}
              </select>
              <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
              <div className="grid grid-cols-2 gap-2"><Input type="time" placeholder="Start Time" value={formData.start_time} onChange={(e) => setFormData({...formData, start_time: e.target.value})} /><Input type="time" placeholder="End Time" value={formData.end_time} onChange={(e) => setFormData({...formData, end_time: e.target.value})} /></div>
              <Input placeholder="Venue" value={formData.venue} onChange={(e) => setFormData({...formData, venue: e.target.value})} />
              <Input placeholder="Room" value={formData.room} onChange={(e) => setFormData({...formData, room: e.target.value})} />
              <select className="w-full border rounded-lg p-2" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}><option value="scheduled">Scheduled</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option></select>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingItem(null) }}>Cancel</Button><Button type="submit">Save</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
