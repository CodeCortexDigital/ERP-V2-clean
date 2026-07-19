import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Save, CheckCircle2, ClipboardList, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'
import academicService from '@/services/academic.service'
import studentService from '@/services/student.service'
import { extractListData } from '@/services/api'
import { useNavigate, useParams } from 'react-router-dom'

interface HomeworkItem {
  id: string
  title: string
  class_ref?: string
  class_name: string
  subject_name: string
  due_date: string
  max_marks: number
  status: string
  submissions: SubmissionItem[]
}

interface SubmissionItem {
  id?: string
  student: string
  student_name: string
  obtained_marks: number | null
  remarks: string
  status: string
}

export default function AssignmentGradingPage() {
  const navigate = useNavigate()
  const { id: paramId } = useParams()
  const [homework, setHomework] = useState<HomeworkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [marks, setMarks] = useState<Record<string, string>>({})
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [students, setStudents] = useState<any[]>([])

  const loadHomework = useCallback(async () => {
    setLoading(true)
    try {
      const list = await academicService.homework.getAll({ ordering: '-due_date' }).catch(() => [])
      const items = Array.isArray(list) ? list : extractListData<any>(list)
      setHomework(items as HomeworkItem[])
      const initial = paramId || (items.length ? String(items[0].id) : '')
      if (!selectedId && initial) {
        setSelectedId(String(initial))
      }
    } catch {
      setHomework([])
    } finally {
      setLoading(false)
    }
  }, [selectedId, paramId])

  useEffect(() => {
    loadHomework()
  }, [loadHomework])

  const selected = homework.find((h) => String(h.id) === String(selectedId))

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    const loadStudents = async () => {
      try {
        const classId = selected.class_ref || selected.class_name
        const list = classId
          ? await studentService.getByClass(String(classId))
          : []
        const arr = Array.isArray(list) ? list : extractListData<any>(list)
        if (cancelled) return
        setStudents(arr)
        const m: Record<string, string> = {}
        const r: Record<string, string> = {}
        const existing = selected.submissions || []
        const byStudent: Record<string, SubmissionItem> = {}
        existing.forEach((s: SubmissionItem) => { byStudent[String(s.student)] = s })
        arr.forEach((s: any) => {
          const id = String(s.id)
          const ex = byStudent[id]
          m[id] = ex && ex.obtained_marks != null ? String(ex.obtained_marks) : ''
          r[id] = ex?.remarks || ''
        })
        setMarks(m)
        setRemarks(r)
      } catch {
        if (!cancelled) setStudents([])
      }
    }
    loadStudents()
    return () => { cancelled = true }
  }, [selected])

  const onChangeMark = (sid: string, v: string) => {
    setMarks((prev) => ({ ...prev, [sid]: v }))
  }
  const onChangeRemark = (sid: string, v: string) => {
    setRemarks((prev) => ({ ...prev, [sid]: v }))
  }

  const submitGrades = async () => {
    if (!selected) return
    const submissions = students.map((s) => {
      const id = String(s.id)
      const raw = marks[id] ?? ''
      return {
        student: id,
        student_name: s.name || s.full_name || '',
        obtained_marks: raw === '' ? null : Number(raw),
        remarks: remarks[id] || '',
        status: raw === '' ? 'submitted' : 'graded',
      }
    })
    setSaving(true)
    try {
      await academicService.homework.grade(String(selected.id), submissions)
      toast.success('Grades saved successfully')
      loadHomework()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save grades')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="sm" onClick={() => navigate('/teacher')}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-pink-600" /> Quiz / Assignments Grading
          </h1>
          <p className="text-xs text-slate-500">Assign obtained marks for each student submission.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[70vh] overflow-auto">
            {loading && <p className="text-xs text-slate-400">Loading…</p>}
            {!loading && homework.length === 0 && (
              <p className="text-xs text-slate-400">No assignments found.</p>
            )}
            {homework.map((h) => (
              <button
                key={h.id}
                onClick={() => setSelectedId(String(h.id))}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  String(h.id) === String(selectedId)
                    ? 'border-pink-400 bg-pink-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <p className="text-sm font-semibold text-slate-700 truncate">{h.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {h.class_name} · {h.subject_name}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge variant={h.status === 'evaluated' ? 'success' : 'secondary'}>
                    {h.status}
                  </Badge>
                  <span className="text-[10px] text-slate-400">Max: {h.max_marks}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              {selected ? `Grade — ${selected.title}` : 'Select an assignment'}
            </CardTitle>
            {selected && (
              <Badge variant="outline">Max marks: {selected.max_marks}</Badge>
            )}
          </CardHeader>
          <CardContent>
            {!selected && (
              <p className="text-xs text-slate-400">Select an assignment from the left to grade students.</p>
            )}
            {selected && (
              <>
                {students.length === 0 && (
                  <p className="text-xs text-slate-400 mb-3">
                    No students found for this class yet.
                  </p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase text-slate-400 border-b">
                        <th className="py-2 pr-3">Student</th>
                        <th className="py-2 pr-3 w-28">Obtained</th>
                        <th className="py-2 pr-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => {
                        const id = String(s.id)
                        return (
                          <tr key={id} className="border-b border-slate-100">
                            <td className="py-2 pr-3 font-medium text-slate-700">
                              {s.name || s.full_name}
                            </td>
                            <td className="py-2 pr-3">
                              <Input
                                type="number"
                                min={0}
                                max={selected.max_marks || undefined}
                                value={marks[id] ?? ''}
                                onChange={(e) => onChangeMark(id, e.target.value)}
                                placeholder="0"
                                className="w-24"
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <Input
                                value={remarks[id] ?? ''}
                                onChange={(e) => onChangeRemark(id, e.target.value)}
                                placeholder="—"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={submitGrades} disabled={saving || students.length === 0}>
                    {saving ? (
                      <>Saving…</>
                    ) : (
                      <><Save className="w-4 h-4" /> Save Grades</>
                    )}
                  </Button>
                </div>
                {selected.status === 'evaluated' && (
                  <p className="mt-3 text-[11px] text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Already evaluated — saving will update marks.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
