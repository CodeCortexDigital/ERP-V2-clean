import { useState } from 'react'
import { Plus, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function DonationsManagement() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Donations</h1><p className="text-gray-500">Manage alumni donations</p></div>
        <Button>Record Donation</Button>
      </div>
      <div className="bg-white rounded-lg border p-8 text-center text-gray-500">Donations management coming soon</div>
    </div>
  )
}
