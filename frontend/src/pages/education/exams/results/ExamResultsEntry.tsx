import { useState } from 'react'
import { Save, Download, Printer, Search, Edit, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Label } from '@/components/ui/Label'

interface StudentResult {
  id: number
  roll_number: string
  student_name: string
  theory_marks: number
  practical_marks: number
  total_marks: number
  obtained_marks: number
  percentage: number
  grade: string
  status: 'pending' | 'entered' | 'verified'
}

export default function ExamResultsEntry() {
  const [results, setResults] = useState<StudentResult[]>([])
  const [selectedExam, setSelectedExam] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exam Results Entry</h1>
        <p className="text-gray-500 mt-1">Enter and manage student exam results</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Select Exam</Label>
              <select className="w-full mt-1 rounded-lg border p-2">
                <option>Mid Term 2024</option>
                <option>Final Term 2024</option>
                <option>Quiz 1</option>
              </select>
            </div>
            <div>
              <Label>Select Course</Label>
              <select className="w-full mt-1 rounded-lg border p-2">
                <option>CS101 - Programming</option>
                <option>CS201 - Data Structures</option>
                <option>CS301 - Databases</option>
              </select>
            </div>
            <div>
              <Label>Section</Label>
              <select className="w-full mt-1 rounded-lg border p-2">
                <option>A</option>
                <option>B</option>
                <option>C</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button className="w-full">Load Students</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Entry Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Results Entry Sheet</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Download className="w-3 h-3" /> Import CSV
              </Button>
              <Button size="sm" className="flex items-center gap-1">
                <Save className="w-3 h-3" /> Save All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Roll No</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Theory (80)</th>
                  <th className="px-4 py-3">Practical (20)</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id} className="bg-white border-b">
                    <td className="px-4 py-3">{result.roll_number}</td>
                    <td className="px-4 py-3 font-medium">{result.student_name}</td>
                    <td className="px-4 py-3">
                      <Input type="number" className="w-20" placeholder="0" />
                    </td>
                    <td className="px-4 py-3">
                      <Input type="number" className="w-20" placeholder="0" />
                    </td>
                    <td className="px-4 py-3">-</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">Pending</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {results.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Select exam and course to load students</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>Enter marks out of total marks shown in brackets</li>
            <li>Click Save All after entering marks for all students</li>
            <li>Results will be automatically calculated including GPA</li>
            <li>Use Import CSV for bulk entry</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
