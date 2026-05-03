import { useState } from 'react'
import { Undo2, FileText, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'

export default function RefundProcessing() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Refund Processing</h1>
        <p className="text-gray-500 mt-1">Process student fee refunds</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>New Refund Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Student ID</Label>
              <Input placeholder="Enter student ID" />
            </div>
            <div>
              <Label>Refund Amount</Label>
              <Input type="number" placeholder="Enter amount" />
            </div>
            <div>
              <Label>Reason for Refund</Label>
              <select className="w-full rounded-lg border p-2">
                <option>Course Withdrawal</option>
                <option>Overpayment</option>
                <option>Financial Aid Adjustment</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <Label>Refund Method</Label>
              <select className="w-full rounded-lg border p-2">
                <option>Original Payment Method</option>
                <option>Bank Transfer</option>
                <option>Cash</option>
                <option>Cheque</option>
              </select>
            </div>
            <Button className="w-full">Submit Refund Request</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Undo2 className="w-12 h-12 mx-auto mb-3" />
              <p>No refund requests</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
