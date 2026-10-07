import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminScreens, portfolioScreens } from '../management/screens';
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
  Cpu,
  Users,
  ArrowRightLeft,
  GitMerge,
  LifeBuoy,
  FileCheck,
  UserCheck,
  ExternalLink,
  DollarSign,
  ClipboardCheck,
  FileText,
  ShieldAlert,
  Compass,
  BookOpen,
  Copy,
  History,
  Target,
  FileSpreadsheet,
  Activity,
  Percent,
  TrendingUp,
  GitBranch,
  Webhook,
  Sliders,
  Sparkles,
  Building2,
  AlertOctagon,
  UserCircle,
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
  const [hoveredItem, setHoveredItem] = React.useState<{ label: string; top: number } | null>(null);

  React.useEffect(() => {
    if (!collapsed) {
      setHoveredItem(null);
    }
  }, [collapsed]);

  const isSuperAdmin = user?.role_code === 'ROLE_SUPER_ADMIN';
  const canViewMasters = isSuperAdmin || hasPermission('USERS:MANAGE') || hasPermission('BRANCHES:MANAGE');

  const groups = [
    { title: 'Workspace', items: [
      { label: 'Overview', path: '/dashboard', icon: LayoutDashboard, show: true },
      { label: 'Tasks', path: '/tasks', icon: Kanban, show: true },
      ...portfolioScreens.map(screen => ({ label: screen.title, path: screen.path, icon: screen.icon || FolderKanban, show: true })),
      { label: 'Release timeline', path: '/releases', icon: CalendarDays, show: true },
      { label: 'Timesheets', path: '/timesheets', icon: Clock, show: true },
      { label: 'Work handoffs', path: '/handoffs', icon: ArrowRightLeft, show: true },
      { label: 'Components', path: '/components', icon: Cpu, show: true },
      { label: 'Knowledge & ADRs', path: '/knowledge', icon: BookOpen, show: true },
      { label: 'Templates & Recurrence', path: '/templates', icon: Copy, show: true },
      { label: 'Drafting & Review', path: '/drafting', icon: Sparkles, show: true },
      { label: 'What Changed?', path: '/what-changed', icon: History, show: true },
      { label: 'Data Exchange', path: '/data-exchange', icon: FileSpreadsheet, show: true },
      { label: 'Webhooks & Events', path: '/webhooks', icon: Webhook, show: true },
      { label: 'Clients', path: '/clients', icon: Building2, show: true },
    ]},
    { title: 'Client Delivery', items: [
      { label: 'Intake & Triage', path: '/client-intake', icon: LifeBuoy, show: true },
      { label: 'Requirements & Traceability', path: '/requirements', icon: FileCheck, show: true },
      { label: 'Quality Assurance & Gates', path: '/qa', icon: ShieldCheck, show: true },
      { label: 'Change Requests & Scope', path: '/change-requests', icon: DollarSign, show: true },
      { label: 'Retainer & AMC (COMM-001)', path: '/commercial', icon: Briefcase, show: true },
      { label: 'SLA & Risk Alerts', path: '/sla', icon: ShieldAlert, show: true },
      { label: 'Flow & Bottlenecks', path: '/flow-analytics', icon: Activity, show: true },
      { label: 'Capacity & Workload', path: '/capacity-insights', icon: Percent, show: true },
      { label: 'Project Financials', path: '/financial-analytics', icon: TrendingUp, show: true },
      { label: 'Critical Path & Scenarios', path: '/advanced-scheduling', icon: GitBranch, show: true },
      { label: 'UAT & Milestones', path: '/uat-packages', icon: ClipboardCheck, show: true },
      { label: 'Progress Reports', path: '/client-reports', icon: FileText, show: true },
      { label: 'RAID & Decisions', path: '/raid', icon: AlertOctagon, show: true },
      { label: 'Discovery & Roadmaps', path: '/product-roadmap', icon: Compass, show: true },
      { label: 'Goals & Outcomes', path: '/product-goals', icon: Target, show: true },
      { label: 'Client contacts', path: '/client-contacts', icon: UserCheck, show: true },
      { label: 'Customer portal', path: '/customer-portal', icon: ExternalLink, show: true },
    ]},
    { title: 'Organization', items: [
      { label: 'Setup & Config (ADMIN-001)', path: '/config-toolkit', icon: Sliders, show: canViewMasters },
      { label: 'Delivery teams', path: '/teams', icon: Users, show: true },
      { label: 'Workflow schemes', path: '/workflow-schemes', icon: GitMerge, show: true },
      ...adminScreens.map(screen => ({ label: screen.title, path: screen.path, icon: screen.icon || Settings, show: canViewMasters })),
      { label: 'Audit trail', path: '/audit', icon: ShieldCheck, show: isSuperAdmin || hasPermission('AUDIT_LOGS:VIEW') },
    ]},
    { title: 'Personal', items: [
      { label: 'Notifications', path: '/notifications', icon: Bell, show: true },
      { label: 'My profile', path: '/profile', icon: UserCircle, show: true },
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
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onToggleCollapse}
            onMouseEnter={(e) => {
              if (!collapsed) return;
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredItem({ label: "Expand sidebar", top: rect.top + rect.height / 2 });
            }}
            onMouseLeave={() => {
              if (collapsed) setHoveredItem(null);
            }}
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
        <nav
          aria-label="Main navigation"
          onScroll={() => setHoveredItem(null)}
          className="flex-1 space-y-6 overflow-y-auto px-3 py-6"
        >
          {groups.map(group => group.items.some(item => item.show) && (
            <div key={group.title}>
              <p className={`page-eyebrow mb-2 px-3 ${collapsed ? 'lg:hidden' : ''}`}>{group.title}</p>
              <div className="space-y-1">
                {group.items.filter(item => item.show).map(item => {
                  const Icon = item.icon;
                  return <NavLink key={item.path} to={item.path} onClick={onCloseMobile}
                    title={item.label}
                    onMouseEnter={(e) => {
                      if (!collapsed) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredItem({ label: item.label, top: rect.top + rect.height / 2 });
                    }}
                    onMouseLeave={() => {
                      if (collapsed) setHoveredItem(null);
                    }}
                    className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${isActive ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}`}>
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
                  </NavLink>;
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Floating Tooltip when collapsed */}
        {collapsed && hoveredItem && (
          <div
            style={{ top: hoveredItem.top }}
            className="fixed left-22 z-50 -translate-y-1/2 pointer-events-none hidden lg:flex items-center"
          >
            <div className="relative rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl dark:bg-slate-800 dark:text-slate-100 dark:border dark:border-slate-700 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
              <div className="absolute right-full top-1/2 -mt-1 -mr-0.5 border-4 border-transparent border-r-slate-900 dark:border-r-slate-800" />
              {hoveredItem.label}
            </div>
          </div>
        )}

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
