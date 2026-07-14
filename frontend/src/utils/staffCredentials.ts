export interface StaffCredential {
  username: string;
  password: string;
}

const STORAGE_KEY = 'staff_login_credentials';

type CredentialStore = Record<string, StaffCredential>;

const readStore = (): CredentialStore => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeStore = (store: CredentialStore) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const idSuffixFor = (teacher: any): string =>
  teacher?.employee_id ? String(teacher.employee_id) : String(Date.now()).slice(-4);

const generateDefault = (teacher: any): StaffCredential => {
  const cleanName = String(teacher?.full_name || 'staff').toLowerCase().replace(/\s+/g, '');
  const idSuffix = idSuffixFor(teacher);
  return {
    username: `${cleanName}${idSuffix}`,
    password: `staff_${idSuffix}`,
  };
};

/**
 * Returns the stored credential for a teacher. If none exists yet, it is
 * generated with the shared algorithm and persisted so that the login page
 * (which validates against `staff_login_credentials`) and every page that
 * displays credentials always agree.
 */
export const getStaffCredential = (teacher: any): StaffCredential => {
  if (!teacher?.id) return generateDefault(teacher);
  const store = readStore();
  const existing = store[teacher.id];
  if (existing && existing.username) {
    return { username: existing.username, password: existing.password || existing.username };
  }
  const cred = generateDefault(teacher);
  store[teacher.id] = cred;
  writeStore(store);
  return cred;
};

/**
 * Ensures every teacher in the list has a persisted credential and returns the
 * full credential map. Used by pages that render a table of all staff logins.
 */
export const ensureStaffCredentials = (teachers: any[]): CredentialStore => {
  const store = readStore();
  let changed = false;
  teachers.forEach((t) => {
    if (t?.id && !store[t.id]) {
      store[t.id] = generateDefault(t);
      changed = true;
    }
  });
  if (changed) writeStore(store);
  return store;
};

export const saveStaffCredential = (teacherId: string, cred: StaffCredential) => {
  const store = readStore();
  store[teacherId] = cred;
  writeStore(store);
};
