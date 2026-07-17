import api from './api';

export interface Certificate {
  id: string;
  template: string;
  recipient_type: string;
  recipient_name: string;
  recipient_id: string;
  recipient_details: Record<string, unknown>;
  custom_text: string;
  issue_date: string;
  created_at: string;
  updated_at: string;
}

class CertificateService {
  private baseUrl = '/auth/students/certificates/';

  async getCertificates(): Promise<Certificate[]> {
    const res = await api.get(this.baseUrl);
    return res.data.results || res.data;
  }

  async getCertificate(id: string): Promise<Certificate> {
    const res = await api.get(`${this.baseUrl}${id}/`);
    return res.data;
  }

  async createCertificate(data: Partial<Certificate>): Promise<Certificate> {
    const res = await api.post(this.baseUrl, data);
    return res.data;
  }

  async updateCertificate(id: string, data: Partial<Certificate>): Promise<Certificate> {
    const res = await api.put(`${this.baseUrl}${id}/`, data);
    return res.data;
  }

  async deleteCertificate(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}${id}/`);
  }
}

export const certificateService = new CertificateService();
