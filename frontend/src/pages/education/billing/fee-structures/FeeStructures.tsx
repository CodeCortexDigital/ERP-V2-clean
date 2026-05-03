import { useState } from 'react'
import { Plus, Edit, Trash2, DollarSign, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function FeeStructures() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Structures</h1>
          <p className="text-gray-500 mt-1">Configure fee structures for programs and semesters</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Fee Structure
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              BS Computer Science
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tuition Fee:</span>
                <span className="font-medium">PKR 50,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Admission Fee:</span>
                <span className="font-medium">PKR 10,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Library Fee:</span>
                <span className="font-medium">PKR 5,000</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t">
                <span>Total per Semester:</span>
                <span>PKR 65,000</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline">Edit</Button>
              <Button size="sm" variant="outline">View Details</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              BBA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tuition Fee:</span>
                <span className="font-medium">PKR 45,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Admission Fee:</span>
                <span className="font-medium">PKR 10,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Library Fee:</span>
                <span className="font-medium">PKR 5,000</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t">
                <span>Total per Semester:</span>
                <span>PKR 60,000</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline">Edit</Button>
              <Button size="sm" variant="outline">View Details</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee Components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Tuition Fee</p>
                <p className="text-sm text-gray-500">Per credit hour: PKR 3,000</p>
              </div>
              <Badge>Required</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Admission Fee</p>
                <p className="text-sm text-gray-500">One-time fee</p>
              </div>
              <Badge>Required</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Library Fee</p>
                <p className="text-sm text-gray-500">Per semester</p>
              </div>
              <Badge>Optional</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
