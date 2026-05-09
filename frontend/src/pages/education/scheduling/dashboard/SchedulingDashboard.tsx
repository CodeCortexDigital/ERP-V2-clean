import { Calendar, Clock, Users, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
export default function SchedulingDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Scheduling Dashboard</h1>
      <div className="grid grid-cols-4 gap-4 mt-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Total Offerings</p>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Rooms Used</p>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Faculty Assigned</p>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Conflicts</p>
            <p className="text-2xl font-bold text-red-600">0</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

