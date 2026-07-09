import api from './api';

const pdfService = {
  // ==================== Student Reports ====================
  downloadResultCard: async (studentId: string, term?: string, academicYear?: string) => {
    try {
      const params: any = {};
      if (term) params.term = term;
      if (academicYear) params.academic_year = academicYear;
      
      const response = await api.get(`/auth/pdf/result-card/${studentId}/`, {
        params,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `result_card_${studentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading result card:', error);
      throw new Error('Failed to download result card. Please try again.');
    }
  },

  downloadFeeReceipt: async (invoiceId: string) => {
    try {
      const response = await api.get(`/auth/pdf/fee-receipt/${invoiceId}/`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fee_receipt_${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading fee receipt:', error);
      throw new Error('Failed to download receipt. Please try again.');
    }
  },

  // ==================== Admission Documents ====================
  downloadAdmissionLetter: async (studentId: string) => {
    try {
      const response = await api.get(`/auth/pdf/admission-letter/${studentId}/`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `admission_letter_${studentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading admission letter:', error);
      throw new Error('Failed to download admission letter. Please try again.');
    }
  },

  // ==================== ID Cards ====================
  downloadStudentIdCard: async (studentId: string) => {
    try {
      const response = await api.get(`/auth/pdf/student-id-card/${studentId}/`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `student_id_card_${studentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading student ID card:', error);
      throw new Error('Failed to download student ID card. Please try again.');
    }
  },

  downloadTeacherIdCard: async (teacherId: string) => {
    try {
      const response = await api.get(`/auth/pdf/teacher-id-card/${teacherId}/`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `teacher_id_card_${teacherId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading teacher ID card:', error);
      throw new Error('Failed to download teacher ID card. Please try again.');
    }
  },

  // ==================== Reports ====================
  downloadAttendanceReport: async (params: { start_date: string; end_date: string; class_id?: string }) => {
    try {
      const response = await api.get('/auth/pdf/attendance-report/', {
        params,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${params.start_date}_to_${params.end_date}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attendance report:', error);
      throw new Error('Failed to download attendance report. Please try again.');
    }
  },

  downloadExamReport: async (examId: string) => {
    try {
      const response = await api.get(`/auth/pdf/exam-report/${examId}/`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `exam_report_${examId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading exam report:', error);
      throw new Error('Failed to download exam report. Please try again.');
    }
  },

  // ==================== Bulk Downloads ====================
  downloadBulkStudentIdCards: async (studentIds: string[]) => {
    try {
      const response = await api.post('/auth/pdf/bulk-student-id-cards/', 
        { student_ids: studentIds },
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `student_id_cards_bulk.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading bulk student ID cards:', error);
      throw new Error('Failed to download student ID cards. Please try again.');
    }
  },

  // ==================== Helper: Download from Blob ====================
  downloadBlob: (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};

export default pdfService;