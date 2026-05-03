import { useState } from 'react'
import { Plus, RefreshCw, Link, Unlink, CheckCircle, XCircle, Clock, Database, BookOpen, Users, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface LMSConnection {
  id: number
  name: string
  type: 'moodle' | 'canvas' | 'blackboard' | 'custom'
  status: 'connected' | 'disconnected' | 'syncing'
  last_sync: string
  courses_synced: number
  users_synced: number
}

const SAMPLE_CONNECTIONS: LMSConnection[] = [
  { id: 1, name: 'Moodle Production', type: 'moodle', status: 'connected', last_sync: '2024-03-15 08:00:00', courses_synced: 45, users_synced: 1200 },
  { id: 2, name: 'Canvas Test', type: 'canvas', status: 'disconnected', last_sync: '2024-03-10 14:30:00', courses_synced: 12, users_synced: 350 },
]

export default function LMSIntegration() {
  const [connections] = useState(SAMPLE_CONNECTIONS)
  const safeConnections = connections || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">LMS Integration</h1><p className="text-gray-500">Connect and sync with Learning Management Systems</p></div>
        <Button><Plus className="h-4 w-4 mr-2" />Add Connection</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {safeConnections.map(c => (
          <div key={c.id} className="bg-white rounded-lg border p-4">
            <div className="flex justify-between items-start mb-3">
              <div><h3 className="font-semibold">{c.name}</h3><p className="text-sm text-gray-500 capitalize">{c.type}</p></div>
              <Badge variant={c.status === 'connected' ? 'success' : c.status === 'syncing' ? 'warning' : 'destructive'}>{c.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><p className="text-sm text-gray-500">Courses Synced</p><p className="text-xl font-bold">{c.courses_synced}</p></div>
              <div><p className="text-sm text-gray-500">Users Synced</p><p className="text-xl font-bold">{c.users_synced.toLocaleString()}</p></div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-xs text-gray-400">Last sync: {c.last_sync}</span>
              <div className="flex gap-2"><Button variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-1" />Sync</Button><Button variant="outline" size="sm"><Settings className="h-4 w-4" /></Button></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
