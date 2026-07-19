// RolePermissions.tsx
import React, { useState } from 'react';
import { usePermissions, defaultRolePermissions } from '@/hooks/usePermissions';
import {
  Layout,
  BookOpen,
  Users,
  Briefcase,
  DollarSign,
  CreditCard,
  Receipt,
  Calendar,
  Clock3,
  Activity,
  MessageSquare,
  FileText,
  BarChart2,
  Award,
  ShoppingCart,
  Settings as SettingsIcon,
  LogIn,
  ShieldQuestion,
  ShieldCheck,
  UsersRound,
  UserCheck,
  User,
  UserX,
  Heart,
  RotateCcw,
  Search,
} from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const moduleGroups: Record<string, { id: string; label: string; icon: React.ReactNode }[]> = {
  'main-modules': [
    { id: 'dashboard', label: 'Dashboard', icon: <Layout className="w-4 h-4" /> },
    { id: 'academic-setup', label: 'Academic Setup', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'students', label: 'Students', icon: <Users className="w-4 h-4" /> },
    { id: 'employees', label: 'Employees', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'accounts', label: 'Accounts', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'fees', label: 'Fees', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'salary', label: 'Salary', icon: <Receipt className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <Calendar className="w-4 h-4" /> },
    { id: 'timetable', label: 'Timetable', icon: <Clock3 className="w-4 h-4" /> },
    { id: 'behaviour', label: 'Behaviour & Skills', icon: <Activity className="w-4 h-4" /> },
    { id: 'communication', label: 'Communication', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'exams', label: 'Exams', icon: <FileText className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'certificates', label: 'Certificates', icon: <Award className="w-4 h-4" /> },
    { id: 'store', label: 'Online Store', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ],
  'actions-subpages': [
    { id: 'login', label: 'Login Page', icon: <LogIn className="w-4 h-4" /> },
    { id: 'forgot-password', label: 'Forgot Password', icon: <ShieldQuestion className="w-4 h-4" /> },
  ],
};

const groupTabs: TabItem[] = [
  { id: 'main-modules', label: 'Main Modules', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'actions-subpages', label: 'Actions & Sub-pages', icon: <ShieldQuestion className="w-4 h-4" /> },
];

const roles = [
  { id: 'admin', label: 'Administrator', icon: <ShieldCheck className="w-5 h-5" />, color: 'bg-red-50 text-red-600 border-red-200' },
  { id: 'staff', label: 'Staff', icon: <UsersRound className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { id: 'teacher', label: 'Teacher', icon: <UserCheck className="w-5 h-5" />, color: 'bg-green-50 text-green-600 border-green-200' },
  { id: 'student', label: 'Student', icon: <User className="w-5 h-5" />, color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { id: 'parent', label: 'Parent', icon: <Heart className="w-5 h-5" />, color: 'bg-pink-50 text-pink-600 border-pink-200' },
  { id: 'user', label: 'Regular User', icon: <UserX className="w-5 h-5" />, color: 'bg-gray-50 text-gray-600 border-gray-200' },
];

// Build the union of all action keys that appear in the default matrix.
const ALL_ACTIONS = Array.from(
  new Set(
    Object.values(defaultRolePermissions)
      .flatMap((rolePerms) => Object.values(rolePerms))
      .flatMap((modulePerms) => Object.keys(modulePerms))
  )
).sort();

const actionBadgeColors: Record<string, string> = {
  view: 'bg-blue-100 text-blue-800',
  add: 'bg-green-100 text-green-800',
  edit: 'bg-yellow-100 text-yellow-800',
  delete: 'bg-red-100 text-red-800',
  export: 'bg-indigo-100 text-indigo-800',
  collect: 'bg-emerald-100 text-emerald-800',
  generate: 'bg-purple-100 text-purple-800',
  pay: 'bg-orange-100 text-orange-800',
  mark: 'bg-teal-100 text-teal-800',
  report: 'bg-cyan-100 text-cyan-800',
  bulk: 'bg-lime-100 text-lime-800',
  print: 'bg-amber-100 text-amber-800',
  send: 'bg-rose-100 text-rose-800',
  broadcast: 'bg-fuchsia-100 text-fuchsia-800',
  templates: 'bg-violet-100 text-violet-800',
  register: 'bg-sky-100 text-sky-800',
  enter: 'bg-pink-100 text-pink-800',
  results: 'bg-fuchsia-100 text-fuchsia-800',
  grading: 'bg-pink-100 text-pink-800',
  manage: 'bg-slate-100 text-slate-800',
};

const prettyAction = (action: string) =>
  action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, ' ');

export default function RolePermissions() {
  const { rolePermissions, savePermissions, resetToDefaults, setRolePermissions } = usePermissions();
  const [selectedRole, setSelectedRole] = useState('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('main-modules');

  // Admin is read-only and always fully enabled.
  const isAdmin = selectedRole === 'admin';

  const filteredModules = (moduleGroups[selectedTab] || []).filter(
    (module) =>
      module.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getModulePerms = (moduleId: string): Record<string, boolean> =>
    (rolePermissions[selectedRole as keyof typeof rolePermissions]?.[moduleId] as Record<string, boolean>) || {};

  const handlePermissionChange = (moduleId: string, action: string) => {
    if (isAdmin) return;
    const rolePerms = { ...(rolePermissions[selectedRole as keyof typeof rolePermissions] || {}) };
    const modulePerms = { ...(rolePerms[moduleId] || {}) };
    modulePerms[action] = !modulePerms[action];
    rolePerms[moduleId] = modulePerms;
    savePermissions({ [selectedRole]: rolePerms } as any);
  };

  const resetRoleToDefaults = (roleId: string) => {
    if (roleId === 'admin') return;
    const rolePerms = { ...(defaultRolePermissions[roleId as keyof typeof defaultRolePermissions] || {}) };
    savePermissions({ [roleId]: rolePerms } as any);
  };

  const setModuleAll = (moduleId: string, value: boolean) => {
    if (isAdmin) return;
    const rolePerms = { ...(rolePermissions[selectedRole as keyof typeof rolePermissions] || {}) };
    const modulePerms = { ...(rolePerms[moduleId] || {}) };
    ALL_ACTIONS.forEach((action) => {
      modulePerms[action] = value;
    });
    rolePerms[moduleId] = modulePerms;
    savePermissions({ [selectedRole]: rolePerms } as any);
  };

  const setRoleAll = (value: boolean) => {
    if (isAdmin) return;
    const rolePerms = { ...(rolePermissions[selectedRole as keyof typeof rolePermissions] || {}) };
    Object.values(moduleGroups)
      .flat()
      .forEach((module) => {
        const modulePerms = { ...(rolePerms[module.id] || {}) };
        ALL_ACTIONS.forEach((action) => {
          modulePerms[action] = value;
        });
        rolePerms[module.id] = modulePerms;
      });
    savePermissions({ [selectedRole]: rolePerms } as any);
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Role-Based Access Control</h1>
          <p className="text-slate-600">Configure permissions for different user roles</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset All to Defaults
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64 space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">Select Role</h3>
          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  selectedRole === role.id
                    ? `${role.color} border-current ring-2 ring-offset-2 ring-current`
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {role.icon}
                <span className="font-medium">{role.label}</span>
                {selectedRole === role.id && <div className="ml-auto w-2 h-2 rounded-full bg-current" />}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Quick Actions</h4>
            <div className="space-y-2">
              {roles.map((role) => (
                <button
                  key={`reset-${role.id}`}
                  onClick={() => resetRoleToDefaults(role.id)}
                  disabled={role.id === 'admin'}
                  className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:text-slate-400 disabled:hover:bg-transparent"
                >
                  Reset {role.label} to defaults
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap gap-2 mb-2">
            {groupTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedTab === tab.id
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-700">
              Permissions for {roles.find((r) => r.id === selectedRole)?.label}
              {isAdmin && <span className="ml-2 text-xs text-red-500 font-normal">(read-only)</span>}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRoleAll(true)}
                disabled={isAdmin}
                className="px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Grant All
              </button>
              <button
                onClick={() => setRoleAll(false)}
                disabled={isAdmin}
                className="px-3 py-2 text-sm font-medium bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Revoke All
              </button>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search permissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <div className="grid gap-4" style={{ gridTemplateColumns: `minmax(180px, 1fr) repeat(${ALL_ACTIONS.length}, minmax(48px, 1fr))` }}>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700">Module</h4>
                </div>
                {ALL_ACTIONS.map((action) => (
                  <div key={action} className="text-center">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${actionBadgeColors[action] || 'bg-gray-100 text-gray-800'}`}>
                      {prettyAction(action)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredModules.map((module) => {
                const modulePerms = getModulePerms(module.id);
                return (
                  <div
                    key={module.id}
                    className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors"
                  >
                    <div className="px-4 py-3">
                      <div className="grid gap-4 items-center" style={{ gridTemplateColumns: `minmax(180px, 1fr) repeat(${ALL_ACTIONS.length}, minmax(48px, 1fr))` }}>
                        <div className="flex items-center gap-3">
                          {module.icon}
                          <span className="font-medium text-slate-800">{module.label}</span>
                          <span className="text-xs text-slate-500">({module.id})</span>
                          {!isAdmin && (
                            <div className="flex items-center gap-1 ml-1">
                              <button
                                onClick={() => setModuleAll(module.id, true)}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200"
                                title="Check all actions"
                              >
                                All
                              </button>
                              <button
                                onClick={() => setModuleAll(module.id, false)}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 hover:bg-rose-200"
                                title="Clear all actions"
                              >
                                None
                              </button>
                            </div>
                          )}
                        </div>
                        {ALL_ACTIONS.map((action) => {
                          const enabled = !!modulePerms[action];
                          return (
                            <button
                              key={action}
                              onClick={() => handlePermissionChange(module.id, action)}
                              disabled={isAdmin}
                              className={`h-8 w-full rounded-md transition-all flex items-center justify-center text-sm ${
                                enabled
                                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                                  : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                              } disabled:cursor-not-allowed`}
                            >
                              {enabled ? '✓' : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredModules.length === 0 && (
                <div className="px-4 py-8 text-center text-slate-500">
                  No permissions found matching your search.
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Permission Legend</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-600 rounded"></div>
                <span>Has Permission</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white border border-slate-300 rounded"></div>
                <span>No Permission</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 text-red-800 px-1 rounded">✗</div>
                <span>Restricted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 text-green-800 px-1 rounded">✓</div>
                <span>Enabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
