import { useState, useEffect } from 'react'
import { Plus, Users, Edit, Trash2, UserPlus, UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

interface AssignmentGroup {
  id: number
  name: string
  course: string
  member_count: number
  created_by: string
  status: 'active' | 'archived'
}

export default function AssignmentGroups() {
  const [groups, setGroups] = useState<AssignmentGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch groups from API
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    try {
      // API call: GET /api/education/assignments/groups/
      setLoading(false)
    } catch (error) {
      console.error('Error fetching groups:', error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignment Groups</h1>
          <p className="text-gray-500 mt-1">Create and manage student groups for collaborative assignments</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Group
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <Card key={group.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  {group.name}
                </CardTitle>
                <Badge variant={group.status === 'active' ? 'success' : 'secondary'}>
                  {group.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Course: {group.course}</p>
                <p className="text-sm text-gray-600">Members: {group.member_count} students</p>
                <p className="text-sm text-gray-600">Created by: {group.created_by}</p>
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button size="sm" variant="outline" className="flex items-center gap-1">
                    <UserPlus className="w-3 h-3" /> Add Members
                  </Button>
                  <Button size="sm" variant="outline" className="flex items-center gap-1">
                    <Edit className="w-3 h-3" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" className="flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {groups.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No assignment groups created yet</p>
          <Button variant="outline" className="mt-3">Create First Group</Button>
        </div>
      )}
    </div>
  )
}
