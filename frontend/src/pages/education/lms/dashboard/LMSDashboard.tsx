import { Plug, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
export default function LMSDashboard() {
  return (<div className="space-y-6"><div><h1 className="text-2xl font-bold">LMS Dashboard</h1><p className="text-gray-500">LMS integration overview</p></div>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <Card><CardContent className="pt-6"><div><p className="text-sm text-gray-500">Connected LMS</p><p className="text-2xl font-bold">1</p></div></CardContent></Card>
    <Card><CardContent className="pt-6"><div><p className="text-sm text-gray-500">Courses Synced</p><p className="text-2xl font-bold">0</p></div></CardContent></Card>
    <Card><CardContent className="pt-6"><div><p className="text-sm text-gray-500">Last Sync</p><p className="text-2xl font-bold text-green-600">Success</p></div></CardContent></Card>
  </div></div>)
}
