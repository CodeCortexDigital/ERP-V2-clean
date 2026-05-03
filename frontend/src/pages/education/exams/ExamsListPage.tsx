import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, RefreshCw, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import ExamForm from '@/components/ExamForm'
import examService from '@/services/exam.service'

export default function ExamsListPage() {
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingExam, setEditingExam] = useState<any>(null)

  const fetchExams = async () => {
    console.log('🔍 Fetching exams from backend...')
    setLoading(true)
    try {
      const data = await examService.getAll()
      console.log('✅ Exams received:', data)
      setExams(data)
    } catch (error) {
      console.error('❌ Error fetching exams:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExams()
  }, [])

  const handleCreate = async (data: any) => {
    console.log('📝 Creating exam:', data)
    await examService.create(data)
    await fetchExams()
    setShowForm(false)
  }

  const handleUpdate = async (data: any) => {
    if (!editingExam) return
    console.log('✏️ Updating exam:', editingExam.id, data)
    await examService.update(editingExam.id, data)
    await fetchExams()
    setEditingExam(null)
  }

  const handleDelete = async (exam: any) => {
    if (confirm(`Delete ${exam.title}?`)) {
      console.log('🗑️ Deleting exam:', exam.id)
      await examService.delete(exam.id)
      await fetchExams()
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

  const filteredExams = exams.filter(exam =>
    exam.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.code?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="text-center py-8">Loading exams from backend...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Examinations
          </h1>
          <p className="text-gray-500 mt-1">Manage exams from database</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchExams} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />Add Exam</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Total Exams</p><p className="text-2xl font-bold text-blue-600">{exams.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">From Backend</p><p className="text-2xl font-bold text-green-600">{exams.length} records</p></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6"><Input placeholder="Search exams..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-md" /></CardContent></Card>

      <Card>
        <CardHeader><CardTitle>Exams from Database ({filteredExams.length})</CardTitle></CardHeader>
        <CardContent>
          {filteredExams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No exams in database. Click "Add Exam" to create one.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Marks</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
              </thead>
              <tbody>
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="border-b">
                    <td className="px-4 py-3 font-mono">{exam.code}</td>
                    <td className="px-4 py-3">{exam.title}</td>
                    <td className="px-4 py-3">{exam.duration_minutes} min</td>
                    <td className="px-4 py-3">{exam.total_marks}</td>
                    <td className="px-4 py-3"><Badge variant={getStatusColor(exam.status)}>{exam.status || 'scheduled'}</Badge></td>
                    <td className="px-4 py-3"><button onClick={() => setEditingExam(exam)} className="text-green-600 mr-2"><Edit className="w-4 h-4" /></button><button onClick={() => handleDelete(exam)} className="text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {showForm && <ExamForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}
      {editingExam && <ExamForm initialData={editingExam} onSubmit={handleUpdate} onCancel={() => setEditingExam(null)} isEdit={true} />}
    </div>
  )
}
