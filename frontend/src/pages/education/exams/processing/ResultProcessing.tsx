import { useState } from 'react'
import { Cpu, TrendingUp, Award, CheckCircle, Loader2, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'

const initialPublicationQueue = [
  { id: 'midterm-cs101', title: 'Mid Term 2024 - CS101', students: 125, status: 'unpublished' },
  { id: 'final-cs201', title: 'Final Term 2024 - CS201', students: 118, status: 'unpublished' },
]

export default function ResultProcessing() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [publicationQueue, setPublicationQueue] = useState(initialPublicationQueue)

  const handleProcess = () => {
    setIsProcessing(true)
    // Simulate processing
    let p = 0
    const interval = setInterval(() => {
      p += 10
      setProgress(p)
      if (p >= 100) {
        clearInterval(interval)
        setIsProcessing(false)
        setPublicationQueue(prev => prev.map(item => ({ ...item, status: 'published' })))
      }
    }, 500)
  }

  const togglePublication = (id: string) => {
    setPublicationQueue(prev => prev.map(item => item.id === id ? {
      ...item,
      status: item.status === 'published' ? 'unpublished' : 'published'
    } : item))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Result Processing</h1>
          <p className="text-gray-500 mt-1">Process and publish exam results</p>
        </div>
        <Button 
          onClick={handleProcess}
          disabled={isProcessing}
          className="flex items-center gap-2"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {isProcessing ? 'Processing...' : 'Process Results'}
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
                Calculating GPA, generating transcripts...
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
            <p className="text-2xl font-bold text-green-600">3</p>
            <p className="text-sm text-gray-500">Exams pending</p>
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
            <p className="text-2xl font-bold text-purple-600">0.00</p>
            <p className="text-sm text-gray-500">After processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-orange-600" />
              Pass Percentage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">0%</p>
            <p className="text-sm text-gray-500">After processing</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Result Publication Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {publicationQueue.map(item => (
              <div key={item.id} className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.students} students</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Badge variant={item.status === 'published' ? 'success' : 'secondary'}>
                    {item.status === 'published' ? 'Published' : 'Unpublished'}
                  </Badge>
                  <Button
                    size="sm"
                    variant={item.status === 'published' ? 'outline' : 'default'}
                    onClick={() => togglePublication(item.id)}
                  >
                    {item.status === 'published' ? 'Unpublish' : 'Publish'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
