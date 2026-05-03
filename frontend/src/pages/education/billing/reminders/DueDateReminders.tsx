import { useState } from 'react'
import { Bell, Mail, Send, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { Label } from '@/components/ui/Label'

export default function DueDateReminders() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Due Date Reminders</h1>
        <p className="text-gray-500 mt-1">Configure automatic fee reminder notifications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Reminder Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Auto Reminders</Label>
              <Switch defaultChecked />
            </div>
            <div>
              <Label>Days Before Due Date</Label>
              <select className="w-full mt-1 rounded-lg border p-2">
                <option>7 days before</option>
                <option>14 days before</option>
                <option>30 days before</option>
              </select>
            </div>
            <div>
              <Label>Reminder Frequency</Label>
              <select className="w-full mt-1 rounded-lg border p-2">
                <option>Once</option>
                <option>Weekly</option>
                <option>Daily after due date</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Notification Channels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Email Notifications</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>SMS Notifications</Label>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <Label>Push Notifications (App)</Label>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button className="flex items-center gap-2">
          <Send className="w-4 h-4" />
          Send Test Reminder
        </Button>
      </div>
    </div>
  )
}
