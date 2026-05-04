import api from './api';

export interface SchoolClass {
  id: string;
  name: string;
  code: string;
  capacity: number;
  is_active: boolean;
}

const classService = {
  getAll: () => api.get<SchoolClass[]>('/classes/'),
  getById: (id: string) => api.get<SchoolClass>(`/classes/${id}/`),
};

export default classService;
