import { BookOpen, TrendingUp, Award } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
export default function CurriculumDashboard() {
  return <div><h1 className="text-2xl font-bold">Curriculum Dashboard</h1><div className="grid grid-cols-3 gap-4 mt-4"><Card><CardContent className="pt-6"><BookOpen className="w-8 h-8 mb-2" /><p className="text-2xl font-bold">0</p><p className="text-sm text-gray-500">Courses</p></CardContent></Card><Card><CardContent className="pt-6"><Award className="w-8 h-8 mb-2" /><p className="text-2xl font-bold">0</p><p className="text-sm text-gray-500">Competencies</p></CardContent></Card><Card><CardContent className="pt-6"><TrendingUp className="w-8 h-8 mb-2" /><p className="text-2xl font-bold">0%</p><p className="text-sm text-gray-500">Alignment</p></CardContent></Card></div></div> }
}
