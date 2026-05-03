import { Plus, Calendar, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
export default function CourseOfferings() {
  return <div><div className="flex justify-between"><h1 className="text-2xl font-bold">Course Offerings</h1><Button><Plus className="w-4 h-4" /> Add Offering</Button></div><Card className="mt-4"><CardContent><div className="space-y-3"><div className="flex justify-between p-3 border rounded"><div><p className="font-medium">CS101 - Programming</p><p className="text-xs">Fall 2024 | Section A</p></div><Badge>Open</Badge></div></div></CardContent></Card></div> }
