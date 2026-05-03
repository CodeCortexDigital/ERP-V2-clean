import { useState } from 'react'
import { CreditCard, DollarSign, Receipt, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

export default function FeeCollection() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fee Collection</h1>
        <p className="text-gray-500 mt-1">Process student fee payments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Student ID / Roll Number</Label>
              <Input placeholder="Enter student ID" />
            </div>
            <div>
              <Label>Student Name</Label>
              <Input placeholder="Auto-populated" disabled />
            </div>
            <div>
              <Label>Amount Due</Label>
              <Input placeholder="0" disabled />
            </div>
            <div>
              <Label>Amount Paying</Label>
              <Input type="number" placeholder="Enter amount" />
            </div>
            <div>
              <Label>Payment Method</Label>
              <select className="w-full rounded-lg border p-2">
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>Credit Card</option>
                <option>Cheque</option>
              </select>
            </div>
            <Button className="w-full">Process Payment</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-3" />
              <p>No recent transactions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
