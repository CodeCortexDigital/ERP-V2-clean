import ModuleTabsLayout, { type ModuleTab } from '@/components/layout/ModuleTabsLayout';
import {
  Users, UserPlus, IdCard, FileText, KeyRound, BookOpenCheck
} from 'lucide-react';

const tabs: ModuleTab[] = [
  { id: 'list', path: '/education/teachers', label: 'All Employees', icon: Users },
  { id: 'add', path: '/education/teachers/add', label: 'New Employee', icon: UserPlus },
  { id: 'job', path: '/education/teachers/job-letter', label: 'Job Letter', icon: FileText },
  { id: 'idcards', path: '/education/teachers/id-cards', label: 'ID Cards', icon: IdCard },
  { id: 'logins', path: '/education/teachers/logins', label: 'Portal Logins', icon: KeyRound },
  { id: 'rules', path: '/education/teachers/rules', label: 'Staff Rules', icon: BookOpenCheck },
];

export default function TeachersLayout() {
  return <ModuleTabsLayout tabs={tabs} scopeClass="employees-scope" matchNested />;
}
