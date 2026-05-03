import { useState } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export default function AcademicYearsManagement() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Academic Years</h1><p className="text-gray-500">Manage academic years</p></div>
        <Button>Add Academic Year</Button>
      </div>
      <div className="bg-white rounded-lg border p-8 text-center text-gray-500">Academic years management coming soon</div>
    </div>
  )
}
