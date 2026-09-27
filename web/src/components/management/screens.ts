// Shared by the router and sidebar so every master has a direct menu link.
export const portfolioScreens = [
  { path: '/projects', title: 'Projects', description: 'Plan delivery and manage project teams.' },
  { path: '/products', title: 'Products', description: 'Manage software products and client licenses.' },
  { path: '/versions', title: 'Versions', description: 'Plan versions and track release dates.' },
] as const;

export const adminScreens = [
  { path: '/admin/branches', title: 'Branches', description: 'Manage company locations and branches.' },
  { path: '/admin/departments', title: 'Departments', description: 'Manage departments and department heads.' },
  { path: '/admin/designations', title: 'Designations', description: 'Manage employee designations and hierarchy.' },
  { path: '/admin/employees', title: 'Employees', description: 'Manage employee accounts and branch assignments.' },
  { path: '/admin/task-types', title: 'Task types', description: 'Configure task types and their defaults.' },
  { path: '/admin/statuses', title: 'Statuses', description: 'Configure task workflow statuses.' },
  { path: '/admin/roles', title: 'Roles', description: 'Manage roles for company access control.' },
  { path: '/admin/assignment-rules', title: 'Assignment rules', description: 'Configure automatic task assignment.' },
  { path: '/admin/transitions', title: 'Transitions', description: 'Configure allowed task status transitions.' },
  { path: '/admin/permissions', title: 'Permissions', description: 'Manage role permissions and branch or employee overrides.' },
] as const;

export type PortfolioScreen = typeof portfolioScreens[number];
export type AdminScreen = typeof adminScreens[number];
