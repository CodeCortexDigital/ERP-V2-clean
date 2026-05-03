import { useState } from 'react'
import { Plus, Search, Filter, Eye, Edit, Trash2, Mail, Phone, MapPin, Calendar, Award, BookOpen, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface Alumni {
  id: number
  student_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  graduation_year: number
  degree: string
  program: string
  current_employer: string
  position: string
  city: string
  country: string
  status: 'active' | 'inactive'
  donation_amount: number
}

const SAMPLE_ALUMNI: Alumni[] = [
  { id: 1, student_id: 'STU-001', first_name: 'Ahmed', last_name: 'Khan', email: 'ahmed.khan@example.com', phone: '+92 300 1234567', graduation_year: 2023, degree: 'BS Computer Science', program: 'Computer Science', current_employer: 'Tech Solutions Inc', position: 'Software Engineer', city: 'Karachi', country: 'Pakistan', status: 'active', donation_amount: 5000 },
  { id: 2, student_id: 'STU-002', first_name: 'Sara', last_name: 'Ahmed', email: 'sara.ahmed@example.com', phone: '+92 321 7654321', graduation_year: 2022, degree: 'MBA', program: 'Business Administration', current_employer: 'Global Corp', position: 'Marketing Manager', city: 'Lahore', country: 'Pakistan', status: 'active', donation_amount: 10000 },
  { id: 3, student_id: 'STU-003', first_name: 'Omar', last_name: 'Hassan', email: 'omar.hassan@example.com', phone: '+92 333 9876543', graduation_year: 2021, degree: 'BS Software Engineering', program: 'Software Engineering', current_employer: 'Innovatech', position: 'Tech Lead', city: 'Islamabad', country: 'Pakistan', status: 'active', donation_amount: 2500 },
]

export default function AlumniManagement() {
  const [alumni, setAlumni] = useState(SAMPLE_ALUMNI)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAlumni = alumni.filter(a =>
    a.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.program.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: alumni.length,
    active: alumni.filter(a => a.status === 'active').length,
    totalDonations: alumni.reduce((sum, a) => sum + a.donation_amount, 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alumni Management</h1>
          <p className="text-gray-500">Manage alumni records, donations, and engagement</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Add Alumni</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Total Alumni</p><p className="text-2xl font-bold">{stats.total}</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Active Members</p><p className="text-2xl font-bold text-green-600">{stats.active}</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Total Donations</p><p className="text-2xl font-bold text-blue-600">${stats.totalDonations.toLocaleString()}</p></div>
      </div>

      <div className="flex gap-4"><div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Search alumni..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div></div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full"><thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Program</th><th className="px-4 py-3 text-left">Graduation Year</th><th className="px-4 py-3 text-left">Employer</th><th className="px-4 py-3 text-left">Position</th><th className="px-4 py-3 text-right">Donations</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-center">Actions</th></tr></thead>
          <tbody>{filteredAlumni.map(a => (<tr key={a.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 font-medium">{a.first_name} {a.last_name}</td><td className="px-4 py-3">{a.program}</td><td className="px-4 py-3">{a.graduation_year}</td><td className="px-4 py-3">{a.current_employer}</td><td className="px-4 py-3">{a.position}</td><td className="px-4 py-3 text-right font-mono">${a.donation_amount.toLocaleString()}</td><td className="px-4 py-3"><Badge variant={a.status === 'active' ? 'success' : 'secondary'}>{a.status}</Badge></td><td className="px-4 py-3 text-center"><div className="flex justify-center gap-2"><button className="text-blue-600"><Eye className="h-4 w-4" /></button><button className="text-green-600"><Edit className="h-4 w-4" /></button><button className="text-red-600"><Trash2 className="h-4 w-4" /></button></div></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  )
}
