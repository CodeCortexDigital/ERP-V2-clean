import { useState } from 'react'
import { Plus, Search, Eye, Edit, Trash2, DollarSign, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface Invoice {
  id: number
  invoice_number: string
  student_name: string
  student_id: string
  amount: number
  due_date: string
  status: string
  payment_date: string | null
}

const SAMPLE_INVOICES: Invoice[] = [
  { id: 1, invoice_number: 'INV-2024-001', student_name: 'Ahmed Khan', student_id: 'STU-001', amount: 25000, due_date: '2024-02-15', status: 'paid', payment_date: '2024-02-10' },
  { id: 2, invoice_number: 'INV-2024-002', student_name: 'Sara Ahmed', student_id: 'STU-002', amount: 25000, due_date: '2024-02-15', status: 'pending', payment_date: null },
]

export default function BillingManagement() {
  const [invoices, setInvoices] = useState(SAMPLE_INVOICES)
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold text-gray-900">Billing & Fee Management</h1><p className="text-gray-500">Manage student invoices and payments</p></div><Button><Plus className="h-4 w-4 mr-2" />Create Invoice</Button></div>
      <div className="flex gap-4"><div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Search invoices..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div></div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr><th className="px-4 py-3 text-left">Invoice #</th><th className="px-4 py-3 text-left">Student</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-left">Due Date</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Payment Date</th><th className="px-4 py-3 text-center">Actions</th></tr>
          </thead>
          <tbody>
            {invoices.map(i => (
              <tr key={i.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono">{i.invoice_number}</td>
                <td className="px-4 py-3">{i.student_name}<br/><span className="text-xs text-gray-500">{i.student_id}</span></td>
                <td className="px-4 py-3 text-right font-mono">${i.amount.toLocaleString()}</td>
                <td className="px-4 py-3">{i.due_date}</td>
                <td className="px-4 py-3"><Badge variant={i.status === 'paid' ? 'success' : 'warning'}>{i.status}</Badge></td>
                <td className="px-4 py-3">{i.payment_date || '-'}</td>
                <td className="px-4 py-3 text-center"><div className="flex gap-2"><button className="text-blue-600"><Eye className="h-4 w-4" /></button><button className="text-green-600"><Download className="h-4 w-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
