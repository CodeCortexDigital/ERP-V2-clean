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
      const response = await api.get('/auth/academics/classes/');
      const classesList = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || []);

      const classesWithSections = await Promise.all(
        classesList.map(async (cls: any) => {
          try {
            const sectionsRes = await api.get(`/auth/academics/classes/${cls.id}/sections/`);
            const sectionsList = Array.isArray(sectionsRes.data)
              ? sectionsRes.data
              : (sectionsRes.data.results || []);
            return {
              ...cls,
              sections: sectionsList
            };
          } catch (e) {
            return {
              ...cls,
              sections: []
            };
          }
        })
      );

      return { data: classesWithSections };
    } catch (error: any) {
      console.error('API Error in getClassesWithSections:', error);
      return { data: [] };
    }
  },
  
  getSectionsForClass: async (classId: string) => {
    try {
      const response = await api.get(`/auth/academics/classes/${classId}/sections/`);
      return response;
    } catch (error) {
      console.error('Failed to get sections:', error);
      return { data: [] };
    }
  },
};

export default classSectionService;
