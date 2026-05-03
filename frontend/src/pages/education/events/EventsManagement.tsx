import { useState } from 'react'
import { Plus, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function EventsManagement() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Events</h1><p className="text-gray-500">Manage alumni events</p></div>
        <Button>Create Event</Button>
      </div>
      <div className="bg-white rounded-lg border p-8 text-center text-gray-500">Events management coming soon</div>
    </div>
  )
}
