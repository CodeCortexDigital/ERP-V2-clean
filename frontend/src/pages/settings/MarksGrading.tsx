import React, { useState, useEffect } from 'react';
import { Award, AlertTriangle, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';

export default function MarksGrading() {
  const [activeTab, setActiveTab] = useState<'grading' | 'fail'>('grading');
  const [grades, setGrades] = useState([
    { id: 1, grade: 'A+', from: 80, upto: 100, status: 'PASS' },
    { id: 2, grade: 'A', from: 70, upto: 79, status: 'PASS' },
    { id: 3, grade: 'B+', from: 60, upto: 69, status: 'PASS' },
    { id: 4, grade: 'B', from: 50, upto: 59, status: 'PASS' },
    { id: 5, grade: 'C', from: 40, upto: 49, status: 'PASS' },
    { id: 6, grade: 'D', from: 33, upto: 39, status: 'PASS' },
    { id: 7, grade: 'F', from: 0, upto: 32, status: 'FAIL' },
  ]);

  useEffect(() => {
    api.get(API_ENDPOINTS.SETTINGS).then(res => {
      if (res.data && res.data.grading) setGrades(res.data.grading);
    }).catch(err => console.error(err));
  }, []);

  const handleSave = async () => {
    try {
      await api.put(API_ENDPOINTS.SETTINGS, { grading: grades });
      toast.success('Grading scale saved to database!');
    } catch (err) {
      toast.error('Failed to save grading scale.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('grading')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'grading' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
          <Award className="w-4 h-4" /> Marks Grading
        </button>
        <button onClick={() => setActiveTab('fail')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'fail' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
          <AlertTriangle className="w-4 h-4 text-amber-500" /> Fail Criteria
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-600" /> Customize Grading Scale
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Define grade ranges and pass/fail status for student reports.</p>
        </div>

        <div className="border border-slate-100 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-purple-50/50 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="p-3">GRADE</th>
                <th className="p-3">% FROM</th>
                <th className="p-3">% UPTO</th>
                <th className="p-3">STATUS</th>
                <th className="p-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {grades.map((g, idx) => (
                <tr key={g.id} className="hover:bg-slate-50/50">
                  <td className="p-3 w-1/4">
                    <Input value={g.grade} onChange={(e) => { const updated = [...grades]; updated[idx].grade = e.target.value; setGrades(updated); }} className="text-xs h-9 rounded-xl border-slate-200" />
                  </td>
                  <td className="p-3 w-1/4">
                    <Input type="number" value={g.from} onChange={(e) => { const updated = [...grades]; updated[idx].from = Number(e.target.value); setGrades(updated); }} className="text-xs h-9 rounded-xl border-slate-200" />
                  </td>
                  <td className="p-3 w-1/4">
                    <Input type="number" value={g.upto} onChange={(e) => { const updated = [...grades]; updated[idx].upto = Number(e.target.value); setGrades(updated); }} className="text-xs h-9 rounded-xl border-slate-200" />
                  </td>
                  <td className="p-3 w-1/4">
                    <select value={g.status} onChange={(e) => { const updated = [...grades]; updated[idx].status = e.target.value; setGrades(updated); }} className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500">
                      <option value="PASS">PASS</option>
                      <option value="FAIL">FAIL</option>
                    </select>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => setGrades(grades.filter(x => x.id !== g.id))} className="p-2 text-rose-400 hover:text-rose-600 bg-rose-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button onClick={() => setGrades([...grades, { id: Date.now(), grade: 'NEW', from: 0, upto: 0, status: 'PASS' }])} className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 font-semibold text-xs rounded-xl transition-all">
            <Plus className="w-4 h-4" /> Add Grade
          </button>

          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all">
            <CheckCircle2 className="w-4 h-4" /> Save Grading Scale
          </button>
        </div>
      </div>
    </div>
  );
}