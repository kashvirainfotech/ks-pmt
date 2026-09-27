import React, { useEffect, useState } from 'react';
import axios from 'axios';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { RecordForm, Row, errorText } from './EntityManager';
import { f } from './config';
import { DataGrid, ActionButton } from '../common/DataGrid';
import { useListing } from '../../hooks/useListing';
import { CheckCheck, Eye, LogOut } from 'lucide-react';
const preferenceFields = [
  f('inApp', 'In-app alerts', { type: 'checkbox' }),
  f('email', 'Email alerts', { type: 'checkbox' }),
  f('push', 'Push alerts', { type: 'checkbox' }),
];
export function ProfilePage() {
  const { user, logout } = useAuth();
  const [preferences, setPreferences] = useState<Row | null>(null);
  const {
    rows: sessions,
    loading: sessionsLoading,
    error: sessionError,
    reload: loadSessions,
  } = useListing<Row>('/auth/sessions');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    api
      .get('/auth/preferences')
      .then((res: any) => setPreferences(res.data))
      .catch((e) => setError(errorText(e)));
  }, []);
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-bold">My profile and preferences</h1>
      <p>
        {user?.first_name} {user?.last_name} · {user?.email} · {user?.role_name}
      </p>
      {error && (
        <p role="alert" className="text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <label className="block">
        Profile photo
        <input
          aria-label="Profile photo"
          className="mt-2 block"
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || !user) return;
            setUploading(true);
            setError('');
            try {
              const res: any = await api.post(
                '/attachments/presigned-upload-url',
                {
                  entityType: 'USER_AVATAR',
                  entityId: user.id,
                  fileName: file.name,
                  mimeType: file.type,
                  fileSizeBytes: file.size,
                },
              );
              await axios.put(res.data.uploadUrl, file, {
                headers: { 'Content-Type': file.type },
              });
              await api.post('/attachments/confirm-upload', {
                attachmentId: res.data.attachmentId,
              });
              setMessage('Profile photo saved');
            } catch (err) {
              setError(errorText(err));
            } finally {
              setUploading(false);
            }
          }}
        />
      </label>
      <section className="entity-panel">
        <h2 className="mb-3 font-bold">Notification channels</h2>
        {preferences && (
          <RecordForm
            fields={preferenceFields}
            initial={preferences}
            onCancel={() => setMessage('')}
            onSave={async (values) => {
              await api.put('/auth/preferences', values);
              setMessage('Notification preferences saved');
            }}
          />
        )}
      </section>
      <DataGrid
        title="Device sessions"
        data={sessions}
        loading={sessionsLoading}
        error={sessionError}
        onRetry={loadSessions}
        columns={[
          { id: 'device_platform', label: 'Platform' },
          {
            id: 'created_at',
            label: 'Signed in',
            render: (s) => new Date(s.created_at).toLocaleString(),
          },
          { id: 'is_current', label: 'Current session' },
        ]}
        actions={[
          {
            label: 'Revoke',
            icon: LogOut,
            danger: true,
            onClick: async (s) => {
              if (!window.confirm('Revoke this device session?')) return;
              await api.delete(`/auth/sessions/${s.id}`);
              if (s.is_current) await logout();
              else await loadSessions();
            },
          },
        ]}
      />
      <section className="entity-panel">
        <h2 className="mb-3 font-bold">Change password</h2>
        <RecordForm
          fields={[
            f('currentPassword', 'Current password', {
              type: 'password',
              required: true,
            }),
            f('newPassword', 'New password', {
              type: 'password',
              required: true,
            }),
          ]}
          onCancel={() => setMessage('')}
          onSave={async (values) => {
            await api.put('/auth/password', values);
            await logout();
          }}
        />
      </section>
    </div>
  );
}
export function NotificationsPage() {
  const { rows, loading, error, reload } = useListing<Row>('/notifications');
  const [actionError, setActionError] = useState('');
  return (
    <div className="space-y-5">
      <div className="page-intro">
        <div>
          <p className="page-eyebrow mb-2">Personal</p>
          <h1>Notifications</h1>
          <p className="page-description">
            Task updates and team activity, in one place.
          </p>
        </div>
      </div>
      <DataGrid
        title="Notifications"
        data={rows}
        loading={loading}
        error={error || actionError}
        onRetry={() => {
          setActionError('');
          void reload();
        }}
        columns={[
          { id: 'title', label: 'Title' },
          { id: 'body', label: 'Message' },
          { id: 'notification_type', label: 'Type' },
          { id: 'is_read', label: 'Read' },
          {
            id: 'created_at',
            label: 'Received',
            render: (r) => new Date(r.created_at).toLocaleString(),
          },
        ]}
        toolbar={
          <ActionButton
            icon={CheckCheck}
            onClick={async () => {
              try {
                await api.patch('/notifications/read-all');
                await reload();
              } catch (e) {
                setActionError(errorText(e));
              }
            }}
          >
            Mark all as read
          </ActionButton>
        }
        actions={[
          {
            label: 'View task',
            icon: Eye,
            hidden: (r) => r.entity_type !== 'TASK',
            onClick: (r) => {
              window.location.href = `/tasks?taskId=${encodeURIComponent(r.entity_id)}`;
            },
          },
          {
            label: 'Mark read',
            icon: CheckCheck,
            hidden: (r) => r.is_read,
            onClick: async (r) => {
              await api.patch(`/notifications/${r.id}/read`);
              await reload();
            },
          },
        ]}
      />
    </div>
  );
}
