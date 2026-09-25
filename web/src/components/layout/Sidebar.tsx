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

  const navItems = [
    { label: 'My Profile', path: '/profile', icon: Users2, show: true },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: Layers,
      show: true,
    },
    { label: 'Release Timeline', path: '/releases', icon: Layers, show: true },
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      label: 'Tasks Workspace',
      path: '/tasks',
      icon: Kanban,
      show: true,
    },
    {
      label: 'Projects & Products',
      path: '/projects',
      icon: FolderKanban,
      show: true,
    },
    {
      label: 'Clients CRM',
      path: '/clients',
      icon: Users2,
      show: true,
    },
    {
      label: 'Timesheets & Effort',
      path: '/timesheets',
      icon: Clock,
      show: true,
    },
    {
      label: 'Masters & Setup',
      path: '/admin',
      icon: Settings,
      show:
        isSuperAdmin ||
        hasPermission('USERS:MANAGE') ||
        hasPermission('BRANCHES:MANAGE'),
    },
    {
      label: 'Audit Trail',
      path: '/audit',
      icon: ShieldCheck,
      show: isSuperAdmin || hasPermission('AUDIT_LOGS:VIEW'),
    },
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
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 lg:static ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Layers className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                  KS-PMT
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Kashvira Infotech
                </span>
              </div>
            )}
          </div>

          <button
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

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 dark:bg-blue-600'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                    } ${collapsed ? 'justify-center px-0' : ''}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
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
                  Enterprise Edition v1.0
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
