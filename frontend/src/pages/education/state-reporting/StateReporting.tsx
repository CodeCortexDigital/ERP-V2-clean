import { useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export default function StateReporting() {
  return (<div className="space-y-6"><div className="flex justify-between"><div><h1 className="text-2xl font-bold text-gray-900">State Reporting</h1><p className="text-gray-500">Manage regulatory and compliance reports</p></div><Button><Download className="h-4 w-4 mr-2" />Generate Report</Button></div>
  <div className="bg-white rounded-lg border p-8 text-center text-gray-500">State reporting features coming soon</div></div>)
}
