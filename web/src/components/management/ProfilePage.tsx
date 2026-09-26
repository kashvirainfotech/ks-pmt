import React, { useEffect, useState } from 'react';
import axios from 'axios';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { RecordForm, Row, errorText } from './EntityManager';
import { f } from './config';
const preferenceFields = [
  f('inApp', 'In-app alerts', { type: 'checkbox' }),
  f('email', 'Email alerts', { type: 'checkbox' }),
  f('push', 'Push alerts', { type: 'checkbox' }),
];
export function ProfilePage() {
  const { user, logout } = useAuth();
  const [preferences, setPreferences] = useState<Row | null>(null);
  const [sessions, setSessions] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const loadSessions = async () => {
    try {
      const res: any = await api.get('/auth/sessions');
      setSessions(res.data);
      setSessionError('');
    } catch (e) {
      setSessionError(errorText(e));
    }
  };
  useEffect(() => {
    api
      .get('/auth/preferences')
      .then((res: any) => setPreferences(res.data))
      .catch((e) => setError(errorText(e)));
    loadSessions();
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
      <section className="entity-panel">
        <h2 className="mb-3 font-bold">Device sessions</h2>
        {sessionError && <p role="status">{sessionError}</p>}
        {sessions.map((s) => (
          <div className="flex justify-between gap-4 border-b py-3" key={s.id}>
            <span>
              {s.device_platform} · {new Date(s.created_at).toLocaleString()}
              {s.is_current && ' · Current session'}
            </span>
            <button
              onClick={async () => {
                try {
                  await api.delete(`/auth/sessions/${s.id}`);
                  if (s.is_current) await logout();
                  else await loadSessions();
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            >
              Revoke
            </button>
          </div>
        ))}
      </section>
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
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const load = async () => {
    try {
      const res: any = await api.get('/notifications', {
        params: { page, limit: 20 },
      });
      setRows(res.data.notifications);
      setPages(res.data.totalPages);
    } catch (e) {
      setError(errorText(e));
    }
  };
  useEffect(() => {
    load();
  }, [page]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Notifications</h1>
      {error && <p role="alert">{error}</p>}
      <button
        onClick={async () => {
          try {
            await api.patch('/notifications/read-all');
            await load();
          } catch (e) {
            setError(errorText(e));
          }
        }}
      >
        Mark all as read
      </button>
      {rows.map((r) => (
        <article
          key={r.id}
          className={`entity-panel ${r.is_read ? '' : 'border-blue-500'}`}
        >
          <h2 className="font-bold">{r.title}</h2>
          <p>{r.body}</p>
          {r.entity_type === 'TASK' && (
            <a className="text-blue-600 dark:text-blue-400" href={`/tasks?taskId=${r.entity_id}`}>
              Open task
            </a>
          )}
          {!r.is_read && (
            <button
              className="ml-4"
              onClick={async () => {
                try {
                  await api.patch(`/notifications/${r.id}/read`);
                  await load();
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            >
              Mark read
            </button>
          )}
        </article>
      ))}
      {!rows.length && <div className="entity-panel py-12 text-center"><h2 className="font-semibold">You are all caught up</h2><p className="page-description">Task updates and team activity will appear here.</p></div>}
      <div className="flex gap-4">
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {pages || 1}
        </span>
        <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
