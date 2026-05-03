import { useState } from 'react'
import { Mail, Phone, Users, Send, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'

export default function ParentNotification() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parent Notifications</h1>
        <p className="text-gray-500 mt-1">Send attendance notifications to parents</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Send Notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select Student</Label>
              <select className="w-full mt-1 rounded-lg border p-2">
                <option>John Doe (Father: Ahmed Raza)</option>
                <option>Jane Smith (Mother: Sara Khan)</option>
              </select>
            </div>
            <div>
              <Label>Notification Type</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input type="radio" name="type" defaultChecked /> Email
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="type" /> SMS
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="type" /> Both
                </label>
              </div>
            </div>
            <div>
              <Label>Subject</Label>
              <Input placeholder="Attendance Alert" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea rows={4} placeholder="Dear Parent, your child's attendance is below the required threshold..." />
            </div>
            <Button className="w-full flex items-center gap-2 justify-center">
              <Send className="w-4 h-4" /> Send Notification
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">Attendance Alert</p>
                    <p className="text-xs text-gray-500">Sent to John Doe's parent</p>
                  </div>
                  <Badge variant="success">Sent</Badge>
                </div>
                <p className="text-xs text-gray-400 mt-2">Dec 10, 2024 - 09:30 AM</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
