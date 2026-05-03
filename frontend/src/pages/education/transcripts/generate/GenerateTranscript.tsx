import { useState } from 'react'
import { Download, Printer, Search, Eye, FileText, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'

export default function GenerateTranscript() {
  const [studentId, setStudentId] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('official')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Generate Transcript</h1>
        <p className="text-gray-500 mt-1">Generate official student transcripts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Transcript Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Student ID / Roll Number</Label>
              <div className="flex gap-2 mt-1">
                <Input 
                  placeholder="Enter student ID"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
                <Button variant="outline">Search</Button>
              </div>
            </div>
            <div>
              <Label>Student Name</Label>
              <Input placeholder="Auto-populated" disabled />
            </div>
            <div>
              <Label>Program</Label>
              <Input placeholder="Auto-populated" disabled />
            </div>
            <div>
              <Label>Transcript Type</Label>
              <select className="w-full mt-1 rounded-lg border p-2">
                <option>Official Transcript</option>
                <option>Unofficial Transcript</option>
                <option>Provisional Certificate</option>
                <option>Detailed Marks Sheet</option>
              </select>
            </div>
            <div>
              <Label>Template</Label>
              <select className="w-full mt-1 rounded-lg border p-2">
                <option>Standard Official</option>
                <option>With CGPA Only</option>
                <option>Detailed with Grades</option>
              </select>
            </div>
            <div>
              <Label>Include</Label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked /> CGPA
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked /> Semester-wise Grades
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" /> Course Details
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" /> Honors/Awards
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview & Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-6 bg-gray-50 mb-4">
              <div className="text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Transcript Preview</p>
                <p className="text-xs text-gray-400 mt-1">Enter student ID to preview</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Digitally Verified</span>
                </div>
                <Badge variant="success">Secure</Badge>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1 flex items-center gap-2 justify-center">
                  <Download className="w-4 h-4" /> Generate PDF
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Printer className="w-4 h-4" /> Print
                </Button>
              </div>

              <p className="text-xs text-gray-400 text-center mt-3">
                Transcript includes digital signature for verification
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
