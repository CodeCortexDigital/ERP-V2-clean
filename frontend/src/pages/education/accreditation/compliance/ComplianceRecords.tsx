import { useState } from 'react'
import { Plus, FileCheck, Upload, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export default function ComplianceRecords() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Records</h1>
          <p className="text-gray-500 mt-1">Track accreditation compliance and documentation</p>
        </div>
        <Button className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload Record
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">0</p>
            <p className="text-sm text-gray-500 mt-1">Compliance documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">0</p>
            <p className="text-sm text-gray-500 mt-1">Awaiting verification</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">0</p>
            <p className="text-sm text-gray-500 mt-1">Within 30 days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Compliance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <FileCheck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No compliance records found</p>
            <Button variant="outline" className="mt-3">Upload First Record</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
