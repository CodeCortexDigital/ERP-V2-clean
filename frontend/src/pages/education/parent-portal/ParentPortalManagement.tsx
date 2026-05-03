import { useState } from 'react'
import { Plus, Search, Users, Mail, Phone, Eye, Edit, Trash2, MessageSquare, Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface Parent {
  id: number
  parent_name: string
  email: string
  phone: string
  children: string[]
  status: 'active' | 'inactive'
  last_login: string
  notifications_enabled: boolean
}

const SAMPLE_PARENTS: Parent[] = [
  { id: 1, parent_name: 'Mr. Ahmed Khan', email: 'ahmed.parent@example.com', phone: '+92 300 1111111', children: ['Ahmed Khan (STU-001)'], status: 'active', last_login: '2024-03-10', notifications_enabled: true },
  { id: 2, parent_name: 'Mrs. Fatima Ahmed', email: 'fatima.parent@example.com', phone: '+92 321 2222222', children: ['Sara Ahmed (STU-002)'], status: 'active', last_login: '2024-03-12', notifications_enabled: true },
]

export default function ParentPortalManagement() {
  const [parents, setParents] = useState(SAMPLE_PARENTS)
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parent Portal</h1>
          <p className="text-gray-500">Manage parent accounts, communications, and access</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Add Parent</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Registered Parents</p><p className="text-2xl font-bold text-blue-600">156</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Active Portals</p><p className="text-2xl font-bold text-green-600">142</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Notifications Sent</p><p className="text-2xl font-bold text-purple-600">2,450</p></div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search parents..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr><th className="px-4 py-3 text-left">Parent Name</th><th className="px-4 py-3 text-left">Contact</th><th className="px-4 py-3 text-left">Children</th><th className="px-4 py-3 text-left">Last Login</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-center">Notifications</th><th className="px-4 py-3 text-center">Actions</th></tr>
          </thead>
          <tbody>
            {parents.map(p => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.parent_name}</td>
                <td className="px-4 py-3"><div className="flex flex-col gap-1"><span className="text-sm flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span><span className="text-sm flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span></div></td>
                <td className="px-4 py-3"><ul className="text-sm list-disc list-inside">{p.children.map(c => <li key={c}>{c}</li>)}</ul></td>
                <td className="px-4 py-3">{p.last_login}</td>
                <td className="px-4 py-3"><Badge variant={p.status === 'active' ? 'success' : 'secondary'}>{p.status}</Badge></td>
                <td className="px-4 py-3 text-center">{p.notifications_enabled ? <Bell className="h-4 w-4 text-green-500 inline" /> : <Bell className="h-4 w-4 text-gray-400 inline" />}</td>
                <td className="px-4 py-3 text-center"><div className="flex justify-center gap-2"><button className="text-blue-600"><Eye className="h-4 w-4" /></button><button className="text-green-600"><MessageSquare className="h-4 w-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
