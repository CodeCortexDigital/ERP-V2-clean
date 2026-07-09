import api, { extractListData } from './api';

export interface InstituteProfile {
  id?: string;
  name: string;
  logo?: string | null;
  address: string;
  phone: string;
  email: string;
  website: string;
  established_year?: number;
  motto?: string;
  description?: string;
  social_media?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface BankDetails {
  id?: string;
  bank_name: string;
  account_title: string;
  account_number: string;
  branch_code: string;
  iban: string;
  swift_code: string;
  branch_address: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AccountSettings {
  id?: string;
  email?: string;
  password?: string;
  currency: string;
  currency_symbol: string;
  timezone: string;
  date_format: string;
  language: string;
  notification_enabled: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  whatsapp_notifications: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RulesSettings {
  id?: string;
  student_rules: string;
  teacher_rules: string;
  staff_rules: string;
  parent_rules: string;
  admission_rules: string;
  exam_rules: string;
  updated_at?: string;
}

export interface ThemeSettings {
  id?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  dark_mode: boolean;
  font_family: string;
  layout: 'compact' | 'comfortable' | 'spacious';
  sidebar_collapsed: boolean;
  created_at?: string;
  updated_at?: string;
}

const settingsService = {
  // ==================== Institute Profile ====================
  getInstituteProfile: async () => {
    const response = await api.get('/auth/settings/institute/');
    return response;
  },
  
  updateInstituteProfile: async (data: Partial<InstituteProfile>) => {
    const response = await api.put('/auth/settings/institute/', data);
    return response;
  },
  
  getInstituteLogo: async () => {
    const response = await api.get('/auth/settings/institute/logo/');
    return response;
  },
  
  uploadInstituteLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await api.post('/auth/settings/institute/logo/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },

  // ==================== Bank Details ====================
  getBankDetails: async () => {
    const response = await api.get('/auth/settings/bank/');
    return response;
  },
  
  getBankDetail: async (id: string) => {
    const response = await api.get(`/auth/settings/bank/${id}/`);
    return response;
  },
  
  createBankDetail: async (data: Partial<BankDetails>) => {
    const response = await api.post('/auth/settings/bank/', data);
    return response;
  },
  
  updateBankDetail: async (id: string, data: Partial<BankDetails>) => {
    const response = await api.patch(`/auth/settings/bank/${id}/`, data);
    return response;
  },
  
  deleteBankDetail: async (id: string) => {
    const response = await api.delete(`/auth/settings/bank/${id}/`);
    return response;
  },
  
  getActiveBankDetails: async () => {
    const response = await api.get('/auth/settings/bank/', { params: { is_active: true } });
    return response;
  },

  // ==================== Account Settings ====================
  getAccountSettings: async () => {
    const response = await api.get('/auth/settings/account/');
    return response;
  },
  
  updateAccountSettings: async (data: Partial<AccountSettings>) => {
    const response = await api.patch('/auth/settings/account/', data);
    return response;
  },
  
  changePassword: async (oldPassword: string, newPassword: string) => {
    const response = await api.post('/auth/settings/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response;
  },
  
  updateEmail: async (email: string) => {
    const response = await api.post('/auth/settings/update-email/', { email });
    return response;
  },

  // ==================== Rules Settings ====================
  getRules: async () => {
    const response = await api.get('/auth/settings/rules/');
    return response;
  },
  
  updateRules: async (data: Partial<RulesSettings>) => {
    const response = await api.put('/auth/settings/rules/', data);
    return response;
  },
  
  getStudentRules: async () => {
    const response = await api.get('/auth/settings/rules/student/');
    return response;
  },
  
  updateStudentRules: async (student_rules: string) => {
    const response = await api.put('/auth/settings/rules/student/', { student_rules });
    return response;
  },
  
  getTeacherRules: async () => {
    const response = await api.get('/auth/settings/rules/teacher/');
    return response;
  },
  
  updateTeacherRules: async (teacher_rules: string) => {
    const response = await api.put('/auth/settings/rules/teacher/', { teacher_rules });
    return response;
  },
  
  getStaffRules: async () => {
    const response = await api.get('/auth/settings/rules/staff/');
    return response;
  },
  
  updateStaffRules: async (staff_rules: string) => {
    const response = await api.put('/auth/settings/rules/staff/', { staff_rules });
    return response;
  },

  // ==================== Theme Settings ====================
  getThemeSettings: async () => {
    const response = await api.get('/auth/settings/theme/');
    return response;
  },
  
  updateThemeSettings: async (data: Partial<ThemeSettings>) => {
    const response = await api.patch('/auth/settings/theme/', data);
    return response;
  },
  
  toggleDarkMode: async () => {
    const response = await api.post('/auth/settings/theme/toggle-dark-mode/');
    return response;
  },

  // ==================== System Settings ====================
  getSystemSettings: async () => {
    const response = await api.get('/auth/settings/system/');
    return response;
  },
  
  updateSystemSettings: async (data: any) => {
    const response = await api.patch('/auth/settings/system/', data);
    return response;
  },

  // ==================== Local Storage Helpers (Fallback) ====================
  // These provide fallback when backend is not available
  getLocalInstituteProfile: () => {
    try {
      const data = localStorage.getItem('institute_profile');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  
  setLocalInstituteProfile: (data: any) => {
    localStorage.setItem('institute_profile', JSON.stringify(data));
  },
  
  getLocalBankDetails: () => {
    try {
      const data = localStorage.getItem('bank_details');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  
  setLocalBankDetails: (data: any) => {
    localStorage.setItem('bank_details', JSON.stringify(data));
  },
  
  getLocalAccountSettings: () => {
    try {
      const data = localStorage.getItem('account_settings');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  
  setLocalAccountSettings: (data: any) => {
    localStorage.setItem('account_settings', JSON.stringify(data));
  },
  
  getLocalRules: () => {
    try {
      const data = localStorage.getItem('rules_settings');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  
  setLocalRules: (data: any) => {
    localStorage.setItem('rules_settings', JSON.stringify(data));
  },
  
  getLocalThemeSettings: () => {
    try {
      const data = localStorage.getItem('theme_settings');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  
  setLocalThemeSettings: (data: any) => {
    localStorage.setItem('theme_settings', JSON.stringify(data));
  },
  
  // ==================== Clear All Settings ====================
  clearAllLocalSettings: () => {
    const keys = [
      'institute_profile',
      'bank_details',
      'account_settings',
      'rules_settings',
      'theme_settings'
    ];
    keys.forEach(key => localStorage.removeItem(key));
  }
};

export default settingsService;