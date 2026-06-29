import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Layers, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import academicService from '@/services/academic.service'
import { toast } from 'sonner'

export default function CoverageDashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [classSubjects, setClassSubjects] = useState<any[]>([])
  const [coverages, setCoverages] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [csRes, coverageRes] = await Promise.all([
        academicService.getClassSubjects(),
        academicService.getTopicCoverages()
      ])

      setClassSubjects(Array.isArray(csRes.data) ? csRes.data : (csRes.data as any)?.results || [])
      setCoverages(Array.isArray(coverageRes.data) ? coverageRes.data : (coverageRes.data as any)?.results || [])
    } catch (err) {
      console.error('Error fetching coverage data:', err)
      toast.error('Failed to load syllabus coverage data')
    } finally {
      setLoading(false)
    }
  }

  // Calculate syllabus completion per class-subject
  const subjectCoverageList = useMemo(() => {
    return classSubjects.map(cs => {
      // Find all topic coverages for this class subject
      const csCoverages = coverages.filter(cov => cov.class_subject === cs.id)
      
      let completedPercent = 0
      let completedUnitsStr = '0/0'
      
      if (csCoverages.length > 0) {
        const sum = csCoverages.reduce((acc, curr) => acc + parseFloat(curr.coverage_percentage || 0), 0)
        completedPercent = Math.round(sum / csCoverages.length)

        const completedCount = csCoverages.filter(cov => parseFloat(cov.coverage_percentage || 0) === 100).length
        completedUnitsStr = `${completedCount}/${csCoverages.length}`
      }

      return {
        id: cs.id,
        className: cs.class_name,
        subjectName: cs.subject_name,
        completed: completedPercent,
        units: completedUnitsStr
      }
    })
  }, [classSubjects, coverages])

  // Overall stats
  const stats = useMemo(() => {
    if (subjectCoverageList.length === 0) {
      return { overall: 0, onSchedule: 0, behindSchedule: 0 }
    }

    const totalPercentSum = subjectCoverageList.reduce((acc, curr) => acc + curr.completed, 0)
    const overall = Math.round(totalPercentSum / subjectCoverageList.length)

    const onSchedule = subjectCoverageList.filter(item => item.completed >= 75).length
    const behindSchedule = subjectCoverageList.filter(item => item.completed < 75).length

    return { overall, onSchedule, behindSchedule }
  }, [subjectCoverageList])

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
          <h1 className="text-2xl font-bold text-gray-900">Coverage Dashboard</h1>
          <p className="text-gray-500">Track syllabus completion and coverage gaps across subjects.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <CardTitle className="text-base font-semibold text-slate-500">Overall Coverage</CardTitle>
          <p className="mt-2 text-3xl font-bold text-blue-700">{stats.overall}%</p>
          <p className="text-sm text-gray-500">Average syllabus completion across tracked subjects.</p>
        </Card>
        <Card className="p-4">
          <CardTitle className="text-base font-semibold text-slate-500">On Schedule</CardTitle>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{stats.onSchedule}</p>
          <p className="text-sm text-gray-500">Subjects that meet or exceed 75% coverage.</p>
        </Card>
        <Card className="p-4">
          <CardTitle className="text-base font-semibold text-slate-500">Behind Schedule</CardTitle>
          <p className="mt-2 text-3xl font-bold text-amber-700">{stats.behindSchedule}</p>
          <p className="text-sm text-gray-500">Subjects needing focus (&lt; 75% coverage).</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subject Syllabus Coverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {subjectCoverageList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No subject coverages recorded yet.</p>
          ) : (
            subjectCoverageList.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{item.className} - {item.subjectName}</p>
                    <p className="text-xs text-gray-500">Topics covered: {item.units}</p>
                  </div>
                  <Badge variant={item.completed >= 75 ? 'success' : item.completed >= 50 ? 'warning' : 'danger'}>
                    {item.completed}%
                  </Badge>
                </div>
                <Progress value={item.completed} className="h-3 rounded-full" />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <Layers className="w-4 h-4 text-slate-500" />
          <span>Priority focus: Subjects marked in red/yellow require adjusted pacing in lesson plans.</span>
        </div>
      </div>
    </div>
  )
}
