import { useState } from 'react'
import { Shield, AlertTriangle, CheckCircle, FileSearch, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'

export default function PlagiarismCheck() {
  const [isChecking, setIsChecking] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plagiarism Check</h1>
        <p className="text-gray-500 mt-1">Check assignments for academic integrity</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="w-5 h-5" />
              Run Plagiarism Check
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Upload assignment file to check</p>
              <Button variant="outline" size="sm" className="mt-3">Select File</Button>
            </div>
            <Button className="w-full mt-4" disabled={isChecking}>
              {isChecking ? 'Checking...' : 'Check Plagiarism'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Similarity Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No plagiarism checks run yet</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
