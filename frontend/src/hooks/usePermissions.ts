import { useAuth } from './useAuth';

export function usePermissions() {
  const { role } = useAuth();
  
  const canView = (module: string): boolean => {
    if (!role) return false;
    
    const permissions: Record<string, string[]> = {
      'students': ['admin', 'teacher', 'parent'],
      'attendance': ['admin', 'teacher'],
      'exams': ['admin', 'teacher', 'student'],
      'finance': ['admin', 'parent'],
      'admissions': ['admin'],
      'analytics': ['admin', 'teacher'],
      'communication': ['admin', 'teacher', 'parent'],
      'academics': ['admin', 'teacher', 'student']
    };
    
    const allowedRoles = permissions[module] || ['admin'];
      return allowedRoles.includes(role);
  };
  
    const userRole = role || 'guest';
  
  return { canView, userRole };
}
