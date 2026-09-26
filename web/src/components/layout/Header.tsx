import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Bell,
  Sun,
  Moon,
  Building2,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Search,
  CheckCheck,
} from 'lucide-react';
import { notificationsApi } from '../../api/endpoints';
import { NotificationItem } from '../../types';

interface HeaderProps {
  onToggleSidebar?: () => void;
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onOpenSearch }) => {
  const { user, selectedBranchId, branches, setSelectedBranchId, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res: any = await notificationsApi.getNotifications({ limit: 8 });
      const data = res?.data || res;
      setNotifications(data?.notifications || []);
      setUnreadCount(data?.unreadCount || 0);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setShowNotifications(false); setShowProfileMenu(false); }
    };
    window.addEventListener('keydown', dismiss);
    return () => window.removeEventListener('keydown', dismiss);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      // ignore
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-20 shrink-0 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
      {/* Left: Mobile hamburger & Global Search bar */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2.5 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <button
          aria-label="Search tasks and projects"
          onClick={onOpenSearch}
          className="group flex h-9 w-9 shrink-0 md:w-56 xl:w-72 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 md:px-3 text-xs text-slate-500 hover:border-blue-400 hover:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:border-blue-500"
        >
          <Search className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
          <span className="hidden truncate md:block">Search workspace...</span>
          <kbd className="ml-auto hidden rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 lg:inline-block dark:border-slate-700 dark:bg-slate-900">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right Controls: Branch Switcher, Theme, Notifications, Profile */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        {/* Branch Switcher */}
        {branches && branches.length > 0 && (
          <div className="relative">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Building2 className="hidden sm:block h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <select
                value={selectedBranchId || ''}
                onChange={(e) => setSelectedBranchId(e.target.value || null)}
                aria-label="Active branch"
                className="max-w-14 sm:max-w-40 bg-transparent font-medium cursor-pointer pr-1"
              >
                <option value="" className="dark:bg-slate-900">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="dark:bg-slate-900">
                    {b.branch_name} {b.is_head_office ? '(HQ)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Theme Toggle */}
        <button
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          onClick={toggleTheme}
          className="rounded-lg p-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            aria-label="Notifications"
            aria-expanded={showNotifications}
            onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
            className="relative rounded-lg p-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="fixed left-3 right-3 top-20 sm:absolute sm:left-auto sm:top-auto sm:mt-2 sm:w-96 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                  Notifications ({unreadCount} new)
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                  </button>
                )}
              </div>
              <div className="mt-2 max-h-72 overflow-y-auto space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No notifications right now
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={(e) => !n.is_read && handleMarkAsRead(n.id, e)}
                      className={`pt-2 pb-1.5 px-2 rounded-lg cursor-pointer transition ${
                        n.is_read
                          ? 'opacity-70 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          : 'bg-blue-50/60 hover:bg-blue-50 dark:bg-blue-950/30 dark:hover:bg-blue-950/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="h-2 w-2 rounded-full bg-blue-600 mt-1 shrink-0" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
                        {n.body}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            aria-label="Account menu"
            aria-expanded={showProfileMenu}
            onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
            className="flex items-center gap-2 rounded-lg p-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 font-semibold text-xs text-white">
              {user?.first_name ? user.first_name[0] : 'U'}
            </div>
            <div className="hidden sm:block text-xs leading-tight">
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-[11px] text-slate-400">{user?.role_name}</p>
            </div>
            <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
              <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                <p className="font-medium text-xs text-slate-800 dark:text-slate-200">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
                <span className="mt-1 inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  {user?.role_name}
                </span>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { setShowProfileMenu(false); navigate('/profile'); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <UserIcon className="h-4 w-4" /> My Profile
                </button>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
