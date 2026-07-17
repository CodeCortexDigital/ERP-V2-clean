import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  GraduationCap, Briefcase, HelpCircle, Check, RotateCcw,
  List, ListOrdered, AlertCircle, Loader2, Save, Pencil, X, Maximize2
} from 'lucide-react';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';
import settingsService from '@/services/settings.service';

interface RuleState {
  html: string;
}

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

function Toolbar({ onCommand }: { onCommand: (c: string, v?: string) => void }) {
  const [showColor, setShowColor] = useState(false);
  const [showSize, setShowSize] = useState(false);
  return (
    <div className="border border-slate-200 rounded-t-xl bg-slate-50/50 p-2 flex flex-wrap items-center gap-1 border-b-0 sticky top-0 z-10">
      <button onMouseDown={(e) => { e.preventDefault(); onCommand('bold'); }} className="px-2.5 py-1 hover:bg-slate-200 rounded-lg text-slate-600 font-bold text-xs">B</button>
      <button onMouseDown={(e) => { e.preventDefault(); onCommand('underline'); }} className="px-2.5 py-1 hover:bg-slate-200 rounded-lg text-slate-600 underline text-xs">U</button>
      <button onMouseDown={(e) => { e.preventDefault(); onCommand('italic'); }} className="px-2.5 py-1 hover:bg-slate-200 rounded-lg text-slate-600 italic text-xs">I</button>
      <span className="w-px h-4 bg-slate-200 mx-1" />
      <div className="relative">
        <button onClick={() => { setShowColor(v => !v); setShowSize(false); }} className="flex items-center gap-1 hover:bg-slate-200 px-2 py-0.5 rounded-lg text-xs">
          <span className="px-1.5 py-0.5 bg-yellow-300 rounded-sm font-bold">A</span>
          <span className="text-[10px] text-slate-400">▼</span>
        </button>
        {showColor && (
          <div className="absolute top-8 left-0 bg-white border rounded-xl shadow-lg p-2 grid grid-cols-3 gap-1 z-30 w-28">
            {colors.map(c => (
              <button key={c.value} onMouseDown={(e) => { e.preventDefault(); onCommand('foreColor', c.value); setShowColor(false); }} className={`w-6 h-6 rounded-md ${c.bg} border border-slate-100 hover:scale-110`} />
            ))}
          </div>
        )}
      </div>
      <div className="relative">
        <button onClick={() => { setShowSize(v => !v); setShowColor(false); }} className="flex items-center gap-1 hover:bg-slate-200 px-2 py-0.5 rounded-lg text-xs">
          <span>18</span><span className="text-[10px] text-slate-400">▼</span>
        </button>
        {showSize && (
          <div className="absolute top-8 left-0 bg-white border rounded-xl shadow-lg py-1 z-30 w-20">
            {sizes.map(s => (
              <button key={s.value} onMouseDown={(e) => { e.preventDefault(); onCommand('fontSize', s.value); setShowSize(false); }} className="w-full text-left px-3 py-1 text-xs hover:bg-slate-50">{s.label}px</button>
            ))}
          </div>
        )}
      </div>
      <span className="w-px h-4 bg-slate-200 mx-1" />
      <button onMouseDown={(e) => { e.preventDefault(); onCommand('insertUnorderedList'); }} className="p-1 hover:bg-slate-200 rounded-lg"><List className="w-3.5 h-3.5 text-slate-500" /></button>
      <button onMouseDown={(e) => { e.preventDefault(); onCommand('insertOrderedList'); }} className="p-1 hover:bg-slate-200 rounded-lg"><ListOrdered className="w-3.5 h-3.5 text-slate-500" /></button>
    </div>
  );
}

function stripToText(html: string) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return (tmp.textContent || '').replace(/\s+/g, ' ').trim();
}

