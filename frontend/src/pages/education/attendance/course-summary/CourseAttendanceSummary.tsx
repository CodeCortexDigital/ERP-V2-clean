import { useState } from 'react'
import { BookOpen, TrendingUp, Users, Calendar, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'

export default function CourseAttendanceSummary() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Course Attendance Summary</h1>
        <p className="text-gray-500 mt-1">Attendance statistics by course</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>CS101 - Programming Fundamentals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Overall Attendance:</span>
                <span className="font-bold">0%</span>
              </div>
              <Progress value={0} />
              <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                <div>Total Classes: 0</div>
                <div>Students Enrolled: 0</div>
                <div>Avg Present: 0</div>
                <div>Avg Absent: 0</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CS201 - Data Structures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Overall Attendance:</span>
                <span className="font-bold">0%</span>
              </div>
              <Progress value={0} />
              <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                <div>Total Classes: 0</div>
                <div>Students Enrolled: 0</div>
                <div>Avg Present: 0</div>
                <div>Avg Absent: 0</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Attendance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Chart will appear here (Weekly attendance trend)
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
