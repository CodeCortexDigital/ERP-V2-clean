import { useState } from 'react'
import { Plus, Search, Building, MapPin, Calendar, Wrench, Eye, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface Facility {
  id: number
  name: string
  type: string
  building: string
  floor: number
  capacity: number
  status: 'available' | 'maintenance' | 'occupied' | 'reserved'
  amenities: string[]
}

const SAMPLE_FACILITIES: Facility[] = [
  { id: 1, name: 'Computer Lab A', type: 'Lab', building: 'Engineering Block', floor: 2, capacity: 30, status: 'available', amenities: ['AC', 'Projector', 'WiFi'] },
  { id: 2, name: 'Conference Room 101', type: 'Conference', building: 'Admin Block', floor: 1, capacity: 20, status: 'reserved', amenities: ['Smart Board', 'Video Conference', 'AC'] },
  { id: 3, name: 'Main Library', type: 'Library', building: 'Library Block', floor: 1, capacity: 200, status: 'available', amenities: ['WiFi', 'Reading Areas', 'Study Rooms'] },
]

export default function CampusManagement() {
  const [facilities, setFacilities] = useState(SAMPLE_FACILITIES)
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold text-gray-900">Campus & Facilities</h1><p className="text-gray-500">Manage buildings, rooms, and campus resources</p></div><Button><Plus className="h-4 w-4 mr-2" />Add Facility</Button></div>
      <div className="flex gap-4"><div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Search facilities..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {facilities.map(f => (<div key={f.id} className="bg-white rounded-lg border p-4 hover:shadow-lg transition-shadow"><div className="flex justify-between items-start mb-3"><div><h3 className="font-semibold text-gray-900">{f.name}</h3><p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{f.building}, Floor {f.floor}</p></div><Badge variant={f.status === 'available' ? 'success' : f.status === 'reserved' ? 'warning' : 'destructive'}>{f.status}</Badge></div><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-500">Type:</span><span>{f.type}</span></div><div className="flex justify-between"><span className="text-gray-500">Capacity:</span><span>{f.capacity} people</span></div><div className="flex justify-between"><span className="text-gray-500">Amenities:</span><span>{f.amenities.join(', ')}</span></div></div><div className="flex justify-end gap-2 mt-3"><button className="text-blue-600"><Eye className="h-4 w-4" /></button><button className="text-green-600"><Edit className="h-4 w-4" /></button><button className="text-red-600"><Trash2 className="h-4 w-4" /></button></div></div>))}
      </div>
    </div>
  )
}
