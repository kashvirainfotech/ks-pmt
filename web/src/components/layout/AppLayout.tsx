import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Search, X, CheckSquare, Folder, Users } from 'lucide-react';
import { tasksApi, projectsApi } from '../../api/endpoints';

export const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    tasks: any[];
    projects: any[];
  }>({ tasks: [], projects: [] });

  const navigate = useNavigate();

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  // Live search debounced
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ tasks: [], projects: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const [taskRes, projRes]: any = await Promise.allSettled([
          tasksApi.getTasks({ search: searchQuery, limit: 5 }),
          projectsApi.getProjects({ search: searchQuery }),
        ]);

        const tasks =
          taskRes.status === 'fulfilled'
            ? taskRes.value?.data?.tasks || taskRes.value?.tasks || []
            : [];
        const projects =
          projRes.status === 'fulfilled'
            ? projRes.value?.data || projRes.value || []
            : [];

        setSearchResults({
          tasks: Array.isArray(tasks) ? tasks.slice(0, 5) : [],
          projects: Array.isArray(projects) ? projects.slice(0, 5) : [],
        });
      } catch (err) {
        // ignore
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onToggleSidebar={() => setMobileOpen(!mobileOpen)}
          onOpenSearch={() => setSearchOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Global Quick Search Modal (Ctrl+K) */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/50 backdrop-blur-xs px-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks by title, code, projects..."
                className="flex-1 bg-transparent text-sm outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search Results */}
            <div className="mt-3 max-h-80 overflow-y-auto space-y-3">
              {searchResults.tasks.length > 0 && (
                <div>
                  <p className="px-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Tasks
                  </p>
                  <div className="mt-1 space-y-1">
                    {searchResults.tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => {
                          setSearchOpen(false);
                          navigate(`/tasks?taskId=${task.id}`);
                        }}
                        className="flex items-center justify-between gap-2 rounded-xl p-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <CheckSquare className="h-4 w-4 text-blue-500 shrink-0" />
                          <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                            {task.task_code}
                          </span>
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {task.title}
                          </span>
                        </div>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {task.status_name || 'Active'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.projects.length > 0 && (
                <div>
                  <p className="px-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Projects
                  </p>
                  <div className="mt-1 space-y-1">
                    {searchResults.projects.map((proj) => (
                      <div
                        key={proj.id}
                        onClick={() => {
                          setSearchOpen(false);
                          navigate(`/projects`);
                        }}
                        className="flex items-center justify-between gap-2 rounded-xl p-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Folder className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {proj.project_name}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {proj.client_name || 'Internal'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchQuery &&
                searchResults.tasks.length === 0 &&
                searchResults.projects.length === 0 && (
                  <p className="py-6 text-center text-xs text-slate-400">
                    No results found for "{searchQuery}"
                  </p>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
