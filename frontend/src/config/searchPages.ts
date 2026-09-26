// Pages anyone can jump to from the search box, by role. Matched on the label and the extra words.
export interface PageLink { label: string; url: string; words?: string }

const OFFICE: PageLink[] = [
  { label: 'Dashboard', url: '/dashboard' },
  { label: 'All students', url: '/education/students', words: 'pupils list' },
  { label: 'Add a student', url: '/education/students/add', words: 'new admission enrol' },
  { label: 'Households', url: '/education/students/families', words: 'families parents' },
  { label: 'Family updates', url: '/education/students/family-updates', words: 'contact changes address' },
  { label: 'Admissions', url: '/education/admissions', words: 'applications apply' },
  { label: 'Mark attendance', url: '/education/attendance/mark', words: 'register absent present' },
  { label: 'Absence notes', url: '/education/attendance', words: 'attendance reports' },
  { label: 'Invoices', url: '/education/fees/invoices', words: 'fees challan bills' },
  { label: 'Collect fees', url: '/education/fees/collect-fees', words: 'payment receive cash' },
  { label: 'Family accounts', url: '/education/fees/families', words: 'statement balance' },
  { label: 'Online payments', url: '/education/fees/online-payments', words: 'stripe jazzcash easypaisa card' },
  { label: 'Gradebook', url: '/education/gradebook', words: 'marks grades assignments' },
  { label: 'Report cards', url: '/education/gradebook/report-cards', words: 'results transcript' },
  { label: 'Behaviour log', url: '/education/behaviour?tab=log', words: 'incidents merits discipline' },
  { label: 'Calendar', url: '/calendar', words: 'events holidays' },
  { label: 'Messages', url: '/messages', words: 'inbox chat' },
  { label: 'Announcements', url: '/announcements', words: 'notice broadcast' },
  { label: 'Library desk', url: '/education/library', words: 'issue return books borrow' },
  { label: 'Transport today', url: '/education/transport', words: 'bus trips routes' },
  { label: 'Inventory', url: '/education/inventory', words: 'stock store items' },
  { label: 'Cafeteria till', url: '/education/cafeteria', words: 'canteen food meals' },
  { label: 'Reports overview', url: '/education/analytics/insights', words: 'analytics charts statistics' },
  { label: 'Finance report', url: '/education/analytics/insights/finance', words: 'collection overdue ageing' },
  { label: 'Integrations', url: '/settings/integrations', words: 'microsoft google classroom email smtp' },
  { label: 'Plan & billing', url: '/settings/billing', words: 'subscription plan upgrade trial pricing' },
  { label: 'Import data', url: '/education/import', words: 'spreadsheet excel csv upload bulk students staff balances' },
  { label: 'Security & privacy', url: '/settings/security', words: 'passwords lock unlock access roles permissions' },
  { label: 'Activity log', url: '/settings/security?tab=activity', words: 'audit history who changed' },
  { label: 'Sign-in history', url: '/settings/security?tab=sign-ins', words: 'login attempts failed' },
  { label: 'People & access', url: '/settings/security?tab=people', words: 'accounts switch off disable sign out' },
  { label: 'Settings', url: '/settings' },
];
const TEACHER: PageLink[] = [
  { label: 'My day', url: '/teacher', words: 'dashboard today' },
  { label: 'My classes', url: '/teacher/classes', words: 'roster students' },
  { label: 'Class reports', url: '/teacher/reports', words: 'attention grades' },
  { label: 'Mark attendance', url: '/education/attendance/mark', words: 'register' },
  { label: 'Lesson attendance', url: '/education/attendance/lessons', words: 'period register' },
  { label: 'Gradebook', url: '/education/gradebook', words: 'marks grades' },
  { label: 'Behaviour log', url: '/education/behaviour?tab=log', words: 'merits incidents' },
  { label: 'Messages', url: '/messages' },
  { label: 'Calendar', url: '/calendar' },
  { label: 'Meetings', url: '/meetings', words: 'parent teacher' },
  { label: 'Library', url: '/library', words: 'books' },
];
const PARENT: PageLink[] = [
  { label: 'Dashboard', url: '/parent' },
  { label: 'My family', url: '/parent/children', words: 'children household address' },
  { label: 'Attendance', url: '/parent/attendance', words: 'absent report absence' },
  { label: 'Assignments', url: '/parent/assignments', words: 'homework' },
  { label: 'Progress', url: '/parent/progress', words: 'grades results report card' },
  { label: 'Fees & billing', url: '/parent/fees', words: 'invoice pay' },
  { label: 'Documents', url: '/parent/documents' },
  { label: 'Applications', url: '/parent/applications', words: 'admission sibling' },
  { label: 'Library', url: '/parent/library', words: 'books' },
  { label: 'Transport', url: '/parent/transport', words: 'bus' },
  { label: 'Cafeteria', url: '/parent/cafeteria', words: 'canteen food top up' },
  { label: 'Messages', url: '/messages' },
  { label: 'Calendar', url: '/calendar' },
  { label: 'Meetings', url: '/meetings', words: 'parent teacher' },
];
const STUDENT: PageLink[] = [
  { label: 'Dashboard', url: '/student' },
  { label: 'Assignments', url: '/student/assignments', words: 'homework' },
  { label: 'Progress', url: '/student/progress', words: 'grades results' },
  { label: 'Attendance', url: '/student/attendance' },
  { label: 'Timetable', url: '/student/timetable' },
  { label: 'Documents', url: '/student/documents' },
  { label: 'Library', url: '/student/library', words: 'books' },
  { label: 'Cafeteria', url: '/student/cafeteria', words: 'canteen food' },
  { label: 'Messages', url: '/messages' },
  { label: 'Calendar', url: '/calendar' },
];

export function pagesFor(role: string | null | undefined): PageLink[] {
  return role === 'admin' ? OFFICE : role === 'teacher' ? TEACHER : role === 'parent' ? PARENT : role === 'student' ? STUDENT : [];
}

export function matchPages(role: string | null | undefined, q: string, max = 5): PageLink[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return pagesFor(role)
    .map((p) => ({ p, hay: `${p.label} ${p.words || ''}`.toLowerCase() }))
    .filter(({ hay }) => s.split(/\s+/).every((w) => hay.includes(w)))
    .sort((a, b) => Number(!a.p.label.toLowerCase().startsWith(s)) - Number(!b.p.label.toLowerCase().startsWith(s)))
    .slice(0, max)
    .map(({ p }) => p);
}
