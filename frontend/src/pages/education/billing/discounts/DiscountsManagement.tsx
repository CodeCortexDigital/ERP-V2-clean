import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Percent, Calendar, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

interface Discount {
  id: number
  name: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  applicable_to: 'all' | 'specific_program' | 'merit' | 'need_based'
  start_date: string
  end_date: string
  max_uses: number
  used_count: number
  status: 'active' | 'expired' | 'draft'
}

export default function DiscountsManagement() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    // Fetch discounts
    fetchDiscounts()
  }, [])

  const fetchDiscounts = async () => {
    try {
      // API call will be implemented
      setLoading(false)
    } catch (error) {
      console.error('Error fetching discounts:', error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discounts Management</h1>
          <p className="text-gray-500 mt-1">Manage fee discounts and scholarships</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Discount
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Discounts</p>
                <p className="text-2xl font-bold text-green-600">0</p>
              </div>
              <Percent className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Used</p>
                <p className="text-2xl font-bold text-blue-600">0</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Discount</p>
                <p className="text-2xl font-bold text-purple-600">0%</p>
              </div>
              <Percent className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-600">0</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Discounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Value</th>
                  <th className="px-6 py-3">Valid Period</th>
                  <th className="px-6 py-3">Usage</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map((discount) => (
                  <tr key={discount.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs">{discount.code}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{discount.name}</td>
                    <td className="px-6 py-4 capitalize">{discount.type}</td>
                    <td className="px-6 py-4">
                      {discount.type === 'percentage' ? `${discount.value}%` : `PKR ${discount.value}`}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {discount.start_date} → {discount.end_date}
                    </td>
                    <td className="px-6 py-4">
                      {discount.used_count} / {discount.max_uses}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={discount.status === 'active' ? 'success' : 'secondary'}>
                        {discount.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-800">Edit</button>
                        <button className="text-red-600 hover:text-red-800">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {discounts.length === 0 && !loading && (
            <div className="text-center py-8">
              <Percent className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No discounts created yet</p>
              <Button variant="outline" className="mt-3" onClick={() => setShowForm(true)}>
                Create First Discount
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
