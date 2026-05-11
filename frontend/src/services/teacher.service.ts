import api from './api';

export interface Teacher {
  id: string;
  teacher_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  specialization: string;
  qualification: string;
  joining_date?: string;
  status: 'active' | 'on_leave' | 'inactive';
  bio?: string;
  courses?: string[];
  location?: string;
}

const SAMPLE_TEACHERS: Teacher[] = [
  {
    id: '1',
    teacher_id: 'TCH-001',
    first_name: 'Dr. Ahmed',
    last_name: 'Raza',
    email: 'ahmed.raza@edu.com',
    phone: '+92 300 1111111',
    department: 'Computer Science',
    specialization: 'AI & Machine Learning',
    qualification: 'PhD',
    joining_date: '2020-08-15',
    status: 'active',
    bio: 'Experienced lecturer in artificial intelligence, machine learning, and data science with a passion for student mentoring.',
    courses: ['CS101', 'CS202'],
    location: 'Main Campus',
  },
  {
    id: '2',
    teacher_id: 'TCH-002',
    first_name: 'Prof. Sara',
    last_name: 'Khan',
    email: 'sara.khan@edu.com',
    phone: '+92 321 2222222',
    department: 'Mathematics',
    specialization: 'Calculus',
    qualification: 'MPhil',
    joining_date: '2019-01-10',
    status: 'active',
    bio: 'Dedicated mathematics instructor focused on interactive learning and practical problem solving.',
    courses: ['MATH101', 'MATH202'],
    location: 'Science Block',
  },
];

const STORAGE_KEY = 'erp_teachers';

// Helper function to get teachers from localStorage or fallback to sample data
const getStoredTeachers = (): Teacher[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading teachers from localStorage:', error);
  }
  // Initialize with sample data if nothing in storage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_TEACHERS));
  return SAMPLE_TEACHERS;
};

// Helper function to save teachers to localStorage
const saveTeachers = (teachers: Teacher[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teachers));
  } catch (error) {
    console.error('Error saving teachers to localStorage:', error);
  }
};

const teacherService = {
  // Get all teachers
  getAll: () => {
    return new Promise<{ data: Teacher[] }>((resolve) => {
      const teachers = getStoredTeachers();
      resolve({ data: teachers });
    });
  },

  // Get single teacher by ID
  getById: (id: string) => {
    return new Promise<{ data: Teacher }>((resolve, reject) => {
      const teachers = getStoredTeachers();
      const teacher = teachers.find(t => t.id === id);
      if (teacher) {
        resolve({ data: teacher });
      } else {
        reject(new Error('Teacher not found'));
      }
    });
  },

  // Create new teacher
  create: (teacherData: Partial<Teacher>) => {
    return new Promise<{ data: Teacher }>((resolve) => {
      const teachers = getStoredTeachers();

      // Generate new ID and teacher_id
      const newId = (Math.max(...teachers.map(t => parseInt(t.id))) + 1).toString();
      const newTeacherId = `TCH-${String(newId).padStart(3, '0')}`;

      const newTeacher: Teacher = {
        id: newId,
        teacher_id: teacherData.teacher_id || newTeacherId,
        first_name: teacherData.first_name || '',
        last_name: teacherData.last_name || '',
        email: teacherData.email || '',
        phone: teacherData.phone || '',
        department: teacherData.department || '',
        specialization: teacherData.specialization || '',
        qualification: teacherData.qualification || '',
        joining_date: new Date().toISOString().split('T')[0],
        status: 'active',
        bio: '',
        courses: [],
        location: 'Main Campus',
        ...teacherData,
      };

      teachers.push(newTeacher);
      saveTeachers(teachers);

      resolve({ data: newTeacher });
    });
  },

  // Update teacher
  update: (id: string, teacherData: Partial<Teacher>) => {
    return new Promise<{ data: Teacher }>((resolve, reject) => {
      const teachers = getStoredTeachers();
      const index = teachers.findIndex(t => t.id === id);

      if (index !== -1) {
        teachers[index] = { ...teachers[index], ...teacherData };
        saveTeachers(teachers);
        resolve({ data: teachers[index] });
      } else {
        reject(new Error('Teacher not found'));
      }
    });
  },

  // Delete teacher
  delete: (id: string) => {
    return new Promise<void>((resolve, reject) => {
      const teachers = getStoredTeachers();
      const filteredTeachers = teachers.filter(t => t.id !== id);

      if (filteredTeachers.length < teachers.length) {
        saveTeachers(filteredTeachers);
        resolve();
      } else {
        reject(new Error('Teacher not found'));
      }
    });
  },
};

export default teacherService;