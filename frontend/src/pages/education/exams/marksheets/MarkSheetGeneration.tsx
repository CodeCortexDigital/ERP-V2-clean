import { useState } from 'react'
import { FileText, Download, Printer, Search, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'

export default function MarkSheetGeneration() {
  const [studentId, setStudentId] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = () => {
    toast.success('Preparing Mark Sheet PDF download...')
    setTimeout(() => {
      window.print()
    }, 500)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mark Sheet Generation</h1>
          <p className="text-gray-500 mt-1">Generate student mark sheets and transcripts</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" className="flex items-center gap-1">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button onClick={handleExportPDF} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-4 h-4" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Student ID / Roll Number</Label>
              <Input 
                placeholder="Enter student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
            <div>
              <Label>Academic Term</Label>
              <select className="w-full mt-1 rounded-lg border p-2">
                <option>Fall 2024</option>
                <option>Spring 2024</option>
                <option>Summer 2024</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button className="w-full">Generate Mark Sheet</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Mark Sheet Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Mark Sheet Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-6 bg-white">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">ERP V2 University</h2>
              <p className="text-gray-600">Student Mark Sheet - Fall 2024</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 pb-4 border-b">
              <div>
                <p className="text-sm text-gray-500">Student Name</p>
                <p className="font-medium">-</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Roll Number</p>
                <p className="font-medium">-</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Program</p>
                <p className="font-medium">-</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Semester</p>
                <p className="font-medium">-</p>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Course Code</th>
                  <th className="p-2 text-left">Course Title</th>
                  <th className="p-2 text-center">Credit Hours</th>
                  <th className="p-2 text-center">Obtained</th>
                  <th className="p-2 text-center">Total</th>
                  <th className="p-2 text-center">Grade</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    Enter student ID to view mark sheet
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Credit Hours:</p>
                  <p className="font-medium">0</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">SGPA:</p>
                  <p className="font-medium text-lg text-green-600">0.00</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">CGPA:</p>
                  <p className="font-medium text-lg text-green-600">0.00</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Result:</p>
                  <Badge>Pending</Badge>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t text-center text-xs text-gray-400">
              This is a computer-generated document. No signature required.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
