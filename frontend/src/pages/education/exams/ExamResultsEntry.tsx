import { useState, useEffect } from 'react'
import { Save, FileText, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import api from '@/services/api'

export default function ExamResultsEntry() {
  const [exams, setExams] = useState<any[]>([])
  const [selectedExam, setSelectedExam] = useState('')
  const [registrations, setRegistrations] = useState<any[]>([])
  const [results, setResults] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchExams = async () => {
      const res = await api.get('/auth/exams/')
      setExams(res.data.results || [])
    }
    fetchExams()
  }, [])

  const fetchRegistrations = async () => {
    if (!selectedExam) return
    setLoading(true)
    try {
      const res = await api.get(`/education/exams/registrations/?exam_id=${selectedExam}`)
      setRegistrations(res.data.results || [])
      const initialResults: Record<string, number> = {}
      res.data.results?.forEach((reg: any) => { initialResults[reg.student_id] = 0 })
      setResults(initialResults)
    } catch (error) { console.error(error) }
    finally { setLoading(false) }
  }

  const handleSave = async () => {
    for (const [studentId, marks] of Object.entries(results)) {
      await api.post('/education/exams/results/', {
        exam_id: selectedExam,
        student_id: studentId,
        obtained_marks: marks
      })
    }
    alert('Results saved successfully!')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Results Entry
        </h1>
        <p className="text-gray-500">Enter student exam results</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <select
              className="flex-1 border rounded-lg p-2"
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
            >
              <option value="">Select Exam</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code} - {e.title}
                </option>
              ))}
            </select>
            <Button onClick={fetchRegistrations} disabled={!selectedExam}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Load Students
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && <div className="text-center py-8">Loading registrations...</div>}

      {registrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Enter Marks ({registrations.length} students)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {registrations.map((reg) => (
                <div
                  key={reg.student_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div>
                    <div className="font-medium">{reg.student_name || reg.student_id}</div>
                    <div className="text-sm text-gray-500">
                      Roll No: {reg.roll_number || '-'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      className="w-24"
                      placeholder="Marks"
                      value={results[reg.student_id] ?? ''}
                      onChange={(e) =>
                        setResults({
                          ...results,
                          [reg.student_id]: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                    <span>/ 100</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-4">
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save All Results
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
