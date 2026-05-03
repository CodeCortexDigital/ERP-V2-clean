import { useState } from 'react'
import { Save, Users, CheckCircle, XCircle, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

export default function AssignmentGrading() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assignment Grading</h1>
        <p className="text-gray-500 mt-1">Grade student submissions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Assignment: Sorting Algorithms - Week 5</CardTitle>
            <Badge>25 submissions pending</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Submitted On</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Grade /100</th>
                  <th className="px-6 py-3">Feedback</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white border-b">
                  <td className="px-6 py-4">John Doe</td>
                  <td className="px-6 py-4">Dec 10, 2024</td>
                  <td className="px-6 py-4"><Badge variant="warning">Pending</Badge></td>
                  <td className="px-6 py-4"><Input type="number" className="w-20" placeholder="0" /></td>
                  <td className="px-6 py-4"><Input placeholder="Add feedback..." /></td>
                  <td className="px-6 py-4"><Button size="sm">View Submission</Button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <Button className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save All Grades
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
