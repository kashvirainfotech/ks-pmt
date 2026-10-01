import React, { useState, useEffect } from 'react';
import {
  Bell,
  Sliders,
  Eye,
  Clock,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Mail,
  Smartphone,
  ShieldCheck,
  CheckCheck,
  Trash2,
  Plus,
  Calendar,
  Layers,
  FileText,
  Lightbulb,
  FileCheck,
} from 'lucide-react';
import { notificationsApi } from '../../api/endpoints';
import {
  NotificationItem,
  UserNotificationSettings,
  WorkItemWatcher,
  NotificationQueueItem,
  DigestPreviewResponse,
} from '../../types';

export const NotificationsWorkspaceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'preferences' | 'watchers' | 'queue'>('inbox');
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab 1: Inbox Data
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Tab 2: Preferences Data
  const [settings, setSettings] = useState<UserNotificationSettings>({
    email_notifications_enabled: true,
    in_app_notifications_enabled: true,
    push_notifications_enabled: true,
    digest_mode: 'INSTANT',
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    timezone: 'Asia/Kolkata',
    allow_urgent_during_quiet_hours: true,
    event_preferences: {
      TASK_ASSIGNMENT: true,
      STATUS_CHANGE: true,
      COMMENT_AND_MENTION: true,
      BLOCKER_AND_DEPENDENCY: true,
      DOCUMENT_REVISION: true,
      APPROVAL_AND_SIGNOFF: true,
      DEADLINE_AND_SLA: true,
      RECURRING_WORK_RUN: true,
    },
  });

  // Tab 3: Watchers Data
  const [watchedItems, setWatchedItems] = useState<WorkItemWatcher[]>([]);
  const [showWatchModal, setShowWatchModal] = useState(false);
  const [watchForm, setWatchForm] = useState({
    entityType: 'TASK',
    entityId: '',
    notifyOnStatusChange: true,
    notifyOnComments: true,
    notifyOnAttachments: true,
    notifyOnApprovals: true,
  });

  // Tab 4: Queue & Digest Data
  const [queueItems, setQueueItems] = useState<NotificationQueueItem[]>([]);
  const [digestPreview, setDigestPreview] = useState<DigestPreviewResponse | null>(null);

  // Load initial data
  const loadInbox = async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.getNotifications();
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (e: any) {
      console.error('Failed to load notifications', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.getSettings();
      if (res.data) {
        setSettings({
          ...res.data,
          event_preferences: res.data.event_preferences || {
            TASK_ASSIGNMENT: true,
            STATUS_CHANGE: true,
            COMMENT_AND_MENTION: true,
            BLOCKER_AND_DEPENDENCY: true,
            DOCUMENT_REVISION: true,
            APPROVAL_AND_SIGNOFF: true,
            DEADLINE_AND_SLA: true,
            RECURRING_WORK_RUN: true,
          },
        });
      }
    } catch (e: any) {
      console.error('Failed to load settings', e);
    } finally {
      setLoading(false);
    }
  };

  const loadWatchers = async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.getMyWatchedItems();
      setWatchedItems(res.data || []);
    } catch (e: any) {
      console.error('Failed to load watchers', e);
    } finally {
      setLoading(false);
    }
  };

  const loadQueueAndDigest = async () => {
    try {
      setLoading(true);
      const [queueRes, digestRes] = await Promise.all([
        notificationsApi.getQueue({ limit: 50 }).catch(() => ({ data: { items: [] } })),
        notificationsApi.previewDigest().catch(() => ({ data: null })),
      ]);
      setQueueItems(queueRes.data?.items || []);
      setDigestPreview(digestRes.data || null);
    } catch (e: any) {
      console.error('Failed to load queue/digest', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'inbox') loadInbox();
    else if (activeTab === 'preferences') loadSettings();
    else if (activeTab === 'watchers') loadWatchers();
    else if (activeTab === 'queue') loadQueueAndDigest();
  }, [activeTab]);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      showNotification('All notifications marked as read');
      loadInbox();
    } catch (e: any) {
      showNotification('Failed to mark all as read', 'error');
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      loadInbox();
    } catch (e: any) {
      showNotification('Failed to update notification', 'error');
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      await notificationsApi.updateSettings({
        emailNotificationsEnabled: settings.email_notifications_enabled,
        inAppNotificationsEnabled: settings.in_app_notifications_enabled,
        pushNotificationsEnabled: settings.push_notifications_enabled,
        digestMode: settings.digest_mode,
        quietHoursEnabled: settings.quiet_hours_enabled,
        quietHoursStart: settings.quiet_hours_start || '22:00',
        quietHoursEnd: settings.quiet_hours_end || '07:00',
        timezone: settings.timezone,
        allowUrgentDuringQuietHours: settings.allow_urgent_during_quiet_hours,
        eventPreferences: settings.event_preferences,
      });
      showNotification('Notification preferences & quiet hours updated successfully');
    } catch (e: any) {
      showNotification('Failed to save notification preferences', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnwatch = async (entityType: string, entityId: string) => {
    try {
      await notificationsApi.unwatch({ entityType, entityId });
      showNotification(`Unfollowed ${entityType.toLowerCase()}`);
      loadWatchers();
    } catch (e: any) {
      showNotification('Failed to unfollow item', 'error');
    }
  };

  const handleCreateWatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!watchForm.entityId.trim()) {
      showNotification('Please provide a valid entity UUID', 'error');
      return;
    }
    try {
      await notificationsApi.watch({
        entityType: watchForm.entityType,
        entityId: watchForm.entityId.trim(),
        notifyOnStatusChange: watchForm.notifyOnStatusChange,
        notifyOnComments: watchForm.notifyOnComments,
        notifyOnAttachments: watchForm.notifyOnAttachments,
        notifyOnApprovals: watchForm.notifyOnApprovals,
      });
      showNotification(`Now following ${watchForm.entityType.toLowerCase()}`);
      setShowWatchModal(false);
      setWatchForm({
        entityType: 'TASK',
        entityId: '',
        notifyOnStatusChange: true,
        notifyOnComments: true,
        notifyOnAttachments: true,
        notifyOnApprovals: true,
      });
      loadWatchers();
    } catch (e: any) {
      showNotification('Failed to follow item. Ensure entity ID is valid.', 'error');
    }
  };

  const handleTriggerDispatch = async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.dispatchQueue();
      const summary = res.data;
      showNotification(
        `Queue dispatched: ${summary.delivered} delivered, ${summary.suppressed} suppressed by quiet hours, ${summary.cancelledUnauthorized} cancelled due to revoked authorization.`
      );
      loadQueueAndDigest();
    } catch (e: any) {
      showNotification('Failed to dispatch queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'TASK':
        return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      case 'KNOWLEDGE_DOC':
        return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'PRODUCT_IDEA':
        return <Lightbulb className="w-4 h-4 text-amber-500" />;
      case 'CHANGE_REQUEST':
        return <Layers className="w-4 h-4 text-purple-500" />;
      case 'UAT_PACKAGE':
        return <FileCheck className="w-4 h-4 text-indigo-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              COLLAB-003
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Enterprise Notification Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Notifications & Subscriptions Workspace
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Granular channel preferences, quiet hours windowing, independent work item watchers, deduplicated delivery queue, and scheduled digest briefings.
          </p>
        </div>

        {/* Global Action / Refresh */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeTab === 'inbox') loadInbox();
              else if (activeTab === 'preferences') loadSettings();
              else if (activeTab === 'watchers') loadWatchers();
              else if (activeTab === 'queue') loadQueueAndDigest();
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700/80 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between text-sm ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs underline hover:no-underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'inbox'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          Inbox & Alerts
          {unreadCount > 0 && (
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-bold">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'preferences'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Preferences & Quiet Hours
        </button>

        <button
          onClick={() => setActiveTab('watchers')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'watchers'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Eye className="w-4 h-4" />
          Watched Work Items
          <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {watchedItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'queue'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Digest & Delivery Queue
        </button>
      </div>

      {/* Tab 1: Inbox & Alerts */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Recent Alerts ({notifications.length})
            </h2>
            {notifications.some((n) => !n.is_read) && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">All caught up!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                You have no pending unread notifications in your inbox.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                    n.is_read ? 'bg-transparent' : 'bg-blue-50/40 dark:bg-blue-950/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 mt-0.5">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                          {n.title}
                        </span>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                        )}
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {n.notification_type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        {n.body}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                        <span>{new Date(n.created_at).toLocaleString()}</span>
                        {n.sender_name && <span>• By {n.sender_name}</span>}
                        {n.entity_type && (
                          <span>
                            • Ref: {n.entity_type} {n.entity_id ? `(${n.entity_id.slice(0, 8)})` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      title="Mark as read"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Preferences & Quiet Hours */}
      {activeTab === 'preferences' && (
        <div className="space-y-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              Delivery Channels & Digest Cadence
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Select through which communication channels you wish to be notified and choose your digest frequency.
            </p>
          </div>

          {/* Delivery Channels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.in_app_notifications_enabled}
                onChange={(e) =>
                  setSettings({ ...settings, in_app_notifications_enabled: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-blue-500" />
                  In-App Notification Center
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time alerts in top navigation bell and workspace inbox.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.email_notifications_enabled}
                onChange={(e) =>
                  setSettings({ ...settings, email_notifications_enabled: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-emerald-500" />
                  Email Notifications
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Instant email alerts or consolidated digest reports.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.push_notifications_enabled}
                onChange={(e) =>
                  setSettings({ ...settings, push_notifications_enabled: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-purple-500" />
                  Mobile & Web Push
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Browser push notifications and mobile device push notifications.
                </p>
              </div>
            </label>
          </div>

          {/* Digest Mode Selection */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Digest Consolidation Mode
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  id: 'INSTANT',
                  label: 'Instant Delivery',
                  desc: 'Receive alerts immediately as work events occur.',
                },
                {
                  id: 'DAILY',
                  label: 'Daily Digest Briefing',
                  desc: 'Consolidate non-urgent items into one daily summary briefing.',
                },
                {
                  id: 'WEEKLY',
                  label: 'Weekly Executive Digest',
                  desc: 'Consolidate into an executive summary at the end of each week.',
                },
              ].map((mode) => (
                <div
                  key={mode.id}
                  onClick={() => setSettings({ ...settings, digest_mode: mode.id as any })}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    settings.digest_mode === mode.id
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-600'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">
                    {mode.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {mode.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quiet Hours Window */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Quiet Hours Window
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Suppress non-critical notifications during your focus time or off-duty hours.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.quiet_hours_enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, quiet_hours_enabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {settings.quiet_hours_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quiet Hours Start Time
                  </label>
                  <input
                    type="time"
                    value={settings.quiet_hours_start || '22:00'}
                    onChange={(e) =>
                      setSettings({ ...settings, quiet_hours_start: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quiet Hours End Time
                  </label>
                  <input
                    type="time"
                    value={settings.quiet_hours_end || '07:00'}
                    onChange={(e) =>
                      setSettings({ ...settings, quiet_hours_end: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Timezone
                  </label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
                    <option value="UTC">UTC (+00:00)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT +08:00)</option>
                  </select>
                </div>

                <div className="md:col-span-3 pt-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.allow_urgent_during_quiet_hours}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          allow_urgent_during_quiet_hours: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      <strong>Urgent Bypass:</strong> Deliver P1 blockers, critical production defects, and urgent approvals immediately even during quiet hours.
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Granular Event Category Preferences */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Granular Event Category Preferences
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize which types of events trigger notification dispatches for your profile.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  key: 'TASK_ASSIGNMENT',
                  label: 'Task Assignments & Reassignments',
                  desc: 'When you are assigned as primary or collaborator on any work item.',
                },
                {
                  key: 'STATUS_CHANGE',
                  label: 'Workflow Phase Transitions',
                  desc: 'Stage gate and lifecycle status updates on items you follow.',
                },
                {
                  key: 'COMMENT_AND_MENTION',
                  label: 'Comments & Direct @Mentions',
                  desc: 'Team discussions and direct mentions on your watched threads.',
                },
                {
                  key: 'BLOCKER_AND_DEPENDENCY',
                  label: 'Blockers & Dependency Impediments',
                  desc: 'When an item becomes blocked, escalated, or unblocked.',
                },
                {
                  key: 'DOCUMENT_REVISION',
                  label: 'Knowledge Document Revisions',
                  desc: 'New architecture ADR drafts, runbooks, or published revisions.',
                },
                {
                  key: 'APPROVAL_AND_SIGNOFF',
                  label: 'Approvals & Client Signoffs',
                  desc: 'Formal client signoff requests, UAT acceptances, and release gates.',
                },
                {
                  key: 'DEADLINE_AND_SLA',
                  label: 'Deadlines & SLA Thresholds',
                  desc: 'Approaching milestone dates and critical SLA warning triggers.',
                },
                {
                  key: 'RECURRING_WORK_RUN',
                  label: 'Recurring Work Engine Runs',
                  desc: 'Automated recurring task generation logs and compliance schedules.',
                },
              ].map((cat) => (
                <label
                  key={cat.key}
                  className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={settings.event_preferences?.[cat.key] !== false}
                    onChange={(e) => {
                      const updated = { ...(settings.event_preferences || {}), [cat.key]: e.target.checked };
                      setSettings({ ...settings, event_preferences: updated });
                    }}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white">
                      {cat.label}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {cat.desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleSaveSettings}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              Save Notification Preferences
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Watched Work Items */}
      {activeTab === 'watchers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                Work Items You Are Following ({watchedItems.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Watchers receive instant notifications on status transitions, discussions, attachments, and approvals regardless of assignee role.
              </p>
            </div>
            <button
              onClick={() => setShowWatchModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Follow New Work Item
            </button>
          </div>

          {watchedItems.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
              <Eye className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Not following any work items
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                You can follow tasks, knowledge documents, product ideas, change requests, and UAT packages to stay updated automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {watchedItems.map((item) => (
                <div
                  key={item.id || `${item.entity_type}_${item.entity_id}`}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {getEntityIcon(item.entity_type)}
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {item.entity_type}
                        </span>
                        {item.item_code && (
                          <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                            {item.item_code}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleUnwatch(item.entity_type, item.entity_id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="Unfollow work item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                      {item.item_title || 'Work Item'}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-400 mt-1">
                      ID: {item.entity_id}
                    </p>

                    <div className="grid grid-cols-2 gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.notify_on_status_change ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        Status transitions
                      </span>
                      <span className="flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.notify_on_comments ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        Comments & replies
                      </span>
                      <span className="flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.notify_on_attachments ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        Files & attachments
                      </span>
                      <span className="flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.notify_on_approvals ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        Approvals & signoffs
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span>Followed on: {new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Follow Modal */}
          {showWatchModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-600" />
                    Follow Work Item
                  </h3>
                  <button
                    onClick={() => setShowWatchModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateWatch} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Entity Type
                    </label>
                    <select
                      value={watchForm.entityType}
                      onChange={(e) => setWatchForm({ ...watchForm, entityType: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="TASK">Task / Bug / Epic</option>
                      <option value="KNOWLEDGE_DOC">Knowledge Document / ADR</option>
                      <option value="PRODUCT_IDEA">Product Roadmap Idea</option>
                      <option value="CHANGE_REQUEST">Change Request (CR)</option>
                      <option value="UAT_PACKAGE">Client UAT Package</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Entity UUID
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 20000000-0000-0000-0000-0000000003e9"
                      value={watchForm.entityId}
                      onChange={(e) => setWatchForm({ ...watchForm, entityId: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Notification Triggers
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={watchForm.notifyOnStatusChange}
                        onChange={(e) =>
                          setWatchForm({ ...watchForm, notifyOnStatusChange: e.target.checked })
                        }
                        className="rounded text-blue-600"
                      />
                      Status transitions
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={watchForm.notifyOnComments}
                        onChange={(e) =>
                          setWatchForm({ ...watchForm, notifyOnComments: e.target.checked })
                        }
                        className="rounded text-blue-600"
                      />
                      Comments & discussion
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={watchForm.notifyOnAttachments}
                        onChange={(e) =>
                          setWatchForm({ ...watchForm, notifyOnAttachments: e.target.checked })
                        }
                        className="rounded text-blue-600"
                      />
                      New attachments uploaded
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={watchForm.notifyOnApprovals}
                        onChange={(e) =>
                          setWatchForm({ ...watchForm, notifyOnApprovals: e.target.checked })
                        }
                        className="rounded text-blue-600"
                      />
                      Approvals & signoffs
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowWatchModal(false)}
                      className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                    >
                      Follow Item
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Digest & Delivery Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {/* Digest Briefing Preview */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  Consolidated Digest Briefing Preview
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Live preview of pending work notifications scheduled to be bundled into your next Daily/Weekly Digest email.
                </p>
              </div>
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                {digestPreview ? `${digestPreview.totalPendingItems} Pending Items` : '0 Pending'}
              </span>
            </div>

            {digestPreview && digestPreview.totalPendingItems > 0 ? (
              <div className="space-y-4 pt-2">
                {Object.entries(digestPreview.categories).map(([category, items]) => (
                  <div
                    key={category}
                    className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800"
                  >
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      {category} ({items.length})
                    </h4>
                    <div className="space-y-2">
                      {items.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-start justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800 last:border-0"
                        >
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {it.event_title}
                            </span>
                            {it.event_summary && (
                              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                                {it.event_summary}
                              </p>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">
                            {it.entity_code || it.entity_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">
                No items are currently pending digest bundling for your account.
              </p>
            )}
          </div>

          {/* Delivery Queue & Authorization Re-check Engine Monitor */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-600" />
                  Reliable Deduplicated Delivery Queue
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Monitors deduplication keys, quiet hours suppression, and runs authorization re-checks before dispatching alerts.
                </p>
              </div>

              <button
                onClick={handleTriggerDispatch}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                Dispatch Due Queue Items & Re-check Auth
              </button>
            </div>

            {queueItems.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">
                Delivery queue is currently empty.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-y border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Dedup Key</th>
                      <th className="py-2.5 px-3">Recipient</th>
                      <th className="py-2.5 px-3">Channel</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Event Title</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Scheduled / Delivered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {queueItems.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {q.deduplication_key}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                          {q.recipient_name || q.recipient_email || 'System'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {q.delivery_channel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          {q.event_category}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white max-w-xs truncate">
                          {q.event_title}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              q.delivery_status === 'SENT'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : q.delivery_status === 'QUEUED'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                : q.delivery_status === 'DIGEST_PENDING'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
                                : q.delivery_status === 'SUPPRESSED_QUIET_HOURS'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                            }`}
                          >
                            {q.delivery_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400">
                          {q.delivered_at
                            ? `Delivered: ${new Date(q.delivered_at).toLocaleTimeString()}`
                            : `Due: ${new Date(q.scheduled_for).toLocaleTimeString()}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
