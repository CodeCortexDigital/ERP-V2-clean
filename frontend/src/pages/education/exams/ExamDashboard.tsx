import { useState, useEffect } from 'react'
import { TrendingUp, Calendar, FileText, Users, Award, PieChart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import api from '@/services/api'

export default function ExamDashboard() {
  const [stats, setStats] = useState({
    totalExams: 0,
    upcomingExams: 0,
    completedExams: 0,
    totalStudents: 0,
    averagePassRate: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const exams = await api.get('/auth/exams/')
        const total = exams.data.results?.length || 0
        const upcoming = exams.data.results?.filter((e: any) => e.status === 'scheduled').length || 0
        const completed = exams.data.results?.filter((e: any) => e.status === 'completed').length || 0
        setStats({ totalExams: total, upcomingExams: upcoming, completedExams: completed, totalStudents: 0, averagePassRate: 0 })
      } catch (error) { console.error(error) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [])

  if (loading) return <div className="text-center py-8">Loading dashboard...</div>

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6 text-blue-600" />Exam Dashboard</h1><p className="text-gray-500">Overview of examination statistics</p></div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Total Exams</p><p className="text-2xl font-bold text-blue-600">{stats.totalExams}</p></div><FileText className="w-8 h-8 text-blue-200" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Upcoming</p><p className="text-2xl font-bold text-orange-600">{stats.upcomingExams}</p></div><Calendar className="w-8 h-8 text-orange-200" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Completed</p><p className="text-2xl font-bold text-green-600">{stats.completedExams}</p></div><Award className="w-8 h-8 text-green-200" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Pass Rate</p><p className="text-2xl font-bold text-purple-600">0%</p></div><PieChart className="w-8 h-8 text-purple-200" /></div></CardContent></Card>
      </div>
    </div>
  )
}
