import { useState } from 'react'
import { Plus, Search, Eye, Edit, Trash2, Award, Calendar, CheckCircle, Clock, XCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface Accreditation {
  id: number
  body_name: string
  program: string
  status: 'applied' | 'in_review' | 'accredited' | 'renewal' | 'expired'
  accreditation_date: string
  expiry_date: string
  standards: string[]
  documents: number
  last_review: string
}

const SAMPLE_ACCREDITATIONS: Accreditation[] = [
  { id: 1, body_name: 'HEC', program: 'BS Computer Science', status: 'accredited', accreditation_date: '2022-06-15', expiry_date: '2027-06-14', standards: ['Curriculum', 'Faculty', 'Infrastructure'], documents: 5, last_review: '2024-01-15' },
  { id: 2, body_name: 'NCEAC', program: 'Software Engineering', status: 'in_review', accreditation_date: '2023-01-10', expiry_date: '2028-01-09', standards: ['Quality', 'Research'], documents: 3, last_review: '2024-02-10' },
  { id: 3, body_name: 'PEC', program: 'Electrical Engineering', status: 'applied', accreditation_date: '', expiry_date: '', standards: ['Curriculum', 'Lab Facilities'], documents: 2, last_review: '' },
]

export default function AccreditationManagement() {
  const [accreditations, setAccreditations] = useState(SAMPLE_ACCREDITATIONS)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')

  const stats = {
    total: accreditations.length,
    accredited: accreditations.filter(a => a.status === 'accredited').length,
    inReview: accreditations.filter(a => a.status === 'in_review').length,
    expiring: accreditations.filter(a => a.expiry_date && new Date(a.expiry_date) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Accreditation Management</h1><p className="text-gray-500">Manage program accreditations and standards compliance</p></div>
        <Button><Plus className="h-4 w-4 mr-2" />Apply for Accreditation</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Total Programs</p><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-gray-400">All programs</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Accredited</p><p className="text-2xl font-bold text-green-600">{stats.accredited}</p><p className="text-xs text-green-600">✓ Approved</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">In Review</p><p className="text-2xl font-bold text-yellow-600">{stats.inReview}</p><p className="text-xs text-yellow-600">⏳ Pending</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Expiring Soon</p><p className="text-2xl font-bold text-orange-600">{stats.expiring}</p><p className="text-xs text-orange-600">⚠️ Within 90 days</p></div>
      </div>

      <div className="flex flex-wrap gap-4 justify-between">
        <div className="flex gap-4">
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-4 py-2 border rounded-lg bg-white text-sm">
            <option value="All">All Status</option>
            <option value="accredited">Accredited</option>
            <option value="in_review">In Review</option>
            <option value="applied">Applied</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Search accreditations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Accrediting Body</th><th className="px-4 py-3 text-left">Program</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Accreditation Date</th><th className="px-4 py-3 text-left">Expiry Date</th><th className="px-4 py-3 text-left">Standards</th><th className="px-4 py-3 text-center">Documents</th><th className="px-4 py-3 text-center">Actions</th></tr></thead>
          <tbody>{accreditations.map(a => (<tr key={a.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 font-medium">{a.body_name}</td><td className="px-4 py-3">{a.program}</td><td className="px-4 py-3"><Badge variant={a.status === 'accredited' ? 'success' : a.status === 'in_review' ? 'warning' : 'info'}>{a.status.replace('_', ' ')}</Badge></td><td className="px-4 py-3">{a.accreditation_date || '-'}</td><td className="px-4 py-3">{a.expiry_date || '-'}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-1">{a.standards.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}</div></td><td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1"><FileText className="h-3 w-3" /><span>{a.documents}</span></div></td><td className="px-4 py-3 text-center"><div className="flex justify-center gap-2"><button className="text-blue-600"><Eye className="h-4 w-4" /></button><button className="text-green-600"><Edit className="h-4 w-4" /></button></div></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  )
}
