import { useState } from 'react'
import { Plus, Calendar, CreditCard, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function PaymentPlans() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Plans</h1>
          <p className="text-gray-500 mt-1">Manage installment plans for fee payment</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quarterly Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">4 Installments</p>
            <p className="text-sm text-gray-500 mt-1">Due every 3 months</p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>1st Installment:</span>
                <span>25%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>2nd Installment:</span>
                <span>25%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>3rd Installment:</span>
                <span>25%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>4th Installment:</span>
                <span>25%</span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4">Assign to Student</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">12 Installments</p>
            <p className="text-sm text-gray-500 mt-1">Monthly payments</p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Monthly Payment:</span>
                <span>8.33%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Processing Fee:</span>
                <span>PKR 500</span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4">Assign to Student</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Semester Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">2 Installments</p>
            <p className="text-sm text-gray-500 mt-1">Start and mid-semester</p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>At Registration:</span>
                <span>50%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Mid Semester:</span>
                <span>50%</span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4">Assign to Student</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            Late Payment Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Grace Period</p>
              <p className="text-gray-500">15 days after due date</p>
            </div>
            <div>
              <p className="font-medium">Late Fee</p>
              <p className="text-gray-500">PKR 1,000 + 5% of due amount</p>
            </div>
            <div>
              <p className="font-medium">Interest Rate</p>
              <p className="text-gray-500">1.5% per month after 30 days</p>
            </div>
            <div>
              <p className="font-medium">Hold Services After</p>
              <p className="text-gray-500">60 days overdue</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
