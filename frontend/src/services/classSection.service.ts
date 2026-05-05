import api from './api';

export interface Section {
  id: string;
  name: string;
  code: string;
}

export interface ClassWithSections {
  id: string;
  code: string;
  name: string;
  sections: Section[];
}

const classSectionService = {
  getClassesWithSections: async () => {
    try {
      const response = await api.get('/academics/classes-with-sections/');
      return response;
    } catch (error: any) {
      console.error('API Error:', error.response?.status, error.message);
      // Return empty data structure instead of failing
      return { data: [] };
    }
  },
  
  getSectionsForClass: async (classId: string) => {
    try {
      const response = await api.get(`/academics/sections-for-class/${classId}/`);
      return response;
    } catch (error) {
      console.error('Failed to get sections:', error);
      return { data: [] };
    }
  },
};

export default classSectionService;
