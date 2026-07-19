import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, ArrowLeft, Loader2, Printer } from 'lucide-react';
import api from '@/services/api';
import studentService from '@/services/student.service';
import { useAuth } from '@/hooks/useAuth';
import { getCertificateWording } from '@/pages/education/CertificatesPage';

type Cert = {
  id: string;
  template: string;
  recipient_type: string;
  recipient_name: string;
  recipient_id: string;
  issue_date?: string;
  custom_text?: string;
};

export default function StudentCertificatesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Cert[]>([]);
  const [studentProfile, setStudentProfile] = useState<any | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const me = await studentService.resolveMe(user);
        if (!me) {
          if (active) setError('Student profile not found for this account.');
          return;
        }
        if (active) {
          setStudentProfile(me);
        }
        const meId = String(me.id);
        const meSid = String(me.student_id || '');
        const meName = (me.full_name || '').toLowerCase();
        const res = await api.get('/auth/students/certificates/').catch(() => ({ data: [] as any[] }));
        const list: any[] = Array.isArray(res?.data) ? res.data
          : (res?.data?.results || []);
        if (active) {
          setItems(
            list
              .filter((c: any) => {
                if (c.recipient_type && c.recipient_type !== 'student') return false;
                const rid = String(c.recipient_id || '');
                if (meSid && rid && rid === meSid) return true;
                if (rid && rid === meId) return true;
                if (meName && (c.recipient_name || '').toLowerCase() === meName) return true;
                return false;
              })
              .map((c: any) => ({
                id: String(c.id),
                template: c.template || 'Certificate',
                recipient_type: c.recipient_type,
                recipient_name: c.recipient_name,
                recipient_id: c.recipient_id,
                issue_date: c.issue_date,
                custom_text: c.custom_text,
              }))
          );
        }
      } catch (e: any) {
        if (active) setError(e?.message || 'Failed to load certificates.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const triggerPrintPreview = (cert: Cert) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocked! Please allow popups to print.');
      return;
    }

    const recipientDetails = {
      fatherName: studentProfile?.father_name || 'N/A',
      regNo: studentProfile?.student_id || 'N/A',
      className: studentProfile?.current_class_name || studentProfile?.class_name || 'N/A',
      dob: studentProfile?.date_of_birth || 'N/A',
      admissionDate: studentProfile?.admission_date || 'N/A'
    };

    const textDesc = getCertificateWording(
      cert.template,
      cert.recipient_name,
      recipientDetails,
      cert.issue_date || '',
      cert.custom_text || ''
    );

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Certificate - ${cert.recipient_name}</title>
          <style>
            @page { size: landscape; margin: 0; }
            body {
              font-family: 'Times New Roman', serif;
              background-color: #ffffff;
              padding: 40px;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              box-sizing: border-box;
            }
            .border-outer {
              border: 15px solid #1e293b;
              padding: 10px;
              width: 100%;
              height: 100%;
              box-sizing: border-box;
            }
            .border-inner {
              border: 5px solid #d97706;
              padding: 40px;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              text-align: center;
              box-sizing: border-box;
              position: relative;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #1e293b;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .title {
              font-size: 42px;
              font-weight: 900;
              color: #b45309;
              text-transform: uppercase;
              letter-spacing: 3px;
              margin: 10px 0;
            }
            .sub-title {
              font-size: 14px;
              font-weight: bold;
              text-transform: uppercase;
              color: #64748b;
              letter-spacing: 5px;
            }
            .description {
              font-size: 18px;
              line-height: 1.8;
              color: #334155;
              max-w: 800px;
              margin: 25px auto;
            }
            .footer-row {
              width: 100%;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 30px;
            }
            .seal-box {
              width: 80px;
              height: 80px;
              border: 2px dashed #cbd5e1;
              display: flex;
              justify-content: center;
              align-items: center;
              font-size: 10px;
              font-weight: bold;
              color: #94a3b8;
              text-transform: uppercase;
            }
            .sign-box {
              text-align: center;
              width: 180px;
            }
            .line {
              border-bottom: 2px solid #cbd5e1;
              margin-bottom: 5px;
              color: #1e293b;
              font-weight: bold;
              font-size: 14px;
            }
            .sign {
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              color: #64748b;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          <div class="border-outer">
            <div class="border-inner">
              <div class="sub-title">Certificate of Excellence</div>
              <div class="title">${cert.template}</div>
              <div class="logo">Code Cortex Software Academy</div>
              <div class="description">${textDesc}</div>
              <div class="footer-row">
                <div class="seal-box">Official Seal</div>
                <div class="sign-box">
                  <div class="line">${cert.issue_date || ''}</div>
                  <div class="sign">Date of Issue</div>
                </div>
                <div class="sign-box">
                  <div class="line">Principal Signature</div>
                  <div class="sign">Authorized Signature</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <Award size={16} className="text-blue-600" /> My Certificates
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
      ) : items.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs font-bold">
          No certificates issued yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <Award size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">{c.template}</p>
                <p className="text-[10px] text-slate-400 font-semibold">
                  Issued: {c.issue_date || '—'}
                </p>
                {c.custom_text && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-3">{c.custom_text}</p>
                )}
                <button
                  onClick={() => triggerPrintPreview(c)}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-650 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors"
                >
                  <Printer size={12} /> Print Certificate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
