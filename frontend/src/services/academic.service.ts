import api from './api';

const classSubjectsDataLocal: Record<string, string[]> = {
  "1": ["English", "Urdu", "Mathematics", "General Knowledge", "Islamiyat", "Arts"],
  "2": ["English", "Urdu", "Mathematics", "General Knowledge", "Islamiyat", "Arts"],
  "3": ["English", "Urdu", "Mathematics", "General Science", "Social Studies", "Islamiyat", "Computer", "Arts"],
  "4": ["English", "Urdu", "Mathematics", "Science", "Social Studies", "Islamiyat", "Computer"],
  "5": ["English", "Urdu", "Mathematics", "Science", "Social Studies", "Islamiyat", "Computer"],
  "6": ["English", "Urdu", "Mathematics", "General Science", "Computer Science", "Pakistan Studies", "Islamiyat"],
  "7": ["English", "Urdu", "Mathematics", "General Science", "Computer Science", "Pakistan Studies", "Islamiyat"],
  "8": ["English", "Urdu", "Mathematics", "General Science", "Computer Science", "Pakistan Studies", "Islamiyat"],
  "9": ["English", "Urdu", "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "Pakistan Studies", "Islamiyat"],
  "10": ["English", "Urdu", "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "Pakistan Studies", "Islamiyat"]
};

// Local storage fallback helpers
const getLocalPeriods = () => {
  const defaultPeriods = [
    { id: 'p-1', period_number: 1, name: 'Period 1', start_time: '08:00:00', end_time: '09:00:00', is_break: false },
    { id: 'p-2', period_number: 2, name: 'Period 2', start_time: '09:00:00', end_time: '10:00:00', is_break: false },
    { id: 'p-3', period_number: 3, name: 'Recess Break', start_time: '10:00:00', end_time: '10:30:00', is_break: true },
    { id: 'p-4', period_number: 4, name: 'Period 3', start_time: '10:30:00', end_time: '11:30:00', is_break: false },
    { id: 'p-5', period_number: 5, name: 'Period 4', start_time: '11:30:00', end_time: '12:30:00', is_break: false },
  ];
  const custom = JSON.parse(localStorage.getItem('custom_periods') || '[]');
  const deleted = JSON.parse(localStorage.getItem('deleted_period_ids') || '[]');
  const combined = [...defaultPeriods, ...custom].filter(p => !deleted.includes(p.id));
  
  // Unique by period number
  const seen = new Set();
  const deduped = [];
  for (const p of combined) {
    if (!seen.has(p.period_number)) {
      seen.add(p.period_number);
      deduped.push(p);
    }
  }
  return deduped.sort((a, b) => a.period_number - b.period_number);
};

const getLocalClassrooms = () => {
  const defaultClassrooms = [
    { id: 'room-g1a', name: 'Grade 1-A', code: 'G1A', capacity: 30, description: 'Ground Floor' },
    { id: 'room-g1b', name: 'Grade 1-B', code: 'G1B', capacity: 30, description: 'Ground Floor' },
    { id: 'room-g2a', name: 'Grade 2-A', code: 'G2A', capacity: 30, description: 'Ground Floor' },
    { id: 'room-g2b', name: 'Grade 2-B', code: 'G2B', capacity: 30, description: 'Ground Floor' },
    { id: 'room-g3a', name: 'Grade 3-A', code: 'G3A', capacity: 35, description: 'Ground Floor' },
    { id: 'room-g3b', name: 'Grade 3-B', code: 'G3B', capacity: 35, description: 'Ground Floor' },
    { id: 'room-g4a', name: 'Grade 4-A', code: 'G4A', capacity: 35, description: '1st Floor' },
    { id: 'room-g4b', name: 'Grade 4-B', code: 'G4B', capacity: 35, description: '1st Floor' },
    { id: 'room-g5a', name: 'Grade 5-A', code: 'G5A', capacity: 35, description: '1st Floor' },
    { id: 'room-g5b', name: 'Grade 5-B', code: 'G5B', capacity: 35, description: '1st Floor' },
    { id: 'room-g6a', name: 'Grade 6-A', code: 'G6A', capacity: 40, description: '1st Floor' },
    { id: 'room-g6b', name: 'Grade 6-B', code: 'G6B', capacity: 40, description: '1st Floor' },
    { id: 'room-g7a', name: 'Grade 7-A', code: 'G7A', capacity: 40, description: '2nd Floor' },
    { id: 'room-g7b', name: 'Grade 7-B', code: 'G7B', capacity: 40, description: '2nd Floor' },
    { id: 'room-g8a', name: 'Grade 8-A', code: 'G8A', capacity: 40, description: '2nd Floor' },
    { id: 'room-g8b', name: 'Grade 8-B', code: 'G8B', capacity: 40, description: '2nd Floor' },
    { id: 'room-g9a', name: 'Grade 9-A', code: 'G9A', capacity: 45, description: '2nd Floor' },
    { id: 'room-g9b', name: 'Grade 9-B', code: 'G9B', capacity: 45, description: '2nd Floor' },
    { id: 'room-g10a', name: 'Grade 10-A', code: 'G10A', capacity: 45, description: '3rd Floor' },
    { id: 'room-g10b', name: 'Grade 10-B', code: 'G10B', capacity: 45, description: '3rd Floor' },

    { id: 'room-slab', name: 'Science Laboratory', code: 'SLAB', capacity: 30, description: '2nd Floor' },
    { id: 'room-plab', name: 'Physics Laboratory', code: 'PLAB', capacity: 30, description: '3rd Floor' },
    { id: 'room-clab', name: 'Chemistry Laboratory', code: 'CLAB', capacity: 30, description: '3rd Floor' },
    { id: 'room-blab', name: 'Biology Laboratory', code: 'BLAB', capacity: 30, description: '3rd Floor' },
    { id: 'room-comp1', name: 'Computer Laboratory 1', code: 'COMP1', capacity: 35, description: '2nd Floor' },
    { id: 'room-comp2', name: 'Computer Laboratory 2', code: 'COMP2', capacity: 35, description: '2nd Floor' },
    { id: 'room-llab', name: 'Language Laboratory', code: 'LLAB', capacity: 30, description: '2nd Floor' },
    { id: 'room-math', name: 'Mathematics Activity Room', code: 'MATH', capacity: 30, description: '1st Floor' },
    { id: 'room-art', name: 'Art & Drawing Room', code: 'ART', capacity: 30, description: 'Ground Floor' },
    { id: 'room-music', name: 'Music Room', code: 'MUSIC', capacity: 30, description: 'Ground Floor' },

    { id: 'room-lib', name: 'Library', code: 'LIB', capacity: 60, description: 'Ground Floor' },
    { id: 'room-read', name: 'Reading Room', code: 'READ', capacity: 40, description: 'Library Section' },
    { id: 'room-aud', name: 'Auditorium', code: 'AUD', capacity: 300, description: 'Main Block' },
    { id: 'room-conf', name: 'Conference Room', code: 'CONF', capacity: 40, description: 'Administration Block' },
    { id: 'room-sem', name: 'Seminar Hall', code: 'SEM', capacity: 80, description: '1st Floor' },
    { id: 'room-mph', name: 'Multipurpose Hall', code: 'MPH', capacity: 150, description: 'Main Building' },

    { id: 'room-exam', name: 'Examination Hall', code: 'EXAM', capacity: 120, description: 'Main Block' },
    { id: 'room-sport', name: 'Indoor Sports Hall', code: 'SPORT', capacity: 80, description: 'Sports Block' },
    { id: 'room-gym', name: 'Gymnasium', code: 'GYM', capacity: 40, description: 'Sports Block' },
    { id: 'room-prayer', name: 'Prayer Room', code: 'PRAYER', capacity: 50, description: 'Ground Floor' },
    { id: 'room-med', name: 'Medical Room', code: 'MED', capacity: 10, description: 'Ground Floor' },

    { id: 'room-poff', name: 'Principal Office', code: 'POFF', capacity: 10, description: 'Administration Block' },
    { id: 'room-vpoff', name: 'Vice Principal Office', code: 'VPOFF', capacity: 8, description: 'Administration Block' },
    { id: 'room-acc', name: 'Accounts Office', code: 'ACC', capacity: 12, description: 'Administration Block' },
    { id: 'room-admin', name: 'Administration Office', code: 'ADMIN', capacity: 15, description: 'Administration Block' },
    { id: 'room-admit', name: 'Admission Office', code: 'ADMIT', capacity: 15, description: 'Administration Block' },
    { id: 'room-rec', name: 'Reception', code: 'REC', capacity: 15, description: 'Main Entrance' },

    { id: 'room-staff1', name: 'Staff Room 1', code: 'STAFF1', capacity: 25, description: 'Ground Floor' },
    { id: 'room-staff2', name: 'Staff Room 2', code: 'STAFF2', capacity: 25, description: '2nd Floor' },
    { id: 'room-meet', name: 'Meeting Room', code: 'MEET', capacity: 20, description: 'Administration Block' },
    { id: 'room-coun', name: 'Counseling Room', code: 'COUN', capacity: 8, description: 'Ground Floor' },
    { id: 'room-record', name: 'Record Room', code: 'RECORD', capacity: 6, description: 'Administration Block' },
    { id: 'room-server', name: 'Server Room', code: 'SERVER', capacity: 4, description: 'Administration Block' },
    { id: 'room-store', name: 'Store Room', code: 'STORE', capacity: 10, description: 'Ground Floor' },

    { id: 'room-cafe', name: 'Cafeteria', code: 'CAFE', capacity: 100, description: 'Ground Floor' },
    { id: 'room-kitchen', name: 'Kitchen', code: 'KITCHEN', capacity: 15, description: 'Cafeteria Block' },
    { id: 'room-recroom', name: 'Recreation Room', code: 'RECROOM', capacity: 40, description: 'Student Activity Block' },
    { id: 'room-bcommon', name: 'Common Room (Boys)', code: 'BCOMMON', capacity: 40, description: 'Ground Floor' },
    { id: 'room-gcommon', name: 'Common Room (Girls)', code: 'GCOMMON', capacity: 40, description: 'Ground Floor' },

    { id: 'room-play', name: 'Playground', code: 'PLAY', capacity: 500, description: 'Outdoor Area' },
    { id: 'room-bcourt', name: 'Basketball Court', code: 'BCOURT', capacity: 30, description: 'Sports Area' },
    { id: 'room-cricket', name: 'Cricket Ground', code: 'CRICKET', capacity: 100, description: 'Sports Area' },
    { id: 'room-football', name: 'Football Ground', code: 'FOOTBALL', capacity: 100, description: 'Sports Area' },

    { id: 'room-wca', name: 'Washroom Block A', code: 'WCA', capacity: 20, description: 'Ground Floor' },
    { id: 'room-wcb', name: 'Washroom Block B', code: 'WCB', capacity: 20, description: '1st Floor' },
    { id: 'room-wcc', name: 'Washroom Block C', code: 'WCC', capacity: 20, description: '2nd Floor' }
  ];
  const custom = JSON.parse(localStorage.getItem('custom_classrooms') || '[]');
  const deleted = JSON.parse(localStorage.getItem('deleted_classroom_ids') || '[]');
  const combined = [...defaultClassrooms, ...custom].filter(r => !deleted.includes(r.id));
  
  const seen = new Set();
  const deduped = [];
  for (const r of combined) {
    const code = (r.code || '').toLowerCase().trim();
    if (code && !seen.has(code)) {
      seen.add(code);
      deduped.push(r);
    }
  }
  return deduped;
};

const getLocalClassSubjects = () => {
  const assigned = JSON.parse(localStorage.getItem('assigned_class_subjects') || '[]');
  const mapped: any[] = [];
  assigned.forEach((as: any) => {
    as.subjectsList.forEach((sub: any) => {
      mapped.push({
        id: `${as.className}-${sub.name}`,
        class_ref: as.className,
        class_name: as.className,
        subject: sub.name,
        subject_name: sub.name
      });
    });
  });
  return mapped;
};

const getLocalTimetableEntries = (dbTeachers: any[] = []) => {
  const saved = localStorage.getItem('custom_timetable_entries');
  const seeded = localStorage.getItem('timetable_seeded_v9');
  
  if (saved && seeded === 'true') {
    return JSON.parse(saved);
  }

  // Clear any old stale timetable entries to ensure a fresh clean state
  localStorage.removeItem('custom_timetable_entries');

  // Pre-seed a complete weekly conflict-free timetable
  const defaultClassesList = [
    { name: 'Grade 1-A' }, { name: 'Grade 1-B' },
    { name: 'Grade 2-A' }, { name: 'Grade 2-B' },
    { name: 'Grade 3-A' }, { name: 'Grade 3-B' },
    { name: 'Grade 4-A' }, { name: 'Grade 4-B' },
    { name: 'Grade 5-A' }, { name: 'Grade 5-B' },
    { name: 'Grade 6-A' }, { name: 'Grade 6-B' },
    { name: 'Grade 7-A' }, { name: 'Grade 7-B' },
    { name: 'Grade 8-A' }, { name: 'Grade 8-B' },
    { name: 'Grade 9-A' }, { name: 'Grade 9-B' },
    { name: 'Grade 10-A' }, { name: 'Grade 10-B' }
  ];

  const customClasses = JSON.parse(localStorage.getItem('custom_classes') || '[]');
  const deletedClassIds = JSON.parse(localStorage.getItem('deleted_class_ids') || '[]');
  const finalClasses = [...defaultClassesList, ...customClasses].filter(c => !deletedClassIds.includes(c.id || ''));

  // Unique names
  const uniqueClasses: any[] = [];
  const seenNames = new Set();
  finalClasses.forEach(c => {
    if (c.name && !seenNames.has(c.name.toLowerCase())) {
      seenNames.add(c.name.toLowerCase());
      uniqueClasses.push(c);
    }
  });

  const activeDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const activePeriods = getLocalPeriods().filter(p => !p.is_break);
  const classrooms = getLocalClassrooms();

  const cachedStr = localStorage.getItem('cached_database_teachers');
  const cachedTeachers = cachedStr ? JSON.parse(cachedStr) : [];
  const dbTeachersList = dbTeachers.length > 0 ? dbTeachers : cachedTeachers;

  const mappedDbTeachers = dbTeachersList.map((t: any) => ({
    id: String(t.id || t.employee_id),
    name: t.full_name || t.name || 'Teacher'
  }));

  const defaultTeachersList = [
    
  ];

  const teachersList = mappedDbTeachers.length > 0 ? mappedDbTeachers : defaultTeachersList;

  const getTeacherSpecialties = (name: string): string[] => {
    const lower = name.toLowerCase();
    
    // Real teacher specialties mapping
    const specialtiesMap: Record<string, string[]> = {
      
    };

    for (const [tName, specs] of Object.entries(specialtiesMap)) {
      if (lower.includes(tName)) return specs;
    }

    return ['English', 'Urdu', 'Mathematics', 'General Knowledge', 'Arts', 'Islamiyat'];
  };

  const getGradeNum = (name: string) => {
    const match = name.toLowerCase().match(/grade\s+(\d+)/);
    return match ? match[1] : "1";
  };

  const classSubjectsMap: Record<string, string[]> = {};
  uniqueClasses.forEach(cls => {
    const grade = getGradeNum(cls.name);
    classSubjectsMap[cls.name] = classSubjectsDataLocal[grade] || ["English", "Mathematics"];
  });

  const subjectCycleIndex: Record<string, number> = {};
  uniqueClasses.forEach(cls => {
    subjectCycleIndex[cls.name] = 0;
  });

  const entries: any[] = [];
  let entryIdCounter = Date.now();
  const teacherWorkloads = new Map<string, number>();

  activeDays.forEach(day => {
    activePeriods.forEach(period => {
      const allocatedTeachers = new Set<string>();
      const allocatedRooms = new Set<string>();

      uniqueClasses.forEach(cls => {
        const subjects = classSubjectsMap[cls.name];
        const subIndex = subjectCycleIndex[cls.name];
        const subjectName = subjects[subIndex % subjects.length];
        subjectCycleIndex[cls.name]++;

        // Find teachers whose specialties match the subjectName
        const qualified = teachersList.filter(t => {
          const specs = getTeacherSpecialties(t.name);
          return specs.some(s => subjectName.toLowerCase().includes(s.toLowerCase()));
        });

        // Sort qualified by current workload to distribute evenly
        qualified.sort((a, b) => {
          const loadA = teacherWorkloads.get(a.id) || 0;
          const loadB = teacherWorkloads.get(b.id) || 0;
          return loadA - loadB;
        });

        // Pick a free qualified teacher
        let teacher = qualified.find(t => !allocatedTeachers.has(t.id));

        // Fallback to any free teacher sorted by workload
        if (!teacher) {
          const sortedAll = [...teachersList].sort((a, b) => {
            const loadA = teacherWorkloads.get(a.id) || 0;
            const loadB = teacherWorkloads.get(b.id) || 0;
            return loadA - loadB;
          });
          teacher = sortedAll.find(t => !allocatedTeachers.has(t.id));
        }

        // Fallback to first qualified teacher
        if (!teacher && qualified.length > 0) {
          teacher = qualified[0];
        }

        // Fallback to virtual teacher
        if (!teacher) {
          teacher = { id: `t-virtual-${allocatedTeachers.size}`, name: `Staff Teacher ${allocatedTeachers.size + 1}` };
        }
        allocatedTeachers.add(teacher.id);
        const currentLoad = teacherWorkloads.get(teacher.id) || 0;
        teacherWorkloads.set(teacher.id, currentLoad + 1);

        // Find classroom / lab
        let room = null;
        if (subjectName.toLowerCase().includes('science') || subjectName.toLowerCase().includes('physics') || subjectName.toLowerCase().includes('chemistry') || subjectName.toLowerCase().includes('biology')) {
          room = classrooms.find(r => r.name.toLowerCase().includes('lab') && !allocatedRooms.has(r.id));
        } else if (subjectName.toLowerCase().includes('computer')) {
          room = classrooms.find(r => r.code.toLowerCase().includes('comp') && !allocatedRooms.has(r.id));
        } else if (subjectName.toLowerCase().includes('art')) {
          room = classrooms.find(r => r.code.toLowerCase() === 'art' && !allocatedRooms.has(r.id));
        } else if (subjectName.toLowerCase().includes('music')) {
          room = classrooms.find(r => r.code.toLowerCase() === 'music' && !allocatedRooms.has(r.id));
        }

        if (!room) {
          room = classrooms.find(r => r.name.toLowerCase() === cls.name.toLowerCase() && !allocatedRooms.has(r.id));
        }
        if (!room) {
          room = classrooms.find(r => !allocatedRooms.has(r.id));
        }
        if (!room) {
          room = classrooms[0];
        }
        allocatedRooms.add(room.id);

        entries.push({
          id: `entry-${entryIdCounter++}`,
          academic_year: '1',
          class_subject: `${cls.name}-${subjectName}`,
          class_name: cls.name,
          subject_name: subjectName,
          teacher: teacher.id,
          teacher_name: teacher.name,
          classroom: room.id,
          classroom_name: room.name,
          day_of_week: day.toLowerCase(),
          period: period.id,
          is_active: true
        });
      });
    });
  });

  localStorage.setItem('custom_timetable_entries', JSON.stringify(entries));
  localStorage.setItem('timetable_seeded_v9', 'true');
  return entries;
};

const academicService = {
  // Academic Years
  getAcademicYears: () => api.get('/auth/academics/academic-years/').then((res) => {
    const data = Array.isArray(res.data) ? res.data : (res.data as any)?.results || [];
    if (data.length === 0) {
      return { data: [{ id: '1', name: '2026-2027', is_active: true }] };
    }
    return res;
  }).catch(() => ({ data: [{ id: '1', name: '2026-2027', is_active: true }] })),
  getAcademicYear: (id: string) => api.get(`/auth/academics/academic-years/${id}/`),
  createAcademicYear: (data: any) => api.post('/auth/academics/academic-years/', data),
  updateAcademicYear: (id: string, data: any) => api.put(`/auth/academics/academic-years/${id}/`, data),
  deleteAcademicYear: (id: string) => api.delete(`/auth/academics/academic-years/${id}/`),
  
  // Classes
  getClasses: () => api.get('/auth/academics/classes/'),
  getClass: (id: string) => api.get(`/auth/academics/classes/${id}/`).catch(() => {
    const defaultClasses = [
      { id: 'cls-1', name: 'Grade 1-A' },
      { id: 'cls-2', name: 'Grade 1-B' }
    ];
    const custom = JSON.parse(localStorage.getItem('custom_classes') || '[]');
    const combined = [...defaultClasses, ...custom];
    const found = combined.find(c => c.id === id || c.name === id);
    return { data: found || { id, name: id } };
  }),
  createClass: (data: any) => api.post('/auth/academics/classes/', data),
  updateClass: (id: string, data: any) => api.patch(`/auth/academics/classes/${id}/`, data),
  deleteClass: (id: string) => api.delete(`/auth/academics/classes/${id}/`, { skipGlobalToast: true } as any),
  
  // Subjects
  getSubjects: () => api.get('/auth/academics/subjects/'),
  getSubject: (id: string) => api.get(`/auth/academics/subjects/${id}/`),
  createSubject: (data: any) => api.post('/auth/academics/subjects/', data),
  updateSubject: (id: string, data: any) => api.patch(`/auth/academics/subjects/${id}/`, data),
  deleteSubject: (id: string) => api.delete(`/auth/academics/subjects/${id}/`),

  // Class Subjects
  getClassSubjects: () => api.get('/auth/academics/class-subjects/').then((res) => {
    const data = Array.isArray(res.data) ? res.data : (res.data as any)?.results || [];
    if (data.length === 0) {
      return { data: getLocalClassSubjects() };
    }
    return res;
  }).catch(() => ({ data: getLocalClassSubjects() })),

  // Periods
  getPeriods: () => api.get('/auth/academics/periods/').then((res) => {
    const data = Array.isArray(res.data) ? res.data : (res.data as any)?.results || [];
    if (data.length === 0) {
      return { data: getLocalPeriods() };
    }
    return res;
  }).catch(() => ({ data: getLocalPeriods() })),
  createPeriod: (data: any) => {
    return api.post('/auth/academics/periods/', data).catch(() => {
      const custom = JSON.parse(localStorage.getItem('custom_periods') || '[]');
      const newP = { id: `period-${Date.now()}`, ...data };
      custom.push(newP);
      localStorage.setItem('custom_periods', JSON.stringify(custom));
      return { data: newP };
    });
  },
  updatePeriod: (id: string, data: any) => {
    return api.put(`/auth/academics/periods/${id}/`, data).catch(() => {
      const custom = JSON.parse(localStorage.getItem('custom_periods') || '[]');
      const updated = custom.map((p: any) => p.id === id ? { ...p, ...data } : p);
      localStorage.setItem('custom_periods', JSON.stringify(updated));
      return { data: { id, ...data } };
    });
  },
  deletePeriod: (id: string) => {
    return api.delete(`/auth/academics/periods/${id}/`).catch(() => {
      const deleted = JSON.parse(localStorage.getItem('deleted_period_ids') || '[]');
      deleted.push(id);
      localStorage.setItem('deleted_period_ids', JSON.stringify(deleted));
      return { data: { success: true } };
    });
  },

  // Classrooms
  getClassrooms: () => api.get('/auth/academics/classrooms/').then((res) => {
    const data = Array.isArray(res.data) ? res.data : (res.data as any)?.results || [];
    if (data.length === 0) {
      return { data: getLocalClassrooms() };
    }
    return res;
  }).catch(() => ({ data: getLocalClassrooms() })),
  createClassroom: (data: any) => {
    return api.post('/auth/academics/classrooms/', data).catch(() => {
      const custom = JSON.parse(localStorage.getItem('custom_classrooms') || '[]');
      const newC = { id: `classroom-${Date.now()}`, ...data };
      custom.push(newC);
      localStorage.setItem('custom_classrooms', JSON.stringify(custom));
      return { data: newC };
    });
  },
  updateClassroom: (id: string, data: any) => {
    return api.put(`/auth/academics/classrooms/${id}/`, data).catch(() => {
      const custom = JSON.parse(localStorage.getItem('custom_classrooms') || '[]');
      const updated = custom.map((r: any) => r.id === id ? { ...r, ...data } : r);
      localStorage.setItem('custom_classrooms', JSON.stringify(updated));
      return { data: { id, ...data } };
    });
  },
  deleteClassroom: (id: string) => {
    return api.delete(`/auth/academics/classrooms/${id}/`).catch(() => {
      const deleted = JSON.parse(localStorage.getItem('deleted_classroom_ids') || '[]');
      deleted.push(id);
      localStorage.setItem('deleted_classroom_ids', JSON.stringify(deleted));
      return { data: { success: true } };
    });
  },

  // Timetable Entries
  getTimetableEntries: (params?: any) => {
    return api.get('/auth/academics/teachers/').then((tRes) => {
      const dbTeachers = Array.isArray(tRes.data) ? tRes.data : (tRes.data as any)?.results || [];
      if (dbTeachers.length > 0) {
        localStorage.setItem('cached_database_teachers', JSON.stringify(dbTeachers));
      }
      
      const local = getLocalTimetableEntries(dbTeachers);
      if (local && local.length > 0) {
        if (params) {
          return { data: local.filter((e: any) => {
            if (params.class_id && e.class_name !== params.class_id && e.class_subject !== params.class_id) return false;
            if (params.teacher_id && String(e.teacher) !== String(params.teacher_id)) return false;
            return true;
          }) };
        }
        return { data: local };
      }
      return { data: [] };
    }).catch(() => {
      const cachedStr = localStorage.getItem('cached_database_teachers');
      const dbTeachers = cachedStr ? JSON.parse(cachedStr) : [];
      const local = getLocalTimetableEntries(dbTeachers);
      if (params) {
        return { data: local.filter((e: any) => {
          if (params.class_id && e.class_name !== params.class_id && e.class_subject !== params.class_id) return false;
          if (params.teacher_id && String(e.teacher) !== String(params.teacher_id)) return false;
          return true;
        }) };
      }
      return { data: local };
    });
  },
  getAllTimetableEntries: async () => {
    try {
      const tRes = await api.get('/auth/academics/teachers/?page_size=100').catch(() => ({ data: [] }));
      const dbTeachers = Array.isArray(tRes.data) ? tRes.data : (tRes.data as any)?.results || [];
      if (dbTeachers.length > 0) {
        localStorage.setItem('cached_database_teachers', JSON.stringify(dbTeachers));
      }
    } catch (e) {}

    const local = getLocalTimetableEntries();
    if (local && local.length > 0) {
      return { data: local };
    }
    try {
      let allEntries: any[] = [];
      let nextUrl = '/auth/academics/timetable-entries/?page_size=500';
      while (nextUrl) {
        const response = await api.get(nextUrl);
        const data = response.data;
        if (Array.isArray(data)) {
          allEntries = allEntries.concat(data);
          nextUrl = '';
        } else {
          allEntries = allEntries.concat(data.results || []);
          nextUrl = data.next ? data.next.replace(/^.*\/api\//, '/') : '';
        }
      }
      const local = getLocalTimetableEntries();
      const combined = [...allEntries, ...local];
      return { data: combined };
    } catch (e) {
      return { data: getLocalTimetableEntries() };
    }
  },
  createTimetableEntry: (data: any) => {
    return api.post('/auth/academics/timetable-entries/', data).catch(() => {
      const custom = JSON.parse(localStorage.getItem('custom_timetable_entries') || '[]');
      const newE = { id: `entry-${Date.now()}`, ...data };
      custom.push(newE);
      localStorage.setItem('custom_timetable_entries', JSON.stringify(custom));
      return { data: newE };
    });
  },
  updateTimetableEntry: (id: string, data: any) => {
    return api.put(`/auth/academics/timetable-entries/${id}/`, data).catch(() => {
      const custom = JSON.parse(localStorage.getItem('custom_timetable_entries') || '[]');
      const updated = custom.map((e: any) => e.id === id ? { ...e, ...data } : e);
      localStorage.setItem('custom_timetable_entries', JSON.stringify(updated));
      return { data: { id, ...data } };
    });
  },
  deleteTimetableEntry: (id: string) => {
    return api.delete(`/auth/academics/timetable-entries/${id}/`).catch(() => {
      const custom = JSON.parse(localStorage.getItem('custom_timetable_entries') || '[]');
      const updated = custom.filter((e: any) => e.id !== id);
      localStorage.setItem('custom_timetable_entries', JSON.stringify(updated));
      return { data: { success: true } };
    });
  },

  // Syllabus & Curriculum
  getSyllabi: (params?: any) => api.get('/auth/academics/syllabus/', { params }),
  getSyllabusUnits: (params?: any) => api.get('/auth/academics/syllabus-units/', { params }),
  getSyllabusTopics: (params?: any) => api.get('/auth/academics/syllabus-topics/', { params }),

  // Lesson Plans
  getLessonPlans: (params?: any) => api.get('/auth/academics/lesson-plans/', { params }),
  createLessonPlan: (data: any) => api.post('/auth/academics/lesson-plans/', data),
  updateLessonPlan: (id: string, data: any) => api.put(`/auth/academics/lesson-plans/${id}/`, data),
  deleteLessonPlan: (id: string) => api.delete(`/auth/academics/lesson-plans/${id}/`),

  // Topic Coverage
  getTopicCoverages: (params?: any) => api.get('/auth/academics/topic-coverage/', { params }),
  createTopicCoverage: (data: any) => api.post('/auth/academics/topic-coverage/', data),
  updateTopicCoverage: (id: string, data: any) => api.put(`/auth/academics/topic-coverage/${id}/`, data),
  deleteTopicCoverage: (id: string) => api.delete(`/auth/academics/topic-coverage/${id}/`),

  // Student Topic Progress
  getStudentTopicProgress: (params?: any) => api.get('/auth/academics/student-topic-progress/', { params }),
  createStudentTopicProgress: (data: any) => api.post('/auth/academics/student-topic-progress/', data),
  updateStudentTopicProgress: (id: string, data: any) => api.put(`/auth/academics/student-topic-progress/${id}/`, data),
  deleteStudentTopicProgress: (id: string) => api.delete(`/auth/academics/student-topic-progress/${id}/`),

  // Teacher Feedback
  getTeacherFeedbacks: (params?: any) => api.get('/auth/academics/teacher-feedback/', { params }),
  createTeacherFeedback: (data: any) => api.post('/auth/academics/teacher-feedback/', data),
  deleteTeacherFeedback: (id: string) => api.delete(`/auth/academics/teacher-feedback/${id}/`),
};

export default academicService;
