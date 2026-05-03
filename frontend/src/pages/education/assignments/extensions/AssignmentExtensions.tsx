import { useState } from 'react'
import { Clock, CheckCircle, XCircle, Calendar, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'

export default function AssignmentExtensions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assignment Extensions</h1>
        <p className="text-gray-500 mt-1">Request and manage assignment deadline extensions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Extension</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Assignment</Label>
              <select className="w-full mt-1 rounded-lg border p-2">
                <option>Sorting Algorithms - Due Dec 15</option>
                <option>Data Structures Project - Due Dec 20</option>
              </select>
            </div>
            <div>
              <Label>Requested Extension (days)</Label>
              <Input type="number" placeholder="Number of days" />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea rows={3} placeholder="Please explain why you need an extension..." />
            </div>
            <Button className="w-full flex items-center gap-2 justify-center">
              <Send className="w-4 h-4" />
              Submit Request
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Extension Requests (Instructor View)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">John Doe - Sorting Algorithms</p>
                  <p className="text-xs text-gray-500">Requested: 3 days</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="success">Approve</Button>
                  <Button size="sm" variant="destructive">Deny</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
