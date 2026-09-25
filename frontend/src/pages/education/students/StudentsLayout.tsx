import ModuleTabsLayout, { type ModuleTab } from '@/components/layout/ModuleTabsLayout';
import {
  Users, UserPlus, Users2, ToggleLeft, FileText,
  IdCard, Printer, KeyRound, ArrowUpDown, BookOpenCheck
} from 'lucide-react';

const tabs: ModuleTab[] = [
  { id: 'list', path: '/education/students', label: 'All Students', icon: Users },
  { id: 'add', path: '/education/students/add', label: 'New Student', icon: UserPlus },
  { id: 'admission', path: '/education/students/admission-letter', label: 'Admission Letter', icon: FileText },
  { id: 'families', path: '/education/students/families', label: 'Households', icon: Users2 },
  { id: 'status', path: '/education/students/status', label: 'Active Status', icon: ToggleLeft },
  { id: 'idcards', path: '/education/students/id-cards', label: 'ID Cards', icon: IdCard },
  { id: 'logins', path: '/education/students/logins', label: 'Portal Logins', icon: KeyRound },
  { id: 'print', path: '/education/students/print-list', label: 'Print List', icon: Printer },
  { id: 'promote', path: '/education/students/promote', label: 'Class Promotion', icon: ArrowUpDown },
  { id: 'rules', path: '/education/students/rules', label: 'Student Rules', icon: BookOpenCheck },
];

export default function StudentsLayout() {
  return <ModuleTabsLayout tabs={tabs} scopeClass="students-scope" matchNested />;
}
