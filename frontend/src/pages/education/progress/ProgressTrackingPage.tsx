import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, BarChart3, Users, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import academicService from '@/services/academic.service'
import { toast } from 'sonner'

export default function ProgressTrackingPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  
  // Data states
  const [lessonPlans, setLessonPlans] = useState<any[]>([])
  const [topicCoverages, setTopicCoverages] = useState<any[]>([])
  const [studentProgress, setStudentProgress] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [plansRes, coverageRes, progressRes] = await Promise.all([
        academicService.getLessonPlans(),
        academicService.getTopicCoverages(),
        academicService.getStudentTopicProgress()
      ])

      setLessonPlans(Array.isArray(plansRes.data) ? plansRes.data : (plansRes.data as any)?.results || [])
      setTopicCoverages(Array.isArray(coverageRes.data) ? coverageRes.data : (coverageRes.data as any)?.results || [])
      setStudentProgress(Array.isArray(progressRes.data) ? progressRes.data : (progressRes.data as any)?.results || [])
    } catch (err) {
      console.error('Error fetching progress tracking data:', err)
      toast.error('Failed to load progress tracking statistics')
    } finally {
      setLoading(false)
    }
  }

  // Calculate dynamic stats
  const stats = useMemo(() => {
    // Total weekly lesson plans
    const weeklyPlansCount = lessonPlans.length

    // Average syllabus coverage percentage
    let avgCoverage = 0
    if (topicCoverages.length > 0) {
      const sum = topicCoverages.reduce((acc, curr) => acc + parseFloat(curr.coverage_percentage || 0), 0)
      avgCoverage = Math.round(sum / topicCoverages.length)
    }

    // Unique students under review (who have at least one topic marked as 'needs_help')
    const needsHelpRecords = studentProgress.filter(sp => sp.status === 'needs_help')
    const uniqueStudentsUnderReview = Array.from(new Set(needsHelpRecords.map(sp => sp.student))).length

    // Students on track percentage (percentage of student progress records NOT marked as 'needs_help')
    let onTrackPercent = 100
    if (studentProgress.length > 0) {
      const onTrackCount = studentProgress.filter(sp => sp.status !== 'needs_help').length
      onTrackPercent = Math.round((onTrackCount / studentProgress.length) * 100)
    }

    // Behind schedule subjects count (where coverage < 75%)
    const behindCount = topicCoverages.filter(tc => parseFloat(tc.coverage_percentage || 0) < 75).length

    return {
      weeklyPlansCount,
      avgCoverage,
      uniqueStudentsUnderReview,
      onTrackPercent,
      behindCount
    }
  }, [lessonPlans, topicCoverages, studentProgress])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progress Tracking</h1>
          <p className="text-gray-500">Lesson planning, syllabus coverage and student progress insights</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button onClick={() => navigate('/education/progress/lesson-planner')}>Lesson Planner</Button>
          <Button onClick={() => navigate('/education/progress/coverage')}>Coverage Dashboard</Button>
          <Button onClick={() => navigate('/education/progress/students')}>Student Progress</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-700">Lesson Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 min-h-[40px]">Create and schedule daily or weekly lesson plans with curriculum mapping.</p>
            <div className="mt-4 flex items-center gap-2 text-lg font-bold text-slate-800">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <span>{stats.weeklyPlansCount} lesson plans configured</span>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-700">Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 min-h-[40px]">Visualize syllabus completion across classes and subjects.</p>
            <div className="mt-4 flex items-center gap-2 text-lg font-bold text-slate-800">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
              <span>{stats.avgCoverage}% of syllabus completed</span>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-700">Student Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 min-h-[40px]">Track individual student performance, progress and intervention needs.</p>
            <div className="mt-4 flex items-center gap-2 text-lg font-bold text-slate-800">
              <Users className="h-5 w-5 text-amber-500" />
              <span>{stats.uniqueStudentsUnderReview} students under review</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Lesson Plans this week</span>
              <Badge variant="secondary">{stats.weeklyPlansCount} planned</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Coverage rate</span>
              <Badge variant={stats.avgCoverage >= 75 ? 'success' : stats.avgCoverage >= 50 ? 'warning' : 'danger'}>
                {stats.avgCoverage}%
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Students on track</span>
              <Badge variant={stats.onTrackPercent >= 75 ? 'success' : 'warning'}>
                {stats.onTrackPercent}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">Lesson plan review due</p>
              <p className="text-sm text-gray-500">
                {stats.weeklyPlansCount === 0 
                  ? 'No active lesson plans scheduled for this week. Please create one to begin.' 
                  : 'Review scheduled daily plans with curriculum mapping before Monday.'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">Coverage gap</p>
              <p className="text-sm text-gray-500">
                {stats.behindCount > 0 
                  ? `${stats.behindCount} syllabus topic(s) currently behind schedule (< 75% coverage).`
                  : 'All syllabus topics are currently on track. Keep up the pace!'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
