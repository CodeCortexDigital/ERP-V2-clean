import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, ArrowLeft, Loader2, IdCard, Phone, MapPin, Droplet, Calendar } from 'lucide-react';
import studentService from '@/services/student.service';
import { useAuth } from '@/hooks/useAuth';

const val = (v: any) => (v === null || v === undefined || v === '' ? '—' : String(v));

export default function StudentProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const me = await studentService.resolveMe(user);
        if (active) setStudent(me || null);
      } catch (e: any) {
        if (active) setError(e?.message || 'Failed to load profile.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const Row = ({ label, value }: { label: string; value: any }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-50">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-xs font-bold text-slate-700 text-right max-w-[60%] truncate">{val(value)}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <User size={16} className="text-blue-600" /> My Profile
        </h3>
        <Link to="/student" className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
          <ArrowLeft size={13} /> Dashboard
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading…
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl p-4">{error}</div>
      ) : !student ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs font-bold">
          Student profile not found for this account.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-lg font-black">
              {(student.full_name || 'S').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-base font-black text-slate-800">{val(student.full_name)}</p>
              <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                <IdCard size={12} /> {val(student.student_id)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Academic</p>
            <Row label="Class" value={student.class_name || student.current_class?.name} />
            <Row label="Section" value={student.section_name || student.current_section?.name} />
            <Row label="Roll No" value={student.roll_no} />
            <Row label="Admission Date" value={student.admission_date} />
            <Row label="Gender" value={student.gender} />
          </div>

          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact</p>
            <Row label="Email" value={student.email} />
            <Row label="Phone" value={student.phone} />
            <Row label="Guardian" value={student.guardian_name || student.father_name} />
            <Row label="Guardian Phone" value={student.guardian_phone} />
            <Row label="Address" value={student.address} />
          </div>

          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Other</p>
            <Row label="Date of Birth" value={student.date_of_birth} />
            <Row label="Blood Group" value={student.blood_group} />
            <Row label="Religion" value={student.religion} />
            <Row label="Cast" value={student.cast} />
          </div>
        </div>
      )}
    </div>
  );
}
