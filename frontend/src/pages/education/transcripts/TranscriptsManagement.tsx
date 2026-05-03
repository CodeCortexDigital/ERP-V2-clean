import { useState } from 'react'
import { Eye, Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export default function TranscriptsManagement() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Transcripts Management</h1><p className="text-gray-500">Manage student transcripts</p></div>
        <Button>Request Transcript</Button>
      </div>
      <div className="bg-white rounded-lg border p-8 text-center text-gray-500">Transcripts management coming soon</div>
    </div>
  )
}
