import { useState } from 'react'
import { Plus, Edit, Trash2, FileText, Code, Users, Target } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface AssignmentType {
  id: number
  name: string
  code: string
  icon: string
  default_points: number
  description: string
}

export default function AssignmentTypes() {
  const [types, setTypes] = useState<AssignmentType[]>([
    { id: 1, name: 'Homework', code: 'HW', icon: 'FileText', default_points: 100, description: 'Regular homework assignments' },
    { id: 2, name: 'Quiz', code: 'QUIZ', icon: 'Target', default_points: 50, description: 'Short quizzes and tests' },
    { id: 3, name: 'Project', code: 'PROJ', icon: 'Code', default_points: 200, description: 'Major projects and presentations' },
    { id: 4, name: 'Group Work', code: 'GROUP', icon: 'Users', default_points: 100, description: 'Collaborative group assignments' },
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignment Types</h1>
          <p className="text-gray-500 mt-1">Define types of assignments for courses</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Type
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {types.map((type) => {
          const IconComponent = type.icon === 'FileText' ? FileText : type.icon === 'Code' ? Code : type.icon === 'Users' ? Users : Target
          return (
            <Card key={type.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <IconComponent className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>{type.name}</CardTitle>
                      <p className="text-xs text-gray-500 font-mono">{type.code}</p>
                    </div>
                  </div>
                  <Badge variant="default">{type.default_points} pts</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{type.description}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Edit</Button>
                  <Button size="sm" variant="destructive">Delete</Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
