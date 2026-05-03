import { useState } from 'react'
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface FeeStructure {
  id: number
  program: string
  semester: number
  fee_type: string
  amount: number
  due_date: string
  late_fee: number
  status: 'active' | 'inactive'
}

const SAMPLE_FEE_STRUCTURES: FeeStructure[] = [
  { id: 1, program: 'Computer Science', semester: 1, fee_type: 'Tuition', amount: 50000, due_date: '2024-03-15', late_fee: 1000, status: 'active' },
  { id: 2, program: 'Computer Science', semester: 1, fee_type: 'Lab Fee', amount: 5000, due_date: '2024-03-15', late_fee: 200, status: 'active' },
  { id: 3, program: 'Business Administration', semester: 1, fee_type: 'Tuition', amount: 45000, due_date: '2024-03-15', late_fee: 1000, status: 'active' },
]

export default function TuitionManagement() {
  const [feeStructures, setFeeStructures] = useState(SAMPLE_FEE_STRUCTURES)
  const [activeTab, setActiveTab] = useState<'structures' | 'students'>('structures')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tuition Management</h1>
          <p className="text-gray-500">Manage fee structures, student payments, and financial tracking</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Fee Structure
        </Button>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('structures')}
          className={`px-4 py-2 font-medium ${activeTab === 'structures' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
        >
          Fee Structures
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 font-medium ${activeTab === 'students' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
        >
          Student Fees
        </button>
      </div>

      {activeTab === 'structures' && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Program</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Semester</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Fee Type</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Due Date</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Late Fee</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {feeStructures.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{f.program}</td>
                  <td className="px-4 py-3 text-sm">Semester {f.semester}</td>
                  <td className="px-4 py-3 text-sm">{f.fee_type}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">Rs. {f.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{f.due_date}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">Rs. {f.late_fee.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">
                    <Badge variant={f.status === 'active' ? 'success' : 'secondary'}>
                      {f.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <div className="flex justify-center gap-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-800">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="text-center py-8 text-gray-500">
          Student fee management coming soon
        </div>
      )}
    </div>
  )
}
