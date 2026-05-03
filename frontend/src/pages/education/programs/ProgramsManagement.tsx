import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function ProgramsManagement() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Programs</h1><p className="text-gray-500">Manage academic programs</p></div>
        <Button>Add Program</Button>
      </div>
      <div className="bg-white rounded-lg border p-8 text-center text-gray-500">Programs management coming soon</div>
    </div>
  )
}
