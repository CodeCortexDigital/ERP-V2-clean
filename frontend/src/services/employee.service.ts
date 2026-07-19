// frontend/src/services/employee.service.ts
import api, { extractListData } from './api';

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------
export interface EmployeeTask {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  assignee_name?: string;
  priority: string;
  status: string;
  due_date?: string;
  completed_at?: string;
}

export const employeeTaskService = {
  list: async (status?: string): Promise<EmployeeTask[]> => {
    try {
      const res = await api.get('/auth/employee/tasks/', { params: status ? { status } : {} });
      return extractListData<EmployeeTask>(res.data);
    } catch {
      return [];
    }
  },
  create: async (data: Partial<EmployeeTask>): Promise<EmployeeTask> => {
    const res = await api.post('/auth/employee/tasks/', data);
    return res.data;
  },
  update: async (id: string, data: Partial<EmployeeTask>): Promise<EmployeeTask> => {
    const res = await api.patch(`/auth/employee/tasks/${id}/`, data);
    return res.data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/auth/employee/tasks/${id}/`);
  },
};

// ---------------------------------------------------------------------------
// Timesheet
// ---------------------------------------------------------------------------
export interface TimesheetEntry {
  id: string;
  date: string;
  hours_worked: number;
  note?: string;
  approved: boolean;
}

export const timesheetService = {
  list: async (): Promise<TimesheetEntry[]> => {
    try {
      const res = await api.get('/auth/employee/timesheets/');
      return extractListData<TimesheetEntry>(res.data);
    } catch {
      return [];
    }
  },
  create: async (data: Partial<TimesheetEntry>): Promise<TimesheetEntry> => {
    const res = await api.post('/auth/employee/timesheets/', data);
    return res.data;
  },
  update: async (id: string, data: Partial<TimesheetEntry>): Promise<TimesheetEntry> => {
    const res = await api.patch(`/auth/employee/timesheets/${id}/`, data);
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
export interface EmployeeDocument {
  id: string;
  title: string;
  document_type?: string;
  file_name?: string;
  file_url?: string;
  shared: boolean;
  created_at?: string;
}

export const employeeDocumentService = {
  list: async (): Promise<EmployeeDocument[]> => {
    try {
      const res = await api.get('/auth/employee/documents/');
      return extractListData<EmployeeDocument>(res.data);
    } catch {
      return [];
    }
  },
  upload: async (formData: FormData): Promise<EmployeeDocument> => {
    const res = await api.post('/auth/employee/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/auth/employee/documents/${id}/`);
  },
};

// ---------------------------------------------------------------------------
// Summary (dashboard widgets)
// ---------------------------------------------------------------------------
export const employeeSummaryService = {
  get: async (): Promise<{
    pending_tasks: number;
    done_tasks: number;
    total_hours: number;
    documents: number;
  }> => {
    try {
      const res = await api.get('/auth/employee/summary/');
      return res.data;
    } catch {
      return { pending_tasks: 0, done_tasks: 0, total_hours: 0, documents: 0 };
    }
  },
};

export default employeeTaskService;
