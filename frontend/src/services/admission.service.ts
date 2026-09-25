import api from './api';

const base = '/auth/admissions';

export type ApplicationStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'waitlisted' | 'enrolled' | 'withdrawn';

export const STATUS_META: Record<ApplicationStatus, { label: string; tone: string }> = {
  pending: { label: 'New', tone: 'bg-sky-100 text-sky-700' },
  reviewing: { label: 'In review', tone: 'bg-indigo-100 text-indigo-700' },
  approved: { label: 'Accepted', tone: 'bg-emerald-100 text-emerald-700' },
  waitlisted: { label: 'Waitlisted', tone: 'bg-amber-100 text-amber-800' },
  rejected: { label: 'Declined', tone: 'bg-rose-100 text-rose-700' },
  enrolled: { label: 'Enrolled', tone: 'bg-teal-100 text-teal-700' },
  withdrawn: { label: 'Withdrawn', tone: 'bg-slate-200 text-slate-600' },
};

export interface GuardianInput {
  first_name: string;
  last_name: string;
  relationship: string;
  email: string;
  mobile_phone: string;
  occupation: string;
  lives_with: boolean;
  has_custody: boolean;
  can_pickup: boolean;
  receives_billing: boolean;
}

export interface ApplicationFormData {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  applying_for_class: string;
  nationality: string;
  home_language: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  previous_school: string;
  previous_class: string;
  medical_notes: string;
  special_needs: string;
  sibling_at_school: string;
  guardians: GuardianInput[];
  signature_name: string;
  agree_declaration: boolean;
  agree_privacy: boolean;
  consent_photos: boolean;
}

export interface PublicForm {
  school: { name: string; code: string };
  open: boolean;
  academic_year: string;
  intro: string;
  classes: string[];
  required_documents: string[];
  declaration: string;
}

export interface AdmissionSettings {
  online_open: boolean;
  academic_year: string;
  intro: string;
  required_documents: string[];
  declaration: string;
  notify_email: string;
  public_slug: string;
}

export interface Applicant {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  gender: string;
  nationality: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  home_language: string;
  father_name: string;
  father_phone: string;
  mother_name: string;
  mother_phone: string;
  guardian_name: string;
  guardian_phone: string;
  guardians: GuardianInput[];
  previous_school: string;
  previous_class: string;
  applying_for_class: string;
  academic_year: string;
  medical_notes: string;
  special_needs: string;
  sibling_at_school: string;
}

export interface Application {
  id: string;
  application_no: string;
  applicant: Applicant;
  status: ApplicationStatus;
  status_notes: string;
  source: 'office' | 'online';
  academic_year: string;
  interview_date: string | null;
  interview_notes: string;
  interview_rating: number | null;
  signature_name: string;
  signed_at: string | null;
  consents: Record<string, unknown>;
  converted_to_student: string | null;
  submitted_at: string;
  documents?: Array<{ id: string; doc_type: string; name: string; size: number; url: string; uploaded_at: string }>;
  events?: Array<{ id: string; from_status: string; to_status: string; note: string; by: string; at: string }>;
  allowed_next?: ApplicationStatus[];
}

export interface Campaign {
  id: string;
  title: string;
  academic_year: string;
  message: string;
  closes_on: string | null;
  is_open: boolean;
  created_at: string;
  counts: Record<'pending' | 'returning' | 'not_returning' | 'undecided', number>;
  total: number;
  responses?: Array<{
    id: string; student_id: string; student: string; student_number: string; class_name: string;
    intent: string; reason: string; signature_name: string; responded_at: string | null;
  }>;
}

export const emptyGuardian = (relationship = 'mother'): GuardianInput => ({
  first_name: '', last_name: '', relationship, email: '', mobile_phone: '', occupation: '',
  lives_with: true, has_custody: true, can_pickup: true, receives_billing: false,
});

/** Build the multipart body the public form endpoint expects. */
function formBody(data: ApplicationFormData, files: Record<string, File | null>) {
  const fd = new FormData();
  fd.append('data', JSON.stringify(data));
  Object.entries(files).forEach(([type, file]) => { if (file) fd.append(`doc:${type}`, file); });
  return fd;
}

