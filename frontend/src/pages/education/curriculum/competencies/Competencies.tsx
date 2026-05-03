import { Plus, Edit, Trash2, Target } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
export default function Competencies() {
  return <div><div className="flex justify-between"><h1 className="text-2xl font-bold">Competencies</h1><Button><Plus className="w-4 h-4" /> Add Competency</Button></div><Card className="mt-4"><CardContent><div className="space-y-2">{['Programming', 'Problem Solving', 'Critical Thinking', 'Communication'].map(c => <div key={c} className="flex justify-between p-2 border-b"><span>{c}</span><div className="flex gap-2"><button><Edit className="w-4 h-4" /></button><button><Trash2 className="w-4 h-4 text-red-500" /></button></div></div>)}</div></CardContent></Card></div> }
}
