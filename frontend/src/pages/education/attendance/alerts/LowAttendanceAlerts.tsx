import { useState } from 'react'
import { AlertTriangle, Bell, Send, Users, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import { Label } from '@/components/ui/Label'

export default function LowAttendanceAlerts() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Low Attendance Alerts</h1>
        <p className="text-gray-500 mt-1">Configure and manage attendance threshold alerts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alert Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Auto Alerts</Label>
            <Switch defaultChecked />
          </div>
          <div>
            <Label>Alert Threshold (%)</Label>
            <select className="w-full mt-1 rounded-lg border p-2">
              <option>75%</option>
              <option>80%</option>
              <option>85%</option>
            </select>
          </div>
          <div>
            <Label>Alert Frequency</Label>
            <select className="w-full mt-1 rounded-lg border p-2">
              <option>Weekly</option>
              <option>Bi-weekly</option>
              <option>Monthly</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Students Below Threshold</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <div>
                <p className="font-medium">John Doe - CS101</p>
                <p className="text-sm text-red-600">Attendance: 65%</p>
              </div>
              <Button size="sm" variant="outline" className="flex items-center gap-1">
                <Send className="w-3 h-3" /> Notify
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
