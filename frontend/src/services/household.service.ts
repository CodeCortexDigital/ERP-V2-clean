// Households, guardians, health and the tabbed student profile.
import api from './api';

export const RELATIONSHIPS: Array<{ value: string; label: string }> = [
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'stepmother', label: 'Stepmother' },
  { value: 'stepfather', label: 'Stepfather' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'aunt_uncle', label: 'Aunt or uncle' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'legal_guardian', label: 'Legal guardian' },
  { value: 'foster_parent', label: 'Foster parent' },
  { value: 'other', label: 'Other' },
];

export interface Guardian {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  relationship: string;
  relationship_label: string;
  email: string;
  mobile_phone: string;
  home_phone: string;
  work_phone: string;
  occupation: string;
  employer: string;
  national_id: string;
  address: string;
  preferred_language: string;
  notes: string;
  household: string | null;
  has_portal_login: boolean;
  students: Array<{ id: string; full_name: string; student_id: string }>;
}

export interface GuardianLink {
  id: string;
  guardian: Guardian;
  is_primary: boolean;
  lives_with: boolean;
  has_custody: boolean;
  can_pickup: boolean;
  is_emergency_contact: boolean;
  receives_billing: boolean;
  receives_messages: boolean;
  portal_access: boolean;
  custody_notes: string;
  priority: number;
}

export type LinkFlags = Omit<GuardianLink, 'id' | 'guardian'>;

export interface HouseholdMember {
  id: string;
  full_name: string;
  student_id: string;
  class_name?: string;
  is_active?: boolean;
}

export interface Household {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  preferred_language: string;
  notes: string;
  students: HouseholdMember[];
  guardians: Array<{ id: string; full_name: string; relationship: string; relationship_label: string; mobile_phone: string; email: string }>;
  billing_balance: number | null;
}

export interface Health {
  id?: string;
  allergies: string;
  has_severe_allergy: boolean;
  medical_conditions: string;
  medications: string;
  dietary_restrictions: string;
  physician_name: string;
  physician_phone: string;
  insurance_provider: string;
  insurance_policy_number: string;
  emergency_treatment_consent: boolean;
  notes: string;
}

export interface Immunization {
  id: string;
  vaccine: string;
  dose: string;
  date_given: string | null;
  exempt: boolean;
  exemption_reason: string;
  notes: string;
}

export interface StudentProfile {
  student: any;
  household: Household | null;
  siblings: HouseholdMember[];
  guardians: GuardianLink[];
  health: Health | null;
  immunizations: Immunization[];
  attendance: {
    total_days: number; present: number; absent: number; late: number; excused: number;
    rate: number | null; recent: Array<{ date: string; status: string }>;
  };
  billing: {
    balance_due: number;
    invoices: Array<{ id: string; number: string; due_date: string | null; amount: number; paid: number; balance: number; status: string; description: string }>;
  };
  results: Array<{ exam: string; date: string; obtained: number; percentage: number; grade: string; passed: boolean }>;
  can_edit: boolean;
}

const list = <T,>(data: any): T[] => (Array.isArray(data) ? data : data?.results || []);
const base = (id: string) => `/students/${encodeURIComponent(id)}`;

const householdService = {
  profile: async (studentId: string) => (await api.get<StudentProfile>(`${base(studentId)}/profile/`)).data,

  addGuardian: async (studentId: string, body: Partial<LinkFlags> & { guardian_id?: string; guardian?: Partial<Guardian> }) =>
    (await api.post<GuardianLink>(`${base(studentId)}/guardians/`, body)).data,
  updateLink: async (studentId: string, linkId: string, body: Partial<LinkFlags>) =>
    (await api.patch<GuardianLink>(`${base(studentId)}/guardians/${linkId}/`, body)).data,
  removeLink: async (studentId: string, linkId: string) => api.delete(`${base(studentId)}/guardians/${linkId}/`),

  updateGuardian: async (guardianId: string, body: Partial<Guardian>) =>
    (await api.patch<Guardian>(`/students/guardians/${guardianId}/`, body)).data,
  searchGuardians: async (search: string) =>
    list<Guardian>((await api.get('/students/guardians/', { params: { search } })).data),

  saveHealth: async (studentId: string, body: Partial<Health>) =>
    (await api.put<Health>(`${base(studentId)}/health/`, body)).data,
  addImmunization: async (studentId: string, body: Partial<Immunization>) =>
    (await api.post<Immunization>(`${base(studentId)}/immunizations/`, body)).data,
  removeImmunization: async (studentId: string, id: string) => api.delete(`${base(studentId)}/immunizations/${id}/`),

  households: async (search = '') =>
    list<Household>((await api.get('/students/households/', { params: search ? { search } : {} })).data),
  household: async (id: string) => (await api.get<Household>(`/students/households/${id}/`)).data,
  createHousehold: async (body: Partial<Household>) => (await api.post<Household>('/students/households/', body)).data,
  updateHousehold: async (id: string, body: Partial<Household>) =>
    (await api.patch<Household>(`/students/households/${id}/`, body)).data,
  moveStudent: async (studentId: string, householdId: string) =>
    (await api.post(`${base(studentId)}/household/`, { household_id: householdId })).data,
};

export default householdService;
