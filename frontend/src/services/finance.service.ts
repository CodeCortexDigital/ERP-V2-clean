import api from './api';

const financeService = {
  // Fee Structures
  getFeeStructures: () => api.get('/auth/finance/fee-structures/'),
  getFeeStructure: (id: string) => api.get(`/auth/finance/fee-structures/${id}/`),
  createFeeStructure: (data: any) => api.post('/auth/finance/fee-structures/', data),
  updateFeeStructure: (id: string, data: any) => api.put(`/auth/finance/fee-structures/${id}/`, data),
  deleteFeeStructure: (id: string) => api.delete(`/auth/finance/fee-structures/${id}/`),
  
  // Invoices
  getInvoices: (params?: any) => api.get('/auth/finance/invoices/', { params }),
  getInvoice: (id: string) => api.get(`/auth/finance/invoices/${id}/`),
  createInvoice: (data: any) => api.post('/auth/finance/invoices/', data),
  updateInvoice: (id: string, data: any) => api.patch(`/auth/finance/invoices/${id}/`, data),
  deleteInvoice: (id: string) => api.delete(`/auth/finance/invoices/${id}/`),
  
  // Payments
  getPayments: (params?: any) => api.get('/auth/finance/payments/', { params }),
  getPayment: (id: string) => api.get(`/auth/finance/payments/${id}/`),
  createPayment: (data: any) => api.post('/auth/finance/payments/', data),
  deletePayment: (id: string) => api.delete(`/auth/finance/payments/${id}/`),
  
  // Summary
  getSummary: () => api.get('/auth/finance/summary/'),
};

export default financeService;
