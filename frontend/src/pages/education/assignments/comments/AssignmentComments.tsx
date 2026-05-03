import { useState } from 'react'
import { Send, MessageSquare, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'

export default function AssignmentComments() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assignment Comments</h1>
        <p className="text-gray-500 mt-1">Discussion and feedback on assignments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment: Data Structures Project</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <Avatar className="w-8 h-8 bg-blue-500 text-white flex items-center justify-center rounded-full">JD</Avatar>
              <div className="flex-1">
                <p className="font-medium text-sm">John Doe</p>
                <p className="text-sm text-gray-600">Great assignment! Learned a lot about binary trees.</p>
                <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
              </div>
              <Button variant="ghost" size="sm"><ThumbsUp className="w-4 h-4" /></Button>
            </div>

            <div className="flex gap-3 mt-4">
              <Avatar className="w-8 h-8 bg-gray-300 flex items-center justify-center rounded-full">You</Avatar>
              <div className="flex-1 flex gap-2">
                <Input placeholder="Write a comment..." />
                <Button size="sm" className="flex items-center gap-1">
                  <Send className="w-3 h-3" /> Post
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
