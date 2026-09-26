import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Kanban,
  FolderKanban,
  Users2,
  Clock,
  ShieldCheck,
  Settings,
  Layers,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Bell,
  CalendarDays,
  X,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const { hasPermission, user } = useAuth();

  const isSuperAdmin = user?.role_code === 'ROLE_SUPER_ADMIN';

  const groups = [
    { title: 'Workspace', items: [
      { label: 'Overview', path: '/dashboard', icon: LayoutDashboard, show: true },
      { label: 'Tasks', path: '/tasks', icon: Kanban, show: true },
      { label: 'Projects & products', path: '/projects', icon: FolderKanban, show: true },
      { label: 'Release timeline', path: '/releases', icon: CalendarDays, show: true },
      { label: 'Timesheets', path: '/timesheets', icon: Clock, show: true },
      { label: 'Clients', path: '/clients', icon: Users2, show: true },
    ]},
    { title: 'Organization', items: [
      { label: 'Masters & setup', path: '/admin', icon: Settings, show: isSuperAdmin || hasPermission('USERS:MANAGE') || hasPermission('BRANCHES:MANAGE') },
      { label: 'Audit trail', path: '/audit', icon: ShieldCheck, show: isSuperAdmin || hasPermission('AUDIT_LOGS:VIEW') },
    ]},
    { title: 'Personal', items: [
      { label: 'Notifications', path: '/notifications', icon: Bell, show: true },
      { label: 'My profile', path: '/profile', icon: Users2, show: true },
    ]},
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        aria-label="Workspace sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 lg:static ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-64 lg:w-20' : 'w-64'}`}
      >
        {/* Brand Header */}
        <div className={`flex h-20 shrink-0 items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 ${collapsed ? 'lg:flex-col lg:justify-center lg:gap-1 lg:px-2' : ''}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Layers className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                  KS-PMT
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Kashvira Infotech
                </span>
              </div>
            )}
          </div>

          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onToggleCollapse}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <button onClick={onCloseMobile} aria-label="Close menu" className="absolute right-3 top-6 rounded-lg p-2 text-slate-500 lg:hidden"><X className="h-4 w-4" /></button>
        {/* Navigation Items */}
        <nav aria-label="Main navigation" className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
          {groups.map(group => group.items.some(item => item.show) && (
            <div key={group.title}>
              <p className={`page-eyebrow mb-2 px-3 ${collapsed ? 'lg:hidden' : ''}`}>{group.title}</p>
              <div className="space-y-1">
                {group.items.filter(item => item.show).map(item => {
                  const Icon = item.icon;
                  return <NavLink key={item.path} to={item.path} onClick={onCloseMobile}
                    title={item.label}
                    className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${isActive ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}`}>
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
                  </NavLink>;
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Company Footer / Version badge */}
        {!collapsed && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
              <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="overflow-hidden text-[11px]">
                <p className="truncate font-semibold text-slate-800 dark:text-slate-200">
                  Kashvira Infotech
                </p>
                <p className="text-[10px] text-slate-400">
                  Your team. Connected.
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
