import api from './api';

const pdfService = {
  downloadResultCard: async (studentId: string) => {
    try {
      const response = await api.get(`/auth/pdf/result-card/${studentId}/`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `result_card_${studentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading result card:', error);
      alert('Failed to download result card. Please try again.');
    }
  },

  downloadFeeReceipt: async (invoiceId: string) => {
    try {
      const response = await api.get(`/auth/pdf/fee-receipt/${invoiceId}/`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fee_receipt_${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading fee receipt:', error);
      alert('Failed to download receipt. Please try again.');
    }
  }
};

export default pdfService;
