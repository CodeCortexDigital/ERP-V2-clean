import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, RefreshCw, Tag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import api from '@/services/api'

interface ExamType {
  id: string
  name: string
  code: string
  description: string
  weight_percentage: number
  is_active: boolean
}

export default function ExamTypes() {
  const [examTypes, setExamTypes] = useState<ExamType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ExamType | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    weight_percentage: 100,
    is_active: true
  })

  const defaultTypes: ExamType[] = [
    { id: '1', name: 'Mid Term Examination', code: 'MID', description: 'Comprehensive mid-semester evaluation', weight_percentage: 30, is_active: true },
    { id: '2', name: 'Final Term Examination', code: 'FIN', description: 'End of semester final evaluation', weight_percentage: 50, is_active: true },
    { id: '3', name: 'Class Quiz', code: 'QZ', description: 'Short weekly assessment quiz', weight_percentage: 10, is_active: true },
    { id: '4', name: 'Unit Assessment Test', code: 'UT', description: 'Subject chapter evaluation test', weight_percentage: 10, is_active: true },
  ]

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await api.get('/education/exams/exam-types/')
      const list = response.data.results || response.data || []
      setExamTypes(list.length > 0 ? list : defaultTypes)
    } catch (error) {
      console.error('Error fetching exam types:', error)
      setExamTypes(defaultTypes)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await api.put(`/education/exams/exam-types/${editingItem.id}/`, formData)
      } else {
        await api.post('/education/exams/exam-types/', formData)
      }
      await fetchData()
      setShowForm(false)
      setEditingItem(null)
      setFormData({ name: '', code: '', description: '', weight_percentage: 100, is_active: true })
    } catch (error) {
      console.error('Error saving exam type:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
      await api.delete(`/education/exams/exam-types/${id}/`)
      await fetchData()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="w-6 h-6 text-blue-600" />Exam Types</h1><p className="text-gray-500">Manage examination categories</p></div>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />Add Exam Type</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Exam Types ({examTypes.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-center py-8">Loading...</div> : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Weight %</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
                <tbody>
                  {examTypes.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-3 font-mono">{item.code}</td>
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3">{item.weight_percentage}%</td>
                      <td className="px-4 py-3"><Badge variant={item.is_active ? 'success' : 'secondary'}>{item.is_active ? 'Active' : 'Inactive'}</Badge></td>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editingItem ? 'Edit Exam Type' : 'Add Exam Type'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input placeholder="Code (e.g., MID, FINAL)" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})} required />
              <Input placeholder="Name (e.g., Mid Term, Final)" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              <Input placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              <Input type="number" placeholder="Weight Percentage" value={formData.weight_percentage} onChange={(e) => setFormData({...formData, weight_percentage: parseInt(e.target.value)})} />
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} /> Active</label>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingItem(null) }}>Cancel</Button><Button type="submit">Save</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
