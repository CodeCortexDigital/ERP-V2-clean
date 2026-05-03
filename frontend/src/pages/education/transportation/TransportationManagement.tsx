import { useState } from 'react'
import { Plus, Search, Bus, MapPin, Calendar, Eye, Edit, Trash2, Users, Fuel } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface Bus {
  id: number
  bus_number: string
  driver_name: string
  driver_phone: string
  route: string
  capacity: number
  students_assigned: number
  status: 'active' | 'maintenance' | 'inactive'
}

const SAMPLE_BUSES: Bus[] = [
  { id: 1, bus_number: 'BUS-001', driver_name: 'Mr. Ali', driver_phone: '+92 300 1234567', route: 'North Route', capacity: 40, students_assigned: 35, status: 'active' },
  { id: 2, bus_number: 'BUS-002', driver_name: 'Mr. Bilal', driver_phone: '+92 321 7654321', route: 'South Route', capacity: 40, students_assigned: 32, status: 'active' },
]

export default function TransportationManagement() {
  const [buses, setBuses] = useState(SAMPLE_BUSES)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Transportation Management</h1><p className="text-gray-500">Manage bus routes, drivers, and student transportation</p></div>
        <Button><Plus className="h-4 w-4 mr-2" />Add Bus</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Active Buses</p><p className="text-2xl font-bold text-blue-600">12</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Students Transported</p><p className="text-2xl font-bold text-green-600">425</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Routes</p><p className="text-2xl font-bold text-purple-600">8</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Drivers</p><p className="text-2xl font-bold text-orange-600">14</p></div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr><th>Bus Number</th><th>Driver</th><th>Route</th><th>Capacity</th><th>Students</th><th>Utilization</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {buses.map(b => (
              <tr key={b.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-medium">{b.bus_number}</td>
                <td className="px-4 py-3">{b.driver_name}<br/><span className="text-xs text-gray-500">{b.driver_phone}</span></td>
                <td className="px-4 py-3"><div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{b.route}</div></td>
                <td className="px-4 py-3">{b.capacity}</td>
                <td className="px-4 py-3">{b.students_assigned}</td>
                <td className="px-4 py-3">{Math.round((b.students_assigned / b.capacity) * 100)}%</td>
                <td className="px-4 py-3"><Badge variant={b.status === 'active' ? 'success' : 'destructive'}>{b.status}</Badge></td>
                <td className="px-4 py-3"><div className="flex gap-2"><button className="text-blue-600"><Eye className="h-4 w-4" /></button><button className="text-green-600"><Edit className="h-4 w-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
