import { useState } from 'react'
import { Brain, Target, TrendingUp, Award } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

interface LearningPath { id: number; student_name: string; student_id: string; program: string; current_cgpa: number; strengths: string[]; weaknesses: string[]; recommendations: string[]; status: string }
const SAMPLE_LEARNING_PATHS: LearningPath[] = [
  { id: 1, student_name: 'Ahmed Khan', student_id: 'STU-001', program: 'CS', current_cgpa: 3.75, strengths: ['Programming', 'Algorithms'], weaknesses: ['Databases'], recommendations: ['Take Database Course', 'Practice SQL'], status: 'active' },
]
export default function PersonalizedLearning() { const [learningPaths] = useState(SAMPLE_LEARNING_PATHS); return (<div className="space-y-6"><div><h1 className="text-2xl font-bold text-gray-900">Personalized Learning</h1><p className="text-gray-500">AI-powered personalized learning paths</p></div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{learningPaths.map(lp => (<div key={lp.id} className="bg-white rounded-lg border p-4"><div className="flex justify-between"><h3 className="font-semibold">{lp.student_name}</h3><Badge>{lp.status}</Badge></div><div className="flex items-center gap-4 my-3"><Brain className="h-5 w-5 text-blue-500" /><span className="text-2xl font-bold text-blue-600">{lp.current_cgpa}</span><span className="text-sm text-gray-500">CGPA</span></div><div><p className="text-sm font-medium text-green-600">Strengths: {lp.strengths.join(', ')}</p><p className="text-sm font-medium text-red-600 mt-2">Weaknesses: {lp.weaknesses.join(', ')}</p><p className="text-sm font-medium text-blue-600 mt-2">Recommendations: {lp.recommendations.join(', ')}</p></div></div>))}</div></div>) }
