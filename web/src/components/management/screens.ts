import {
  Briefcase,
  Package,
  GitBranch,
  Zap,
  Flag,
  Radar,
  MapPin,
  Network,
  Award,
  UserCheck,
  ListTodo,
  SlidersHorizontal,
  Shield,
  Shuffle,
  Route,
  KeyRound,
  CalendarClock,
  Palmtree,
  type LucideIcon,
} from 'lucide-react';

export interface ScreenDef {
  path: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

// Shared by the router and sidebar so every master has a direct menu link.
export const portfolioScreens: readonly ScreenDef[] = [
  { path: '/projects', title: 'Projects', description: 'Plan delivery and manage project teams.', icon: Briefcase },
  { path: '/products', title: 'Products', description: 'Manage software products and client licenses.', icon: Package },
  { path: '/versions', title: 'Versions', description: 'Plan versions and track release dates.', icon: GitBranch },
  { path: '/sprints', title: 'Sprints', description: 'Plan agile iterations, commitment baselines, capacity and rollovers.', icon: Zap },
  { path: '/milestones', title: 'Milestones', description: 'Track major project and product delivery milestones.', icon: Flag },
  { path: '/blockers', title: 'Blocker radar', description: 'Monitor active blockers, aging breaches, and resolution episodes.', icon: Radar },
] as const;

export const adminScreens: readonly ScreenDef[] = [
  { path: '/admin/branches', title: 'Branches', description: 'Manage company locations and branches.', icon: MapPin },
  { path: '/admin/departments', title: 'Departments', description: 'Manage departments and department heads.', icon: Network },
  { path: '/admin/designations', title: 'Designations', description: 'Manage employee designations and hierarchy.', icon: Award },
  { path: '/admin/employees', title: 'Employees', description: 'Manage employee accounts and branch assignments.', icon: UserCheck },
  { path: '/admin/task-types', title: 'Task types', description: 'Configure task types and their defaults.', icon: ListTodo },
  { path: '/admin/statuses', title: 'Statuses', description: 'Configure task workflow statuses.', icon: SlidersHorizontal },
  { path: '/admin/roles', title: 'Roles', description: 'Manage roles for company access control.', icon: Shield },
  { path: '/admin/assignment-rules', title: 'Assignment rules', description: 'Configure automatic task assignment.', icon: Shuffle },
  { path: '/admin/transitions', title: 'Transitions', description: 'Configure allowed task status transitions.', icon: Route },
  { path: '/admin/permissions', title: 'Permissions', description: 'Manage role permissions and branch or employee overrides.', icon: KeyRound },
  { path: '/admin/calendars', title: 'Working calendars', description: 'Configure company working days, hours, shifts and public holidays.', icon: CalendarClock },
  { path: '/admin/leaves', title: 'Employee leaves', description: 'Manage and review employee leaves and time-off requests.', icon: Palmtree },
] as const;

export type PortfolioScreen = typeof portfolioScreens[number];
export type AdminScreen = typeof adminScreens[number];
