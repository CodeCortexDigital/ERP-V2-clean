import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import examService, { ExamResult } from '@/services/exam.service'

const gradeCategories = [
  { label: 'A', color: '#7c3aed' },
  { label: 'B', color: '#2563eb' },
  { label: 'C', color: '#0ea5e9' },
  { label: 'D', color: '#22c55e' },
  { label: 'F', color: '#ef4444' },
]

function mapGradeToCategory(result: ExamResult) {
  const grade = result.grade?.toUpperCase() || ''
  if (grade.startsWith('A')) return 'A'
  if (grade.startsWith('B')) return 'B'
  if (grade.startsWith('C')) return 'C'
  if (grade.startsWith('D')) return 'D'
  return 'F'
}

export default function ExamAnalytics() {
  const [results, setResults] = useState<ExamResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await examService.getResults()
        const data = Array.isArray(response.data) ? response.data : response.data?.results || []
        setResults(data)
      } catch (err) {
        console.error('Error loading exam analytics:', err)
        setError('Unable to load exam analytics data at the moment.')
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [])

  const totalResults = results.length
  const passedCount = results.filter(item => item.is_pass).length
  const failedCount = totalResults - passedCount
  const passRate = totalResults ? Math.round((passedCount / totalResults) * 100) : 0
  const failRate = totalResults ? Math.round((failedCount / totalResults) * 100) : 0
  const avgPercentage = totalResults
    ? Math.round(results.reduce((sum, item) => sum + (item.percentage ?? 0), 0) / totalResults)
    : 0

  const distribution = gradeCategories.map(category => {
    const count = results.filter(item => mapGradeToCategory(item) === category.label).length
    return {
      name: category.label,
      value: count,
      percentage: totalResults ? Math.round((count / totalResults) * 100) : 0,
      color: category.color,
    }
  })

  const passFailData = [
    { name: 'Pass', value: passedCount },
    { name: 'Fail', value: failedCount },
  ]

  const summaryCards = [
    { label: 'Pass Rate', value: `${passRate}%`, description: 'Overall passing percentage', color: 'text-emerald-700', icon: '✅' },
    { label: 'Average Score', value: `${avgPercentage}%`, description: 'Average result percentage', color: 'text-indigo-700', icon: '📊' },
    { label: 'Total Results', value: totalResults, description: 'Exam records analyzed', color: 'text-slate-700', icon: '🧠' },
    { label: 'Fail Rate', value: `${failRate}%`, description: 'Overall failing percentage', color: 'text-red-700', icon: '⚠️' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exam Analytics</h1>
        <p className="text-gray-500 mt-1">Dashboard with pass rates, grade distribution, and exam performance insights.</p>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading analytics...</div>
      ) : error ? (
        <div className="text-center py-10 text-red-600">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {summaryCards.map(card => (
              <Card key={card.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <span>{card.icon}</span> {card.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
                  <p className="text-xs text-gray-500 mt-2">{card.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Pass / Fail Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={passFailData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={4}
                    >
                      {passFailData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.name === 'Pass' ? '#22c55e' : '#ef4444'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Grade Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value} students`} />
                    <Legend />
                    <Bar dataKey="value" name="Students" isAnimationActive={false}>
                      {distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Grade Distribution Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {distribution.map(item => (
                  <div key={item.name} className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Grade {item.name}</p>
                      <p className="text-xs text-gray-500">{item.percentage}% of results</p>
                    </div>
                    <Badge variant={item.value > 0 ? 'success' : 'secondary'}>{item.value} students</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
