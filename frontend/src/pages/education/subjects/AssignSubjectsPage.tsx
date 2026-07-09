// frontend/src/pages/education/subjects/AssignSubjectsPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  GraduationCap, ArrowLeft, Plus, Check, X, RefreshCw,
  BookOpen, BookMarked, Users, Search, Trash2, Edit3,
  Clock
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import academicService from '@/services/academic.service';
import { extractListData } from '@/services/api';

interface SchoolClass {
  id: string;
  name: string;
  code: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  description: string;
}

interface ClassSubject {
  id: string;
  class_ref: string;
  subject: string;
  class_name?: string;
  subject_name?: string;
}

export default function AssignSubjectsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<ClassSubject[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [classSubjects, setClassSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadClassSubjects();
    } else {
      setClassSubjects([]);
    }
  }, [selectedClass, assignedSubjects]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classesRes, subjectsRes, assignmentsRes] = await Promise.all([
        academicService.classes.getAll().catch(() => ([])),
        academicService.subjects.getAll().catch(() => ([])),
        academicService.classSubjects.getAll().catch(() => ([]))
      ]);

      setClasses(Array.isArray(classesRes) ? classesRes : classesRes?.results || []);
      setSubjects(Array.isArray(subjectsRes) ? subjectsRes : subjectsRes?.results || []);
      setAssignedSubjects(Array.isArray(assignmentsRes) ? assignmentsRes : assignmentsRes?.results || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadClassSubjects = () => {
    const assigned = assignedSubjects
      .filter((cs: any) => cs.class_ref === selectedClass || cs.class_ref?.id === selectedClass)
      .map((cs: any) => {
        const subject = subjects.find(s => s.id === (cs.subject || cs.subject_id));
        return subject;
      })
      .filter(Boolean) as Subject[];
    
    setClassSubjects(assigned);
  };

  const handleAssignSubject = async () => {
    if (!selectedClass) {
      toast.error('Please select a class');
      return;
    }
    if (!selectedSubject) {
      toast.error('Please select a subject');
      return;
    }

    try {
      await academicService.classSubjects.create({
        class_ref: selectedClass,
        subject: selectedSubject
      });
      
      toast.success('Subject assigned successfully!');
      setSelectedSubject('');
      await fetchData();
      loadClassSubjects();
    } catch (error: any) {
      console.error('Error assigning subject:', error);
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Failed to assign subject');
      }
    }
  };

  const handleRemoveSubject = async (subjectId: string) => {
    if (!confirm('Are you sure you want to remove this subject from the class?')) return;
    
    try {
      const assignment = assignedSubjects.find(
        (cs: any) => cs.class_ref === selectedClass && (cs.subject === subjectId || cs.subject_id === subjectId)
      );
      
      if (assignment) {
        await academicService.classSubjects.delete(assignment.id);
        toast.success('Subject removed successfully');
        await fetchData();
        loadClassSubjects();
      }
    } catch (error) {
      console.error('Error removing subject:', error);
      toast.error('Failed to remove subject');
    }
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : subjectId;
  };

  const getTotalCredits = () => {
    return classSubjects.reduce((sum, s) => sum + (s.credits || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mx-auto"></div>
        <p className="text-sm text-slate-500 mt-4">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <GraduationCap className="w-4 h-4" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/subjects')}>Subjects</span>
          <span>&gt;</span>
          <span className="text-slate-500">Assign Subjects</span>
        </div>
        <button 
          onClick={() => navigate('/education/subjects')}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Assignment Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-purple-600" />
            Assign Subjects to Class
          </h3>

          <div className="space-y-4">
            {/* Select Class */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">SELECT CLASS *</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
              >
                <option value="">-- Choose a class --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            {/* Select Subject */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">SUBJECT</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
              >
                <option value="">-- Choose a subject --</option>
                {subjects
                  .filter(s => !classSubjects.find(cs => cs.id === s.id))
                  .map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} ({subject.credits || 0} credits)
                    </option>
                  ))
                }
              </select>
            </div>

            <button
              onClick={handleAssignSubject}
              disabled={!selectedClass || !selectedSubject}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Assign Subject
            </button>

            <button
              onClick={() => {
                setSelectedClass('');
                setSelectedSubject('');
                setClassSubjects([]);
              }}
              className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" /> Clear Selection
            </button>
          </div>
        </div>

        {/* Right: Assigned Subjects List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-600" />
              {selectedClass 
                ? `Subjects for ${classes.find(c => c.id === selectedClass)?.name || 'Selected Class'}`
                : 'Select a class to view subjects'
              }
            </h3>
            <div className="flex items-center gap-3">
              {selectedClass && classSubjects.length > 0 && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  Total Credits: {getTotalCredits()}
                </span>
              )}
              <span className="text-xs font-semibold text-slate-400">
                {classSubjects.length} subject(s) assigned
              </span>
            </div>
          </div>

          {selectedClass && classSubjects.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">No subjects assigned yet</p>
              <p className="text-xs text-slate-400 mt-1">Select a subject from the left panel to assign</p>
            </div>
          )}

          {classSubjects.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Subject Name</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4 text-center">Credits</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classSubjects.map((subject) => (
                    <tr key={subject.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">{subject.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{subject.code || '--'}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-600">
                        {subject.credits || 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleRemoveSubject(subject.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors"
                          title="Remove Subject"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}