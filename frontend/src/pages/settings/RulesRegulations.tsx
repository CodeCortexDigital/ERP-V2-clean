import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  GraduationCap, Briefcase, HelpCircle, Check, RotateCcw,
  List, ListOrdered, AlertCircle, Loader2, Save
} from 'lucide-react';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';
import SettingsCard from './components/SettingsCard';

export default function RulesRegulations() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studentRules, setStudentRules] = useState('');
  const [employeeRules, setEmployeeRules] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const studentRef = useRef<HTMLDivElement>(null);
  const employeeRef = useRef<HTMLDivElement>(null);

  const [showColorStudent, setShowColorStudent] = useState(false);
  const [showSizeStudent, setShowSizeStudent] = useState(false);
  const [showColorEmployee, setShowColorEmployee] = useState(false);
  const [showSizeEmployee, setShowSizeEmployee] = useState(false);

  const colors = [
    { name: 'Default', value: '#334155', bg: 'bg-slate-700' },
    { name: 'Red', value: '#EF4444', bg: 'bg-red-500' },
    { name: 'Yellow', value: '#EAB308', bg: 'bg-yellow-500' },
    { name: 'Green', value: '#10B981', bg: 'bg-emerald-500' },
    { name: 'Blue', value: '#3B82F6', bg: 'bg-blue-500' },
    { name: 'Purple', value: '#8B5CF6', bg: 'bg-purple-500' }
  ];

  const sizes = [
    { label: '12', value: '3' },
    { label: '14', value: '4' },
    { label: '16', value: '4.5' },
    { label: '18', value: '5' },
    { label: '20', value: '6' },
    { label: '24', value: '7' }
  ];

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      // Try localStorage first
      const saved = localStorage.getItem('school_rules_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        setStudentRules(parsed.studentRules || '');
        setEmployeeRules(parsed.employeeRules || '');
        if (parsed.lastSaved) setLastSaved(new Date(parsed.lastSaved));
        if (studentRef.current) studentRef.current.innerHTML = parsed.studentRules || '';
        if (employeeRef.current) employeeRef.current.innerHTML = parsed.employeeRules || '';
      }

      // Try API
      const response = await api.get(API_ENDPOINTS.SETTINGS);
      if (response?.data?.rules) {
        const rules = response.data.rules;
        const sHTML = rules.studentRules || rules.student_rules || '';
        const eHTML = rules.employeeRules || rules.employee_rules || '';
        setStudentRules(sHTML);
        setEmployeeRules(eHTML);
        if (studentRef.current) studentRef.current.innerHTML = sHTML;
        if (employeeRef.current) employeeRef.current.innerHTML = eHTML;
        setLastSaved(new Date());
        localStorage.setItem('school_rules_data', JSON.stringify({
          studentRules: sHTML,
          employeeRules: eHTML,
          lastSaved: new Date().toISOString()
        }));
      }
    } catch (err) {
      console.log('Using localStorage fallback for rules');
    } finally {
      setLoading(false);
      setHasChanges(false);
    }
  };

  const handleSave = async () => {
    const sHTML = studentRef.current?.innerHTML || studentRules;
    const eHTML = employeeRef.current?.innerHTML || employeeRules;

    if (!sHTML.trim() && !eHTML.trim()) {
      toast.warning('Please add some rules before saving');
      return;
    }

    setSaving(true);
    const data = {
      studentRules: sHTML,
      employeeRules: eHTML,
      lastSaved: new Date().toISOString()
    };

    try {
      localStorage.setItem('school_rules_data', JSON.stringify(data));
      setStudentRules(sHTML);
      setEmployeeRules(eHTML);
      setLastSaved(new Date());
      setHasChanges(false);

      await api.put(API_ENDPOINTS.SETTINGS, { rules: { studentRules: sHTML, employeeRules: eHTML } });
      toast.success('Rules saved successfully!');
    } catch (err) {
      toast.success('Rules saved to local storage');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (hasChanges && !confirm('Reset to last saved version?')) return;
    loadRules();
  };

  const executeCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {lastSaved ? `Last saved: ${lastSaved.toLocaleString()}` : 'Not saved yet'}
          </span>
          {hasChanges && (
            <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Unsaved changes
            </span>
          )}
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      <style>{`
        .rich-editor-content ul { list-style-type: disc !important; padding-left: 1.5rem !important; display: block !important; }
        .rich-editor-content ol { list-style-type: decimal !important; padding-left: 1.5rem !important; display: block !important; }
        .rich-editor-content li { display: list-item !important; }
      `}</style>

      {/* Rules Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Rules */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-xl">
              <GraduationCap className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Student Rules</h3>
              <p className="text-[11px] text-slate-400">Displayed on Admission Letter</p>
            </div>
          </div>

          <div className="p-5">
            {/* Toolbar */}
            <div className="border border-slate-200 rounded-t-xl bg-slate-50/50 p-2 flex flex-wrap items-center gap-1 border-b-0">
              <button onMouseDown={(e) => { e.preventDefault(); executeCommand('bold'); }} className="px-2.5 py-1 hover:bg-slate-200 rounded-lg text-slate-600 font-bold text-xs">B</button>
              <button onMouseDown={(e) => { e.preventDefault(); executeCommand('underline'); }} className="px-2.5 py-1 hover:bg-slate-200 rounded-lg text-slate-600 underline text-xs">U</button>
              <button onMouseDown={(e) => { e.preventDefault(); executeCommand('italic'); }} className="px-2.5 py-1 hover:bg-slate-200 rounded-lg text-slate-600 italic text-xs">I</button>
              <span className="w-px h-4 bg-slate-200 mx-1" />
              {/* Color dropdown */}
              <div className="relative">
                <button onClick={() => setShowColorStudent(!showColorStudent)} className="flex items-center gap-1 hover:bg-slate-200 px-2 py-0.5 rounded-lg text-xs">
                  <span className="px-1.5 py-0.5 bg-yellow-300 rounded-sm font-bold">A</span>
                  <span className="text-[10px] text-slate-400">▼</span>
                </button>
                {showColorStudent && (
                  <div className="absolute top-8 left-0 bg-white border rounded-xl shadow-lg p-2 grid grid-cols-3 gap-1 z-30 w-28">
                    {colors.map(c => (
                      <button key={c.value} onMouseDown={(e) => { e.preventDefault(); executeCommand('foreColor', c.value); setShowColorStudent(false); }} className={`w-6 h-6 rounded-md ${c.bg} border border-slate-100 hover:scale-110`} />
                    ))}
                  </div>
                )}
              </div>
              {/* Size dropdown */}
              <div className="relative">
                <button onClick={() => setShowSizeStudent(!showSizeStudent)} className="flex items-center gap-1 hover:bg-slate-200 px-2 py-0.5 rounded-lg text-xs">
                  <span>18</span>
                  <span className="text-[10px] text-slate-400">▼</span>
                </button>
                {showSizeStudent && (
                  <div className="absolute top-8 left-0 bg-white border rounded-xl shadow-lg py-1 z-30 w-20">
                    {sizes.map(s => (
                      <button key={s.value} onMouseDown={(e) => { e.preventDefault(); executeCommand('fontSize', s.value); setShowSizeStudent(false); }} className="w-full text-left px-3 py-1 text-xs hover:bg-slate-50">{s.label}px</button>
                    ))}
                  </div>
                )}
              </div>
              <span className="w-px h-4 bg-slate-200 mx-1" />
              <button onMouseDown={(e) => { e.preventDefault(); executeCommand('insertUnorderedList'); }} className="p-1 hover:bg-slate-200 rounded-lg"><List className="w-3.5 h-3.5 text-slate-500" /></button>
              <button onMouseDown={(e) => { e.preventDefault(); executeCommand('insertOrderedList'); }} className="p-1 hover:bg-slate-200 rounded-lg"><ListOrdered className="w-3.5 h-3.5 text-slate-500" /></button>
            </div>

            <div
              ref={studentRef}
              contentEditable
              onInput={() => setHasChanges(true)}
              className="w-full rounded-b-xl border border-slate-200 p-4 text-sm text-slate-700 min-h-[200px] outline-none focus:ring-2 focus:ring-purple-500 bg-white rich-editor-content"
              dangerouslySetInnerHTML={{ __html: studentRules }}
            />
          </div>
        </div>

        {/* Employee Rules */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Employee Rules</h3>
              <p className="text-[11px] text-slate-400">Displayed on Job Letter</p>
            </div>
          </div>

          <div className="p-5">
            {/* Toolbar */}
            <div className="border border-slate-200 rounded-t-xl bg-slate-50/50 p-2 flex flex-wrap items-center gap-1 border-b-0">
              <button onMouseDown={(e) => { e.preventDefault(); executeCommand('bold'); }} className="px-2.5 py-1 hover:bg-slate-200 rounded-lg text-slate-600 font-bold text-xs">B</button>
              <button onMouseDown={(e) => { e.preventDefault(); executeCommand('underline'); }} className="px-2.5 py-1 hover:bg-slate-200 rounded-lg text-slate-600 underline text-xs">U</button>
              <button onMouseDown={(e) => { e.preventDefault(); executeCommand('italic'); }} className="px-2.5 py-1 hover:bg-slate-200 rounded-lg text-slate-600 italic text-xs">I</button>
              <span className="w-px h-4 bg-slate-200 mx-1" />
              <div className="relative">
                <button onClick={() => setShowColorEmployee(!showColorEmployee)} className="flex items-center gap-1 hover:bg-slate-200 px-2 py-0.5 rounded-lg text-xs">
                  <span className="px-1.5 py-0.5 bg-yellow-300 rounded-sm font-bold">A</span>
                  <span className="text-[10px] text-slate-400">▼</span>
                </button>
                {showColorEmployee && (
                  <div className="absolute top-8 left-0 bg-white border rounded-xl shadow-lg p-2 grid grid-cols-3 gap-1 z-30 w-28">
                    {colors.map(c => (
                      <button key={c.value} onMouseDown={(e) => { e.preventDefault(); executeCommand('foreColor', c.value); setShowColorEmployee(false); }} className={`w-6 h-6 rounded-md ${c.bg} border border-slate-100 hover:scale-110`} />
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button onClick={() => setShowSizeEmployee(!showSizeEmployee)} className="flex items-center gap-1 hover:bg-slate-200 px-2 py-0.5 rounded-lg text-xs">
                  <span>14</span>
                  <span className="text-[10px] text-slate-400">▼</span>
                </button>
                {showSizeEmployee && (
                  <div className="absolute top-8 left-0 bg-white border rounded-xl shadow-lg py-1 z-30 w-20">
                    {sizes.map(s => (
                      <button key={s.value} onMouseDown={(e) => { e.preventDefault(); executeCommand('fontSize', s.value); setShowSizeEmployee(false); }} className="w-full text-left px-3 py-1 text-xs hover:bg-slate-50">{s.label}px</button>
                    ))}
                  </div>
                )}
              </div>
              <span className="w-px h-4 bg-slate-200 mx-1" />
              <button onMouseDown={(e) => { e.preventDefault(); executeCommand('insertUnorderedList'); }} className="p-1 hover:bg-slate-200 rounded-lg"><List className="w-3.5 h-3.5 text-slate-500" /></button>
              <button onMouseDown={(e) => { e.preventDefault(); executeCommand('insertOrderedList'); }} className="p-1 hover:bg-slate-200 rounded-lg"><ListOrdered className="w-3.5 h-3.5 text-slate-500" /></button>
            </div>

            <div
              ref={employeeRef}
              contentEditable
              onInput={() => setHasChanges(true)}
              className="w-full rounded-b-xl border border-slate-200 p-4 text-sm text-slate-700 min-h-[200px] outline-none focus:ring-2 focus:ring-purple-500 bg-white rich-editor-content"
              dangerouslySetInnerHTML={{ __html: employeeRules }}
            />
          </div>
        </div>
      </div>

      {/* Save Footer */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <HelpCircle className="w-4 h-4 text-slate-400" />
          <span>Both rules saved together when you click <strong>Save Changes</strong></span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}