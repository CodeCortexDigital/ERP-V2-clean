import { useState } from 'react'
import { FileText, Clock, CheckCircle, XCircle, Send, Download, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

interface TranscriptRequest {
  id: number
  student_name: string
  student_id: string
  request_date: string
  copies: number
  purpose: string
  delivery_method: 'pickup' | 'mail' | 'email'
  status: 'pending' | 'processing' | 'ready' | 'delivered'
}

export default function TranscriptRequests() {
  const [requests, setRequests] = useState<TranscriptRequest[]>([])
  const [showRequestForm, setShowRequestForm] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transcript Requests</h1>
          <p className="text-gray-500 mt-1">Manage student transcript requests</p>
        </div>
        <Button onClick={() => setShowRequestForm(true)} className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          New Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-orange-600">0</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Processing</p>
                <p className="text-2xl font-bold text-blue-600">0</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ready</p>
                <p className="text-2xl font-bold text-green-600">0</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-purple-600">0</p>
              </div>
              <Download className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Request Date</th>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Copies</th>
                  <th className="px-6 py-3">Delivery</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{request.request_date}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{request.student_name}</p>
                        <p className="text-xs">{request.student_id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">{request.copies}</td>
                    <td className="px-6 py-4 capitalize">{request.delivery_method}</td>
                    <td className="px-6 py-4">
                      <Badge variant={
                        request.status === 'pending' ? 'warning' :
                        request.status === 'processing' ? 'default' :
                        request.status === 'ready' ? 'success' : 'secondary'
                      }>
                        {request.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-800">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-800">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {requests.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No transcript requests yet</p>
              <Button variant="outline" className="mt-3" onClick={() => setShowRequestForm(true)}>
                Create First Request
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
