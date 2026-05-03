import { useState } from 'react'
import { Save, Calendar, FileText, Upload, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'

export default function CreateAssignment() {
  const [formData, setFormData] = useState({
    title: '',
    course: '',
    type: '',
    points: 100,
    due_date: '',
    instructions: '',
    attachments: [] as File[]
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Assignment</h1>
        <p className="text-gray-500 mt-1">Create a new assignment for your course</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Assignment Title *</Label>
                <Input placeholder="e.g., Week 5: Sorting Algorithms" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Course *</Label>
                  <select className="w-full mt-1 rounded-lg border p-2">
                    <option>CS101 - Programming Fundamentals</option>
                    <option>CS201 - Data Structures</option>
                    <option>CS301 - Database Systems</option>
                  </select>
                </div>
                <div>
                  <Label>Assignment Type *</Label>
                  <select className="w-full mt-1 rounded-lg border p-2">
                    <option>Homework</option>
                    <option>Quiz</option>
                    <option>Project</option>
                    <option>Group Work</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Points *</Label>
                  <Input type="number" defaultValue={100} />
                </div>
                <div>
                  <Label>Due Date *</Label>
                  <Input type="datetime-local" />
                </div>
              </div>
              <div>
                <Label>Instructions / Description</Label>
                <Textarea rows={5} placeholder="Describe the assignment requirements and expectations..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Drag and drop files here, or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">Supports: PDF, DOC, DOCX, ZIP (Max 50MB)</p>
                <Button variant="outline" size="sm" className="mt-3">Browse Files</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">Allow Late Submissions</Label>
                <input type="checkbox" className="toggle" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">Show Grades Immediately</Label>
                <input type="checkbox" className="toggle" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">Enable Plagiarism Check</Label>
                <input type="checkbox" className="toggle" />
              </div>
              <div>
                <Label>Late Penalty (% per day)</Label>
                <Input type="number" defaultValue={10} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assign To</CardTitle>
            </CardHeader>
            <CardContent>
              <select className="w-full rounded-lg border p-2 mb-3">
                <option>All Students</option>
                <option>Section A</option>
                <option>Section B</option>
                <option>Specific Group</option>
              </select>
              <Button variant="outline" className="w-full flex items-center gap-2 justify-center">
                <Plus className="w-4 h-4" />
                Select Specific Students
              </Button>
            </CardContent>
          </Card>

          <Button className="w-full flex items-center gap-2 justify-center">
            <Save className="w-4 h-4" />
            Create Assignment
          </Button>
        </div>
      </div>
    </div>
  )
}
