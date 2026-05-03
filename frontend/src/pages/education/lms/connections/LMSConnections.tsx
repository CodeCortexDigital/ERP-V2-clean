import { Plus, Plug, Settings, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
export default function LMSConnections() {
  return (<div className="space-y-6"><div className="flex justify-between"><div><h1 className="text-2xl font-bold">LMS Connections</h1><p className="text-gray-500">Connect to external LMS platforms</p></div><Button><Plus className="w-4 h-4" /> Add Connection</Button></div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <Card><CardHeader><div className="flex justify-between"><CardTitle>Moodle</CardTitle><Badge variant="success">Connected</Badge></div></CardHeader><CardContent><p className="text-sm">Version: 4.2</p><p className="text-sm">Last Sync: 2 mins ago</p><div className="flex gap-2 mt-3"><Button size="sm" variant="outline"><RefreshCw className="w-3 h-3" /> Sync</Button><Button size="sm" variant="outline"><Settings className="w-3 h-3" /> Configure</Button></div></CardContent></Card>
    <Card><CardHeader><div className="flex justify-between"><CardTitle>Canvas</CardTitle><Badge variant="secondary">Not Connected</Badge></div></CardHeader><CardContent><Button className="w-full mt-2">Connect</Button></CardContent></Card>
  </div></div>)
}
