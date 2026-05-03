import { useState } from 'react'
import { Search, Eye, CreditCard, Download, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface StudentAccount {
  id: number
  student_name: string
  student_id: string
  program: string
  total_due: number
  paid: number
  balance: number
  status: 'good' | 'overdue' | 'pending'
}

export default function StudentAccounts() {
  const [searchTerm, setSearchTerm] = useState('')

  const accounts: StudentAccount[] = [] // Will be fetched from API

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Accounts</h1>
        <p className="text-gray-500 mt-1">Manage student fee accounts and payment history</p>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input 
            placeholder="Search by student name or ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <Button variant="outline">Advanced Filter</Button>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Total Outstanding</p>
            <p className="text-2xl font-bold text-red-600">PKR 0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Overdue Accounts</p>
            <p className="text-2xl font-bold text-orange-600">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Collection Rate</p>
            <p className="text-2xl font-bold text-green-600">0%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Due This Month</p>
            <p className="text-2xl font-bold text-blue-600">PKR 0</p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Fee Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Student ID</th>
                  <th className="px-6 py-3">Student Name</th>
                  <th className="px-6 py-3">Program</th>
                  <th className="px-6 py-3">Total Due</th>
                  <th className="px-6 py-3">Paid</th>
                  <th className="px-6 py-3">Balance</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{account.student_id}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{account.student_name}</td>
                    <td className="px-6 py-4">{account.program}</td>
                    <td className="px-6 py-4">PKR {account.total_due.toLocaleString()}</td>
                    <td className="px-6 py-4">PKR {account.paid.toLocaleString()}</td>
                    <td className="px-6 py-4 font-medium text-red-600">PKR {account.balance.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <Badge variant={account.status === 'good' ? 'success' : account.status === 'overdue' ? 'destructive' : 'warning'}>
                        {account.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-800">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {accounts.length === 0 && (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No student accounts found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
