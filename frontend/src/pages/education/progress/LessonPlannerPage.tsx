import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, X, Clock, Calendar, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import academicService from '@/services/academic.service'
import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default function LessonPlannerPage() {
  const navigate = useNavigate()
  const { role, user } = useAuth()
  const isAdmin = role === 'admin' || role === 'staff' || !!user?.is_staff || !!user?.is_superuser

  // Page States
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<any[]>([])
  const [classSubjects, setClassSubjects] = useState<any[]>([])
  const [periods, setPeriods] = useState<any[]>([])
  const [topics, setTopics] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [currentTeacherId, setCurrentTeacherId] = useState<string>('')

  // Modal / Form States
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)

  // Form Fields
  const [selectedClassSubject, setSelectedClassSubject] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [objectives, setObjectives] = useState('')
  const [activities, setActivities] = useState('')
  const [resourcesNeeded, setResourcesNeeded] = useState('')
  const [homework, setHomework] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('planned')

  // AI Assistant States
  const [aiTopic, setAiTopic] = useState('')
  const [generatingLesson, setGeneratingLesson] = useState(false)

  const handleAiGenerateLesson = async () => {
    if (!aiTopic) return
    setGeneratingLesson(true)
    try {
      const currentCS = classSubjects.find(cs => cs.id === selectedClassSubject)
      const subjectName = currentCS?.subject_name || 'General'
      const className = currentCS?.class_name || 'Standard'
      
      const payload = {
        subject: subjectName,
        grade: className,
        topic: aiTopic,
        objectives: objectives ? objectives.split(',') : []
      }
      
      const res = await api.post('/ai/lesson-plan/', payload)
      const data = res.data || {}
      
      if (data.materials_needed) {
        setResourcesNeeded(Array.isArray(data.materials_needed) ? data.materials_needed.join(', ') : data.materials_needed)
      }
      if (data.introduction || data.main_activities || data.group_work) {
        const generatedActivities = [
          data.introduction ? `Intro: ${data.introduction}` : '',
          data.main_activities ? (Array.isArray(data.main_activities) ? data.main_activities.join('; ') : data.main_activities) : '',
          data.group_work ? `Group: ${data.group_work}` : ''
        ].filter(Boolean).join('. ')
        setActivities(generatedActivities)
      }
      if (data.homework) {
        setHomework(data.homework)
      }
      if (!objectives && Array.isArray(data.learning_objectives) && data.learning_objectives.length) {
        setObjectives(data.learning_objectives.join(', '))
      }
      const noteParts = [
        data.assessment ? `Assessment Questions: ${Array.isArray(data.assessment) ? data.assessment.join(' | ') : data.assessment}` : '',
        data.differentiation ? `Differentiation: ${data.differentiation}` : '',
      ].filter(Boolean)
      if (noteParts.length) {
        setNotes(noteParts.join('\n'))
      }

      toast.success(
        data.source === 'template'
          ? 'Lesson plan template filled in — review and edit before saving.'
          : 'Lesson plan drafted by AI — review and edit before saving.'
      )
    } catch (err: any) {
      console.error('AI Lesson Generation failed:', err)
      toast.error(err?.response?.data?.error || 'AI Lesson Generation failed. Please try again.')
    } finally {
      setGeneratingLesson(false)
    }
  }

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      // Fetch core options
      const [csRes, periodsRes, topicsRes, plansRes] = await Promise.all([
        academicService.getClassSubjects(),
        academicService.getPeriods(),
        academicService.getSyllabusTopics(),
        academicService.getLessonPlans()
      ])

      setClassSubjects(Array.isArray(csRes.data) ? csRes.data : (csRes.data as any)?.results || [])
      setPeriods(Array.isArray(periodsRes.data) ? periodsRes.data : (periodsRes.data as any)?.results || [])
      setTopics(Array.isArray(topicsRes.data) ? topicsRes.data : (topicsRes.data as any)?.results || [])
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : (plansRes.data as any)?.results || [])

      // Resolve teacher profile context
      if (isAdmin) {
        const teachersRes = await api.get('/auth/academics/teachers/')
        const teachersList = Array.isArray(teachersRes.data) ? teachersRes.data : (teachersRes.data as any)?.results || []
        setTeachers(teachersList)
        if (teachersList.length > 0) {
          setSelectedTeacher(teachersList[0].id)
        }
      } else {
        const profileRes = await api.get('/auth/my-teacher-profile/')
        if (profileRes.data?.id) {
          setCurrentTeacherId(profileRes.data.id)
          setSelectedTeacher(profileRes.data.id)
        }
      }
    } catch (err) {
      console.error('Error fetching lesson planner data:', err)
      toast.error('Failed to load lesson plans and configurations')
    } finally {
      setLoading(false)
    }
  }

  // Filter topics based on the selected Class-Subject
  const filteredTopics = useMemo(() => {
    if (!selectedClassSubject) return []
    return topics
  }, [selectedClassSubject, topics])

  // Map dates to weekdays for rendering
  const plansByDay = useMemo(() => {
    const grouped: { [key: string]: any[] } = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: []
    }

    plans.forEach(plan => {
      if (!plan.date) return
      const dateObj = new Date(plan.date)
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayName = days[dateObj.getDay()]
      if (grouped[dayName]) {
        grouped[dayName].push(plan)
      }
    })

    return grouped
  }, [plans])

  const handleOpenAddModal = () => {
    setEditingPlan(null)
    setSelectedClassSubject(classSubjects[0]?.id || '')
    setSelectedTopic(topics[0]?.id || '')
    setPlanDate(new Date().toISOString().split('T')[0])
    setSelectedPeriod(periods[0]?.id || '')
    setObjectives('')
    setActivities('')
    setResourcesNeeded('')
    setHomework('')
    setNotes('')
    setStatus('planned')
    setShowFormModal(true)
  }

  const handleOpenEditModal = (plan: any) => {
    setEditingPlan(plan)
    setSelectedClassSubject(plan.class_subject || '')
    setSelectedTopic(plan.syllabus_topic || '')
    setSelectedTeacher(plan.teacher || '')
    setPlanDate(plan.date || '')
    setSelectedPeriod(plan.period || '')
    setObjectives(Array.isArray(plan.objectives) ? plan.objectives.join(', ') : plan.objectives || '')
    setActivities(Array.isArray(plan.activities) ? plan.activities.join(', ') : plan.activities || '')
    setResourcesNeeded(Array.isArray(plan.resources_needed) ? plan.resources_needed.join(', ') : plan.resources_needed || '')
    setHomework(plan.homework || '')
    setNotes(plan.notes || '')
    setStatus(plan.status || 'planned')
    setShowFormModal(true)
  }

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      teacher: selectedTeacher || currentTeacherId,
      class_subject: selectedClassSubject,
      syllabus_topic: selectedTopic,
      date: planDate,
      period: selectedPeriod,
      objectives: objectives.split(',').map(s => s.trim()).filter(Boolean),
      activities: activities.split(',').map(s => s.trim()).filter(Boolean),
      resources_needed: resourcesNeeded.split(',').map(s => s.trim()).filter(Boolean),
      homework,
      notes,
      status
    }

    try {
      if (editingPlan) {
        await academicService.updateLessonPlan(editingPlan.id, payload)
        toast.success('Lesson plan updated successfully')
      } else {
        await academicService.createLessonPlan(payload)
        toast.success('Lesson plan created successfully')
      }
      setShowFormModal(false)
      // Refresh list
      const plansRes = await academicService.getLessonPlans()
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : (plansRes.data as any)?.results || [])
    } catch (err: any) {
      console.error('Error saving lesson plan:', err)
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save lesson plan.'
      toast.error(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePlan = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this lesson plan?')) return
    try {
      await academicService.deleteLessonPlan(id)
      toast.success('Lesson plan deleted')
      setPlans(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error('Error deleting lesson plan:', err)
      toast.error('Failed to delete lesson plan')
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
          <h1 className="text-2xl font-bold text-gray-900">Lesson Planner</h1>
          <p className="text-gray-500">Daily and weekly lesson plan editor for classroom delivery.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-2 sm:grid-cols-2">
          <Card className="p-4">
            <CardTitle className="text-xs font-semibold text-gray-400 uppercase">Weekly Status</CardTitle>
            <p className="mt-1 text-lg font-bold text-slate-800">{plans.length} total active plans</p>
          </Card>
          <Card className="p-4">
            <CardTitle className="text-xs font-semibold text-gray-400 uppercase">Active Curriculums</CardTitle>
            <p className="mt-1 text-lg font-bold text-slate-800">{classSubjects.length} class-subjects mapping</p>
          </Card>
        </div>
        <Button onClick={handleOpenAddModal}>
          <Plus className="h-4 w-4 mr-2" />Add Lesson Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {WEEK_DAYS.map((day) => {
          const dayPlans = plansByDay[day] || []
          return (
            <Card key={day} className="border border-slate-100 shadow-sm">
              <CardHeader className="bg-slate-50/50 py-3">
                <CardTitle className="flex items-center justify-between text-base font-semibold text-slate-800">
                  {day}
                  <Badge variant="secondary">{dayPlans.length} plans</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {dayPlans.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No lesson plans scheduled for {day}.</p>
                ) : (
                  dayPlans.map((plan) => (
                    <div key={plan.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-xs text-blue-600 font-bold tracking-wide uppercase">{plan.subject_name || 'Subject'}</span>
                          <h4 className="text-sm font-semibold text-slate-900 mt-0.5">{plan.topic_title || 'Topic'}</h4>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Period: {plan.period_name || 'Standard'}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Date: {plan.date}</span>
                          </div>
                        </div>
                        <Badge variant={plan.status === 'completed' ? 'success' : plan.status === 'planned' ? 'secondary' : 'warning'}>
                          {plan.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="mt-3 text-sm text-gray-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100/50">
                        <span className="font-semibold text-slate-800 text-xs block uppercase mb-0.5">Objectives:</span>
                        <p>{Array.isArray(plan.objectives) ? plan.objectives.join(', ') : plan.objectives || 'None specified'}</p>
                      </div>

                      <div className="flex items-center gap-2 pt-3 justify-end">
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(plan)}>
                          <Pencil className="w-3.5 h-3.5 mr-1" />Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeletePlan(plan.id)}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" />Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add/Edit Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={() => setShowFormModal(false)}>
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">{editingPlan ? 'Edit Lesson Plan' : 'Create Lesson Plan'}</h2>

            <form onSubmit={handleSavePlan} className="space-y-4">
              {/* AI Lesson Assistant Panel */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3.5 space-y-2">
                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" /> AI Lesson Assistant
                </h4>
                <p className="text-[11px] text-gray-500">
                  Provide a topic and objectives below, then click generate to auto-fill materials, activities, and homework.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Lesson Topic (e.g. Newton's Laws)"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-1.5 bg-white text-xs focus:outline-none"
                  />
                  <Button
                    type="button"
                    onClick={handleAiGenerateLesson}
                    disabled={generatingLesson || !aiTopic}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3"
                  >
                    {generatingLesson ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Generate'}
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Class Subject</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-sm focus:outline-none"
                  value={selectedClassSubject}
                  onChange={(e) => setSelectedClassSubject(e.target.value)}
                  required
                >
                  <option value="">-- Select Class & Subject --</option>
                  {classSubjects.map(cs => (
                    <option key={cs.id} value={cs.id}>{cs.class_name} - {cs.subject_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Syllabus Topic</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-sm focus:outline-none"
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  required
                >
                  <option value="">-- Select Syllabus Topic --</option>
                  {filteredTopics.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Teacher</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-sm focus:outline-none"
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    required
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-sm focus:outline-none"
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Period</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-sm focus:outline-none"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    required
                  >
                    {periods.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.start_time}-{p.end_time})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Objectives (comma-separated)</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-sm focus:outline-none"
                  rows={2}
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  placeholder="e.g. Understand formulas, solve practice problems"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Activities (comma-separated)</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-sm focus:outline-none"
                  value={activities}
                  onChange={(e) => setActivities(e.target.value)}
                  placeholder="e.g. Group discussion, whiteboard demo"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Resources Needed (comma-separated)</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-sm focus:outline-none"
                  value={resourcesNeeded}
                  onChange={(e) => setResourcesNeeded(e.target.value)}
                  placeholder="e.g. Projector, Textbook Pg 45"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Homework</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-sm focus:outline-none"
                  value={homework}
                  onChange={(e) => setHomework(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Teacher Notes</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-sm focus:outline-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-sm focus:outline-none"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="planned">Planned</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="postponed">Postponed</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowFormModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Plan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