const admissionService = {
  // Public
  publicForm: async (slug: string) => (await api.get<PublicForm>(`${base}/public/${encodeURIComponent(slug)}/`)).data,
  apply: async (slug: string, data: ApplicationFormData, files: Record<string, File | null>) =>
    (await api.post<{ application_no: string; tracking_token: string; school: string }>(
      `${base}/public/${encodeURIComponent(slug)}/apply/`, formBody(data, files),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )).data,
  status: async (no: string, token: string) =>
    (await api.get(`${base}/public/status/`, { params: { no, token } })).data as {
      application_no: string; student: string; applying_for: string; status: ApplicationStatus;
      status_label: string; message: string; submitted_at: string; school: string;
    },

  // Admin
  settings: async () => (await api.get<AdmissionSettings>(`${base}/settings/`)).data,
  saveSettings: async (body: Partial<AdmissionSettings>) => (await api.put<AdmissionSettings>(`${base}/settings/`, body)).data,
  list: async (params: Record<string, string> = {}) =>
    (await api.get<{ results: Application[]; counts: Record<string, number> }>(`${base}/applications/`, { params })).data,
  get: async (id: string) => (await api.get<Application>(`${base}/applications/${id}/`)).data,
  update: async (id: string, body: Partial<Application>) => (await api.patch<Application>(`${base}/applications/${id}/`, body)).data,
  setStatus: async (id: string, status: ApplicationStatus, note = '', notify = true) =>
    (await api.post(`${base}/applications/${id}/update-status/`, { status, note, notify })).data,
  addNote: async (id: string, note: string) => (await api.post(`${base}/applications/${id}/notes/`, { note })).data,
  uploadDocument: async (id: string, type: string, file: File) => {
    const fd = new FormData();
    fd.append(`doc:${type}`, file);
    return (await api.post(`${base}/applications/${id}/documents/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
  deleteDocument: async (id: string, docId: string) => api.delete(`${base}/applications/${id}/documents/${docId}/`),
  enroll: async (id: string, body: { class_id?: string; section_id?: string; admission_date?: string } = {}) =>
    (await api.post(`${base}/applications/${id}/enroll/`, body)).data as { student_uuid: string; student_id: string; message: string },
  /** Office entry: same fields as the online form, saved without a public submission. */
  createOffice: async (data: ApplicationFormData) => {
    const father = data.guardians.find((g) => g.relationship === 'father');
    const mother = data.guardians.find((g) => g.relationship === 'mother');
    const contact = data.guardians.find((g) => g.email) || data.guardians[0];
    const gender = ({ male: 'M', female: 'F', other: 'O' } as Record<string, string>)[data.gender] || 'O';
    const applicant = (await api.post(`${base}/applicants/`, {
      ...data, gender, full_name: `${data.first_name} ${data.last_name}`.trim(),
      email: contact?.email || 'no-email@applicant.invalid', phone: contact?.mobile_phone || '',
      date_of_birth: data.date_of_birth || null,
      father_name: father ? `${father.first_name} ${father.last_name}`.trim() : '', father_phone: father?.mobile_phone || '',
      mother_name: mother ? `${mother.first_name} ${mother.last_name}`.trim() : '', mother_phone: mother?.mobile_phone || '',
    })).data;
    return (await api.post(`${base}/applications/`, { applicant_id: applicant.id, academic_year: applicant.academic_year })).data as Application;
  },

  // Re-enrolment
  campaigns: async () => (await api.get<Campaign[]>(`${base}/reenrollment/`)).data,
  campaign: async (id: string) => (await api.get<Campaign>(`${base}/reenrollment/${id}/`)).data,
  createCampaign: async (body: { title: string; academic_year: string; message?: string; closes_on?: string }) =>
    (await api.post<Campaign>(`${base}/reenrollment/`, body)).data,
  updateCampaign: async (id: string, body: Partial<Campaign>) => (await api.patch<Campaign>(`${base}/reenrollment/${id}/`, body)).data,
  recordAnswer: async (responseId: string, intent: string, reason = '') =>
    (await api.patch(`${base}/reenrollment/responses/${responseId}/`, { intent, reason })).data,
  myReenrollments: async () => (await api.get(`${base}/reenrollment/mine/`)).data as Array<{
    id: string; student: string; campaign: string; academic_year: string; message: string;
    closes_on: string | null; intent: string; responded_at: string | null;
  }>,
  respond: async (id: string, intent: string, signature_name: string, reason = '') =>
    (await api.post(`${base}/reenrollment/responses/${id}/respond/`, { intent, signature_name, reason })).data,

  // Kept for older screens
  getApplications: () => api.get(`${base}/applications/`),
  updateApplicationStatus: (id: string, status: string) => api.post(`${base}/applications/${id}/update-status/`, { status }),
  convertToStudent: (id: string) => api.post(`${base}/applications/${id}/convert-to-student/`),
};

export default admissionService;
