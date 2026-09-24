import api from './api';

/** One portal login, as issued by the server (see backend accounts/credentials.py). */
export interface PortalLogin {
  username: string;
  /** Issued password; null once the user has changed it (or no account exists). */
  password: string | null;
  status: 'issued' | 'changed_by_user' | 'not_issued' | 'no_account';
}

export interface StudentLogins {
  student: PortalLogin;
  parent: PortalLogin | null;
}

export interface StaffLogins {
  staff: PortalLogin;
}

/** What to print where a password would go. */
export const passwordLabel = (login?: PortalLogin | null): string => {
  if (!login) return '—';
  if (login.password) return login.password;
  if (login.status === 'changed_by_user') return 'Changed by user';
  if (login.status === 'no_account') return 'No account yet';
  return 'Not issued yet';
};

export const credentialsService = {
  student: async (studentId: string) =>
    (await api.get<StudentLogins>(`/auth/credentials/student/${studentId}/`)).data,

  resetStudent: async (studentId: string, who: 'student' | 'parent' = 'student') =>
    (await api.post<StudentLogins>(`/auth/credentials/student/${studentId}/reset/?who=${who}`)).data,

  staff: async (teacherId: string) =>
    (await api.get<StaffLogins>(`/auth/credentials/teacher/${teacherId}/`)).data,

  resetStaff: async (teacherId: string) =>
    (await api.post<StaffLogins>(`/auth/credentials/teacher/${teacherId}/reset/`)).data,

  listStudents: async () =>
    (await api.get<{ results: Record<string, StudentLogins> }>('/auth/credentials/students/')).data.results,

  listStaff: async () =>
    (await api.get<{ results: Record<string, StaffLogins> }>('/auth/credentials/teachers/')).data.results,

  /**
   * Issue passwords for accounts that have none yet. The server works in small
   * batches (hashing is slow), so keep calling until nothing remains.
   */
  issueMissing: async (kind: 'students' | 'teachers', onProgress?: (done: number, remaining: number) => void) => {
    let done = 0;
    for (;;) {
      const { issued, remaining } = (
        await api.post<{ issued: number; remaining: number }>(`/auth/credentials/${kind}/issue-missing/`)
      ).data;
      done += issued;
      onProgress?.(done, remaining);
      if (!remaining || !issued) return done;
    }
  },
};

export default credentialsService;
