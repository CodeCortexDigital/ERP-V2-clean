import { useState, useEffect } from 'react'
import { Sparkles, Check, AlertCircle, Edit2, Play, Trash2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import api from '@/services/api'
import { toast } from 'sonner'

interface QuizQuestion {
  id: string
  question_type: 'mcq' | 'true_false' | 'short_answer' | string
  question_text: string
  options: string[] | null
  correct_answer: string
  explanation: string
}

interface QuizData {
  quiz_id: string
  title: string
  subject: string
  topic: string
  difficulty: string
  questions: QuizQuestion[]
  offline: boolean
}

export default function QuizGeneratorModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: { 
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}) {
  const [subjects, setSubjects] = useState<any[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [questionCount, setQuestionCount] = useState(4)
  const [generating, setGenerating] = useState(false)
  const [generatedQuiz, setGeneratedQuiz] = useState<QuizData | null>(null)
  
  // Edit state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ question_text: '', correct_answer: '', explanation: '' })
  const [publishing, setPublishing] = useState(false)

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/auth/academics/subjects/')
      const raw = Array.isArray(res.data) ? res.data : res.data?.results || []
      setSubjects(raw)
      if (raw.length > 0) {
        setSelectedSubject(raw[0].id)
      } else {
        // Fallback if empty
        setSubjects([
          { id: 'subj-math', name: 'Mathematics' },
          { id: 'subj-cs', name: 'Computer Science' },
          { id: 'subj-sci', name: 'General Science' }
        ])
        setSelectedSubject('subj-math')
      }
    } catch (err) {
      console.error('Failed to fetch subjects:', err)
      setSubjects([
        { id: 'subj-math', name: 'Mathematics' },
        { id: 'subj-cs', name: 'Computer Science' },
        { id: 'subj-sci', name: 'General Science' }
      ])
      setSelectedSubject('subj-math')
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchSubjects()
      setGeneratedQuiz(null)
    }
  }, [isOpen])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubject || !topic) {
      toast.error('Please select subject and enter topic')
      return
    }

    setGenerating(true)
    const toastId = toast.loading('Calling LLM Quiz Generator... Creating quiz structures...')

    try {
      const res = await api.post('/ai/generate-quiz/', {
        subject_id: selectedSubject,
        topic: topic,
        difficulty: difficulty,
        count: questionCount
      })
      
      setGeneratedQuiz(res.data)
      toast.dismiss(toastId)
      toast.success(res.data.offline 
        ? 'AI server offline. Standard template quiz loaded successfully.' 
        : 'Quiz generated successfully via AI!'
      )
    } catch (err: any) {
      console.error(err)
      toast.dismiss(toastId)
      toast.error('Failed to generate quiz. Check backend server logs.')
    } finally {
      setGenerating(false)
    }
  }

  const handleEditClick = (q: QuizQuestion) => {
    setEditingQuestionId(q.id)
    setEditForm({
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      explanation: q.explanation
    })
  }

  const handleSaveQuestion = (qId: string) => {
    if (!generatedQuiz) return
    const updatedQuestions = generatedQuiz.questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          question_text: editForm.question_text,
          correct_answer: editForm.correct_answer,
          explanation: editForm.explanation
        }
      }
      return q
    })
    setGeneratedQuiz({ ...generatedQuiz, questions: updatedQuestions })
    setEditingQuestionId(null)
    toast.success('Question updated locally.')
  }

  const handlePublish = async () => {
    if (!generatedQuiz) return
    setPublishing(true)
    try {
      await api.post('/ai/publish-quiz/', { quiz_id: generatedQuiz.quiz_id })
      toast.success('Quiz published successfully! Integrated with general assessments.')
      if (onSuccess) onSuccess()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to publish quiz.')
    } finally {
      setPublishing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 my-8">
        <div className="bg-purple-700 px-6 py-4 text-white flex justify-between items-center">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Quiz & Assessment Generator
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white font-bold text-xl">
            ×
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {!generatedQuiz ? (
            /* Settings Form */
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Subject</Label>
                  <select
                    className="w-full border rounded-lg p-2 bg-slate-50 text-sm focus:outline-none"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Topic</Label>
                  <Input
                    placeholder="e.g. Acids & Bases, Newton's Laws"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Difficulty Level</Label>
                  <select
                    className="w-full border rounded-lg p-2 bg-slate-50 text-sm focus:outline-none"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Number of Questions</Label>
                  <Input
                    type="number"
                    min={2}
                    max={10}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-4"
                disabled={generating}
              >
                {generating ? 'Calling AI Models...' : 'Generate Quiz Questions'}
              </Button>
            </form>
          ) : (
            /* Quiz Preview & Edit View */
            <div className="space-y-6">
              <div className="bg-slate-50 border rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-slate-800 text-lg">{generatedQuiz.title}</h4>
                <p className="text-xs text-slate-500">
                  Subject: <span className="font-semibold text-slate-700">{generatedQuiz.subject}</span> | 
                  Topic: <span className="font-semibold text-slate-700">{generatedQuiz.topic}</span> | 
                  Difficulty: <span className="font-semibold text-slate-700 capitalize">{generatedQuiz.difficulty}</span>
                </p>
                {generatedQuiz.offline && (
                  <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded font-medium mt-1">
                    <AlertCircle className="w-3 h-3" /> Offline Fallback Template
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <h5 className="font-bold text-slate-700">Generated Questions Preview:</h5>
                {generatedQuiz.questions.map((q, idx) => (
                  <div key={q.id} className="border rounded-xl p-4 bg-white shadow-sm space-y-3 relative">
                    <span className="absolute top-4 right-4 text-xs font-bold text-slate-400 capitalize bg-slate-50 px-2 py-1 rounded">
                      {q.question_type.replace('_', ' ')}
                    </span>
                    
                    <p className="font-semibold text-slate-800 pr-16">Q{idx + 1}. {q.question_text}</p>
                    
                    {q.options && (
                      <div className="grid grid-cols-2 gap-2 pl-4">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="text-xs text-slate-600 bg-slate-50 border p-2 rounded">
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}

                    {editingQuestionId === q.id ? (
                      /* Question Inline Editor */
                      <div className="bg-slate-50 p-3 rounded-lg space-y-2 border">
                        <div>
                          <Label className="text-xs font-bold">Question Text</Label>
                          <Input 
                            value={editForm.question_text} 
                            onChange={e => setEditForm({ ...editForm, question_text: e.target.value })} 
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-bold">Correct Answer</Label>
                          <Input 
                            value={editForm.correct_answer} 
                            onChange={e => setEditForm({ ...editForm, correct_answer: e.target.value })} 
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-bold">Explanation</Label>
                          <Input 
                            value={editForm.explanation} 
                            onChange={e => setEditForm({ ...editForm, explanation: e.target.value })} 
                          />
                        </div>
                        <div className="flex gap-2 justify-end pt-2">
                          <Button size="sm" variant="outline" onClick={() => setEditingQuestionId(null)}>Cancel</Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSaveQuestion(q.id)}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      /* Display Details */
                      <div className="pl-4 border-l-2 border-slate-200 text-xs space-y-1">
                        <p><span className="font-bold text-green-700">Correct Answer:</span> {q.correct_answer}</p>
                        {q.explanation && (
                          <p className="text-slate-500 italic"><span className="font-bold text-slate-600">Explanation:</span> {q.explanation}</p>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-purple-700 hover:text-purple-800 hover:bg-purple-50 text-xs px-2 py-1 mt-2"
                          onClick={() => handleEditClick(q)}
                        >
                          <Edit2 className="w-3 h-3 mr-1" /> Edit Question Details
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setGeneratedQuiz(null)}>
                  Generate Another
                </Button>
                <Button 
                  className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                  onClick={handlePublish}
                  disabled={publishing}
                >
                  <Check className="w-4 h-4" />
                  {publishing ? 'Publishing...' : 'Publish AI Quiz to Students'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
