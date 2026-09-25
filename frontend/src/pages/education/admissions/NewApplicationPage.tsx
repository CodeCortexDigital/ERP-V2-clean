import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import ApplicationForm from '@/components/admissions/ApplicationForm';
import admissionService, { type ApplicationFormData } from '@/services/admission.service';
import classSectionService from '@/services/classSection.service';

/** The office enters an application on a family's behalf (walk-in or paper form). */
export default function NewApplicationPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    classSectionService.getClassesWithSections().then((r) => setClasses((r.data as Array<{ name: string }>).map((c) => c.name)));
  }, []);

  const submit = async (data: ApplicationFormData) => {
    setSaving(true);
    try {
      const app = await admissionService.createOffice(data);
      toast.success(`Application ${app.application_no} saved`);
      navigate('/education/admissions');
    } catch (err: any) {
      const body = err?.response?.data;
      toast.error(body?.error || (body && typeof body === 'object' ? Object.entries(body).map(([k, v]) => `${k}: ${v}`).join(' ') : 'Could not save the application.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4 text-slate-800">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/education/admissions')} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Back to admissions"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="text-xl font-bold">New application</h1>
          <p className="text-sm text-slate-500">For walk-in or paper applications. Families can also apply online from the link on the Admissions page.</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-8">
        <ApplicationForm mode="office" classes={classes} submitting={saving} onSubmit={submit} />
      </div>
    </div>
  );
}
