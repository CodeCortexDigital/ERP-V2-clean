import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Loader2, MessageSquare, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import academicService from '@/services/academic.service'
import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export default function StudentProgressPage() {
  const navigate = useNavigate()
  const { role, user } = useAuth()
  const isAdmin = role === 'admin' || role === 'staff' || !!user?.is_staff || !!user?.is_superuser

  // Page States
  const [loading, setLoading] = useState(true)
  const [progressRecords, setProgressRecords] = useState<any[]>([])
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [classSubjects, setClassSubjects] = useState<any[]>([])
  const [topics, setTopics] = useState<any[]>([])
  const [currentTeacherId, setCurrentTeacherId] = useState<string>('')
  const [predictions, setPredictions] = useState<any[]>([])

  // Form / Modal States
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [savingFeedback, setSavingFeedback] = useState(false)

  // Form Fields
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedClassSubject, setSelectedClassSubject] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [feedbackType, setFeedbackType] = useState('progress')
  const [feedbackTitle, setFeedbackTitle] = useState('')
  const [feedbackContent, setFeedbackContent] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [progressRes, feedbackRes, studentsRes, csRes, topicsRes, predictionsRes] = await Promise.all([
        academicService.getStudentTopicProgress(),
        academicService.getTeacherFeedbacks(),
        api.get('/auth/students/'),
        academicService.getClassSubjects(),
        academicService.getSyllabusTopics(),
        api.get('/ai/student-predictions/').catch(err => ({ data: [] }))
      ])

      setProgressRecords(Array.isArray(progressRes.data) ? progressRes.data : (progressRes.data as any)?.results || [])
      setFeedbacks(Array.isArray(feedbackRes.data) ? feedbackRes.data : (feedbackRes.data as any)?.results || [])
      setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data as any)?.results || [])
      setClassSubjects(Array.isArray(csRes.data) ? csRes.data : (csRes.data as any)?.results || [])
      setTopics(Array.isArray(topicsRes.data) ? topicsRes.data : (topicsRes.data as any)?.results || [])
      setPredictions(Array.isArray(predictionsRes.data) ? predictionsRes.data : [])

      // Resolve teacher context if not admin
      if (!isAdmin) {
        const profileRes = await api.get('/auth/my-teacher-profile/')
        if (profileRes.data?.id) {
          setCurrentTeacherId(profileRes.data.id)
        }
      }
    } catch (err) {
      console.error('Error fetching student progress data:', err)
      toast.error('Failed to load student progress and feedbacks')
    } finally {
      setLoading(false)
    }
  }

  // Calculate aggregated student progress values
  const studentProgressList = useMemo(() => {
    // Group records by student
    const grouped: { [studentId: string]: { name: string; records: any[] } } = {}
    
    progressRecords.forEach(rec => {
      const sId = rec.student
      const sName = rec.student_name || 'Student'
      if (!grouped[sId]) {
        grouped[sId] = { name: sName, records: [] }
      }
      grouped[sId].records.push(rec)
    })

    // Map each group to metrics
    return Object.keys(grouped).map(sId => {
      const item = grouped[sId]
      const totalRecords = item.records.length
      const progressSum = item.records.reduce((acc, curr) => acc + parseFloat(curr.progress_percentage || 0), 0)
      const avgProgress = totalRecords > 0 ? Math.round(progressSum / totalRecords) : 0

      // Overall status: Needs Support if any topic needs help, Excellent if avg >= 90, otherwise On Track
      const hasNeedsHelp = item.records.some(rec => rec.status === 'needs_help')
      let overallStatus = 'On Track'
      if (hasNeedsHelp) {
        overallStatus = 'Needs Support'
      } else if (avgProgress >= 90) {
        overallStatus = 'Excellent'
      }

      // Find original student details for attendance (mock/display 95% default if not found)
      const studentDetails = students.find(s => s.id === sId)
      const attendanceVal = studentDetails?.attendance_rate || 95

      // Find AI predictions
      const pred = predictions.find(p => p.student_id === sId)
      const predictedGrade = pred ? pred.predicted_grade : 'N/A'
      const riskLevel = pred ? pred.risk_level : 'low'

      return {
        id: sId,
        name: item.name,
        avgProgress,
        attendance: attendanceVal,
        status: overallStatus,
        predictedGrade,
        riskLevel
      }
    })
  }, [progressRecords, students, predictions])

  // Overview stats
  const stats = useMemo(() => {
    if (studentProgressList.length === 0) {
      return { avg: 0, highAchievers: 0, interventionCount: 0 }
    }

    const sum = studentProgressList.reduce((acc, curr) => acc + curr.avgProgress, 0)
    const avg = Math.round(sum / studentProgressList.length)

    const highAchievers = studentProgressList.filter(s => s.avgProgress >= 90).length
    const interventionCount = studentProgressList.filter(s => s.status === 'Needs Support').length

    return { avg, highAchievers, interventionCount }
  }, [studentProgressList])

  const handleOpenFeedbackModal = () => {
    setSelectedStudent(students[0]?.id || '')
    setSelectedClassSubject(classSubjects[0]?.id || '')
    setSelectedTopic(topics[0]?.id || '')
    setFeedbackType('progress')
    setFeedbackTitle('')
    setFeedbackContent('')
    setShowFeedbackModal(true)
  }

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingFeedback(true)

    const payload = {
      teacher: currentTeacherId || null, // Will use logged-in user teacher profile or resolved teacher
      student: selectedStudent,
      class_subject: selectedClassSubject,
      syllabus_topic: selectedTopic || null,
      feedback_type: feedbackType,
      title: feedbackTitle,
      content: feedbackContent,
      is_private: false
    }

    try {
      await academicService.createTeacherFeedback(payload)
      toast.success('Feedback logged successfully')
      setShowFeedbackModal(false)
      // Refresh feedbacks
      const feedbackRes = await academicService.getTeacherFeedbacks()
      setFeedbacks(Array.isArray(feedbackRes.data) ? feedbackRes.data : (feedbackRes.data as any)?.results || [])
    } catch (err) {
      console.error('Error saving feedback:', err)
      toast.error('Failed to log teacher feedback. Check inputs.')
    } finally {
      setSavingFeedback(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/education/progress')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Progress</h1>
          <p className="text-gray-500">Individual student performance and progress tracking.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full md:w-auto md:flex-1 max-w-2xl">
          <Card className="p-4 flex-1">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase">Average Progress</CardTitle>
            <p className="mt-1 text-2xl font-bold text-blue-700">{stats.avg}%</p>
          </Card>
          <Card className="p-4 flex-1">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase">High Achievers</CardTitle>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.highAchievers}</p>
          </Card>
          <Card className="p-4 flex-1">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase">Interventions</CardTitle>
            <p className="mt-1 text-2xl font-bold text-amber-700">{stats.interventionCount}</p>
          </Card>
        </div>
        <Button onClick={handleOpenFeedbackModal} className="h-10 self-start sm:self-center">
          <Plus className="w-4 h-4 mr-2" />Log Feedback
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Academic Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {studentProgressList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No student progress records found.</p>
          ) : (
            studentProgressList.map((student) => (
              <div key={student.id} className="rounded-xl border border-gray-100 bg-white p-4 hover:border-slate-300 transition-colors shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-[150px]">
                    <p className="font-semibold text-slate-900">{student.name}</p>
                    <p className="text-xs text-gray-400">ID: {student.id.substring(0, 8)}</p>
                  </div>
                  <div className="space-y-1 w-full md:w-1/4">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Curriculum Progress</span>
                      <span className="font-bold text-slate-800">{student.avgProgress}%</span>
                    </div>
                    <Progress value={student.avgProgress} className="h-2 rounded-full" />
                  </div>
                  <div className="text-left md:text-center">
                    <p className="text-xs font-semibold text-gray-400 uppercase">Attendance</p>
                    <p className="text-sm font-bold text-slate-800">{student.attendance}%</p>
                  </div>
                  <div className="text-left md:text-center bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl flex flex-col justify-center items-center">
                    <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">AI Predicted</p>
                    <p className="text-sm font-bold text-slate-800">{student.predictedGrade}</p>
                  </div>
                  <div className="text-left md:text-center">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-0.5">AI Risk</p>
                    <Badge variant={student.riskLevel === 'high' || student.riskLevel === 'critical' ? 'destructive' : student.riskLevel === 'medium' ? 'warning' : 'success'}>
                      {student.riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                  <Badge variant={student.status === 'Excellent' ? 'success' : student.status === 'On Track' ? 'secondary' : 'warning'}>
                    {student.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Feedbacks Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            Recent Teacher Feedback Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedbacks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No teacher feedback notes logged yet.</p>
          ) : (
            feedbacks.map((f) => (
              <div key={f.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{f.student_name}</span>
                    <span className="text-xs text-slate-400">— Logged by {f.teacher_name || 'Instructor'}</span>
                  </div>
                  <Badge variant={f.feedback_type === 'concern' ? 'danger' : f.feedback_type === 'progress' ? 'success' : 'secondary'}>
                    {f.feedback_type.toUpperCase()}
                  </Badge>
                </div>
                <h5 className="text-xs font-semibold text-blue-600 mt-1">{f.title}</h5>
                <p className="text-sm text-gray-600 mt-0.5">{f.content}</p>
                <span className="text-[10px] text-gray-400 block mt-1">Date: {f.date || 'Today'}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Log Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={() => setShowFeedbackModal(false)}>
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Log Student Feedback</h2>

            <form onSubmit={handleSaveFeedback} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Student</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-sm focus:outline-none"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  required
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Class Subject</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-sm focus:outline-none"
                  value={selectedClassSubject}
                  onChange={(e) => setSelectedClassSubject(e.target.value)}
                  required
                >
                  <option value="">-- Choose Class Subject --</option>
                  {classSubjects.map(cs => (
                    <option key={cs.id} value={cs.id}>{cs.class_name} - {cs.subject_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Syllabus Topic (Optional)</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-sm focus:outline-none"
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                >
                  <option value="">-- Choose Topic --</option>
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Feedback Type</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-sm focus:outline-none"
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value)}
                >
                  <option value="progress">Progress</option>
                  <option value="academic">Academic</option>
                  <option value="behavior">Behavior</option>
                  <option value="concern">Concern</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-sm focus:outline-none"
                  value={feedbackTitle}
                  onChange={(e) => setFeedbackTitle(e.target.value)}
                  placeholder="e.g. Excellent Algebra quiz"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Content / Observation Details</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-sm focus:outline-none"
                  rows={3}
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  placeholder="Describe your assessment or observation..."
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowFeedbackModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={savingFeedback}>
                  {savingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log Feedback'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          <span>Focus on targeted review sessions for students below 75% progress.</span>
        </div>
      </div>
    </div>
  )
}
