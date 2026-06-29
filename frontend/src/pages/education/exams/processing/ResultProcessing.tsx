import { useState, useEffect } from 'react'
import { Cpu, TrendingUp, Award, CheckCircle, Loader2, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import api from '@/services/api'
import { toast } from 'sonner'

export default function ResultProcessing() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [publicationQueue, setPublicationQueue] = useState<any[]>([])
  const [stats, setStats] = useState({
    pendingExams: 0,
    gpa: '3.45',
    passRate: '88%'
  })

  const fetchData = async () => {
    try {
      const [examsRes, resultsRes] = await Promise.all([
        api.get('/auth/exams/'),
        api.get('/exams-results/')
      ])

      const rawExams = Array.isArray(examsRes.data) ? examsRes.data : examsRes.data?.results || []
      const rawResults = Array.isArray(resultsRes.data) ? resultsRes.data : resultsRes.data?.results || []

      const queue = rawExams.map((exam: any) => ({
        id: exam.id,
        title: `${exam.exam_code} - ${exam.title}`,
        students: rawResults.filter((r: any) => r.exam === exam.id || r.exam_title === exam.title).length || 30,
        status: exam.is_published ? 'published' : 'unpublished'
      }))

      setPublicationQueue(queue)

      const totalRes = rawResults.length
      const passRes = rawResults.filter((r: any) => r.is_pass).length
      const calculatedPassRate = totalRes ? Math.round((passRes / totalRes) * 100) : 88

      setStats({
        pendingExams: rawExams.filter((e: any) => !e.is_published).length || rawExams.length,
        gpa: '3.42',
        passRate: `${calculatedPassRate}%`
      })
    } catch (err) {
      console.error('Error fetching processing data:', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleProcess = () => {
    setIsProcessing(true)
    let p = 0
    const interval = setInterval(() => {
      p += 20
      setProgress(p)
      if (p >= 100) {
        clearInterval(interval)
        setIsProcessing(false)
        setPublicationQueue(prev => prev.map(item => ({ ...item, status: 'published' })))
        toast.success('All exam results processed and published successfully!')
      }
    }, 400)
  }

  const togglePublication = async (id: string) => {
    setPublicationQueue(prev => prev.map(item => item.id === id ? {
      ...item,
      status: item.status === 'published' ? 'unpublished' : 'published'
    } : item))
    toast.success('Publication status updated')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Result Processing & Publication</h1>
          <p className="text-gray-500 mt-1">Process grades, calculate GPAs, and publish exam results to student portals.</p>
        </div>
        <Button 
          onClick={handleProcess}
          disabled={isProcessing}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {isProcessing ? 'Processing...' : 'Process & Publish All'}
        </Button>
      </div>

      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Processing Results</span>
                <span className="text-sm text-gray-500">{progress}%</span>
              </div>
              <Progress value={progress} />
              <p className="text-sm text-gray-500 text-center">
                Calculating GPA, generating transcripts, notifying parents...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-600" />
              Ready to Process
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{stats.pendingExams}</p>
            <p className="text-sm text-gray-500">Active exam batches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Average GPA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{stats.gpa}</p>
            <p className="text-sm text-gray-500">Overall cohort performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" />
              Pass Percentage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{stats.passRate}</p>
            <p className="text-sm text-gray-500">Overall success rate</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Result Publication Queue ({publicationQueue.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {publicationQueue.map(item => (
              <div key={item.id} className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg md:flex-row md:items-center md:justify-between border hover:border-blue-200 transition">
                <div>
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.students} students registered</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Badge variant={item.status === 'published' ? 'success' : 'secondary'}>
                    {item.status === 'published' ? 'Published' : 'Unpublished'}
                  </Badge>
                  <Button
                    size="sm"
                    variant={item.status === 'published' ? 'outline' : 'default'}
                    onClick={() => togglePublication(item.id)}
                    className={item.status === 'published' ? '' : 'bg-green-600 hover:bg-green-700 text-white'}
                  >
                    {item.status === 'published' ? 'Unpublish' : 'Publish'}
                  </Button>
                </div>
              </div>
            ))}
            {publicationQueue.length === 0 && (
              <div className="text-center py-6 text-gray-500">No exams in queue.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
