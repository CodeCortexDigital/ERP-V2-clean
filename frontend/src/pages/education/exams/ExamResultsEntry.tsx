import { useState, useEffect } from 'react'
import { Save, FileText, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'
import examService from '@/services/exam.service'
import studentService from '@/services/student.service'
import { extractListData } from '@/services/api'

export default function ExamResultsEntry() {
  const [exams, setExams] = useState<any[]>([])
  const [selectedExam, setSelectedExam] = useState('')
  const [registrations, setRegistrations] = useState<any[]>([])
  const [results, setResults] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchExams = async () => {
      const res = await examService.getExams().catch(() => ({ data: [] }))
      const list = extractListData<any>(res.data || [])
      setExams(list)
    }
    fetchExams()
  }, [])

  const fetchRegistrations = async () => {
    if (!selectedExam) return
    setLoading(true)
    try {
      const examRes = await examService.getExam(selectedExam).catch(() => null)
      const exam = examRes?.data
      const classId = exam?.class_ref || exam?.class_id || exam?.class
      if (!classId) {
        toast.error('This exam has no assigned class — cannot load students.')
        setRegistrations([])
        return
      }
      const res = await studentService.getByClass(classId).catch(() => ({ data: [] }))
      const students = extractListData<any>(res.data || [])
      setRegistrations(students)
      const initial: Record<string, number> = {}
      students.forEach((s: any) => {
        initial[s.id] = Number(s.obtained_marks ?? s.last_marks ?? 0)
      })
      setResults(initial)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load students for this exam.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedExam) return
    setSaving(true)
    try {
      const payload = Object.entries(results).map(([studentId, obtained_marks]) => ({
        student: studentId,
        obtained_marks,
      }))
      await examService.bulkEnterResults(selectedExam, payload)
      toast.success(`Results saved for ${payload.length} students!`)
    } catch (error) {
      console.error(error)
      toast.error('Failed to save results.')
    } finally {
      setSaving(false)
    }
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

      {loading && <div className="text-center py-8">Loading students...</div>}

      {registrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Enter Marks ({registrations.length} students)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {registrations.map((reg) => (
                <div
                  key={reg.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div>
                    <div className="font-medium">{reg.full_name || reg.name || reg.id}</div>
                    <div className="text-sm text-gray-500">
                      Roll No: {reg.student_id || reg.roll_number || '-'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      className="w-24"
                      placeholder="Marks"
                      value={results[reg.id] ?? ''}
                      onChange={(e) =>
                        setResults({
                          ...results,
                          [reg.id]: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                    <span>/ {reg.total_marks ?? 100}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save All Results'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && registrations.length === 0 && selectedExam && (
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-blue-50 border border-blue-100 rounded-lg p-4">
          <CheckCircle2 className="w-4 h-4 text-blue-500" />
          Select an exam and load students to begin entering marks.
        </div>
      )}
    </div>
  )
}