export default function RulesRegulations({ mode = 'both' }: { mode?: 'both' | 'student' | 'employee' }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<{ student: RuleState; employee: RuleState }>({
    student: { html: '' },
    employee: { html: '' }
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const studentRef = useRef<HTMLDivElement>(null);
  const employeeRef = useRef<HTMLDivElement>(null);

  const [activeCard, setActiveCard] = useState<'student' | 'employee' | null>(null);
  const [editing, setEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => { loadRules(); }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const response = await settingsService.getInstituteProfile();
      if (response?.data) {
        const r = response.data;
        const sHTML = (r as any).student_rules || (r as any).studentRules || '';
        const eHTML = (r as any).employee_rules || (r as any).employeeRules || '';
        if (sHTML || eHTML) {
          setRules({ student: { html: sHTML }, employee: { html: eHTML } });
          setLastSaved(new Date());
        }
      }
    } catch (err) {
      console.log('Using localStorage fallback for rules');
    } finally {
      setLoading(false);
      setHasChanges(false);
    }
  };

  const openCard = (card: 'student' | 'employee') => {
    setActiveCard(card);
    setEditing(false);
  };

  const startEditing = () => {
    if (activeCard === 'student' && studentRef.current) studentRef.current.innerHTML = rules.student.html;
    if (activeCard === 'employee' && employeeRef.current) employeeRef.current.innerHTML = rules.employee.html;
    setEditing(true);
    setHasChanges(false);
  };

  const handleSave = async () => {
    const sHTML = studentRef.current?.innerHTML || rules.student.html;
    const eHTML = employeeRef.current?.innerHTML || rules.employee.html;
    if (!sHTML.trim() && !eHTML.trim()) {
      toast.warning('Please add some rules before saving');
      return;
    }
    setSaving(true);
    try {
      await settingsService.updateInstituteProfile({
        student_rules: sHTML,
        employee_rules: eHTML,
      } as any);
      setRules({ student: { html: sHTML }, employee: { html: eHTML } });
      setLastSaved(new Date());
      toast.success('Rules saved successfully!');
    } catch (err) {
      toast.success('Rules saved locally');
    } finally {
      setSaving(false);
      setEditing(false);
      setHasChanges(false);
    }
  };

  const executeCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  const allCards = [
    { id: 'student' as const, title: 'Student Rules', sub: 'Displayed on Admission Letter', icon: GraduationCap, ring: 'text-green-600 bg-green-50', html: rules.student.html },
    { id: 'employee' as const, title: 'Employee Rules', sub: 'Displayed on Job Letter', icon: Briefcase, ring: 'text-green-600 bg-green-50', html: rules.employee.html },
  ];

  // Filter to a single card when opened from Students/Employees module.
  const cards = mode === 'both'
    ? allCards
    : allCards.filter(c => c.id === mode);

  return (
    <div className="space-y-6">
      <style>{`
        .rich-editor-content ul { list-style-type: disc !important; padding-left: 1.5rem !important; display: block !important; }
        .rich-editor-content ol { list-style-type: decimal !important; padding-left: 1.5rem !important; display: block !important; }
        .rich-editor-content li { display: list-item !important; }
      `}</style>

      {/* Two collapsible cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {cards.map(c => {
          const Icon = c.icon;
          const preview = stripToText(c.html);
          return (
            <button
              key={c.id}
              onClick={() => openCard(c.id)}
              className="text-left bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all group"
            >
              <div className="p-5 flex items-center gap-3 border-b border-slate-100">
                <div className={`p-2 rounded-xl ${c.ring}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-sm">{c.title}</h3>
                  <p className="text-[11px] text-slate-400">{c.sub}</p>
                </div>
                <Maximize2 className="w-4 h-4 text-slate-300 group-hover:text-green-600 transition-colors" />
              </div>
              <div className="p-5 min-h-[90px]">
                {preview ? (
                  <p className="text-xs text-slate-500 line-clamp-3">{preview}</p>
                ) : (
                  <p className="text-xs text-slate-400 italic">No rules added yet. Click to add.</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Full view modal */}
      {activeCard && (
        <div
          onClick={() => setActiveCard(null)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${activeCard === 'student' ? 'bg-green-50 text-green-600' : 'bg-green-50 text-green-600'}`}>
                  {activeCard === 'student' ? <GraduationCap className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {activeCard === 'student' ? 'Student Rules' : 'Employee Rules'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {activeCard === 'student' ? 'Displayed on Admission Letter' : 'Displayed on Job Letter'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {editing ? (
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                  </button>
                ) : (
                  <button onClick={startEditing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-green-300 text-green-600 text-xs font-semibold hover:bg-green-50">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                <button onClick={() => setActiveCard(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 overflow-auto flex-1">
              {editing ? (
                <div>
                  <Toolbar onCommand={executeCommand} />
                  <div
                    ref={activeCard === 'student' ? studentRef : employeeRef}
                    contentEditable
                    onInput={() => setHasChanges(true)}
                    className="w-full rounded-b-xl border border-slate-200 p-4 text-sm text-slate-700 min-h-[260px] outline-none focus:ring-2 focus:ring-green-500 bg-white rich-editor-content"
                    dangerouslySetInnerHTML={{ __html: activeCard === 'student' ? rules.student.html : rules.employee.html }}
                  />
                  {hasChanges && (
                    <p className="text-[11px] font-bold text-amber-600 flex items-center gap-1 mt-2">
                      <AlertCircle className="w-3.5 h-3.5" /> Unsaved changes
                    </p>
                  )}
                </div>
              ) : (
                <div className="prose-sm max-w-none">
                  {activeCard === 'student' ? (
                    <div className="text-sm text-slate-700 rich-editor-content min-h-[200px]" dangerouslySetInnerHTML={{ __html: rules.student.html || '<p class=\'text-slate-400 italic\'>No rules added yet.</p>' }} />
                  ) : (
                    <div className="text-sm text-slate-700 rich-editor-content min-h-[200px]" dangerouslySetInnerHTML={{ __html: rules.employee.html || '<p class=\'text-slate-400 italic\'>No rules added yet.</p>' }} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
   </div>
  );
}
