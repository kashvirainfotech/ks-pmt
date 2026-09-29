import React, { useState } from 'react';
import { useTimer } from '../../context/TimerContext';
import { Clock, Check, X, AlertCircle } from 'lucide-react';

export const StopTimerModal: React.FC = () => {
  const { timer, elapsedSeconds, formattedTime, stopTimer, isStopModalOpen, setIsStopModalOpen, isLoading } = useTimer();
  const [description, setDescription] = useState('');
  const [isBillable, setIsBillable] = useState(timer?.is_billable ?? true);
  const [error, setError] = useState('');

  if (!isStopModalOpen || !timer) return null;

  const hoursDecimal = +(elapsedSeconds / 3600).toFixed(2);
  const hoursDisplay = Math.floor(elapsedSeconds / 3600);
  const minutesDisplay = Math.floor((elapsedSeconds % 3600) / 60);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a brief description of the work accomplished.');
      return;
    }
    setError('');
    try {
      await stopTimer(description.trim(), isBillable);
      setDescription('');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to stop and log timer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Log Time from Timer
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Finalize and record effort into timesheet
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsStopModalOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Task
              </span>
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                {timer.task_code}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-800 line-clamp-1 dark:text-slate-200">
              {timer.task_title}
            </p>
            {timer.project_name && (
              <p className="mt-0.5 text-[11px] text-slate-500">
                Project: {timer.project_name}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Elapsed Time:
              </span>
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                {formattedTime} ({hoursDisplay}h {minutesDisplay}m / {hoursDecimal} hrs)
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Work Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What tasks or milestones did you accomplish during this session?"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="modal-billable"
              checked={isBillable}
              onChange={(e) => setIsBillable(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
            />
            <label htmlFor="modal-billable" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Mark this worklog as billable to client/project
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsStopModalOpen(false)}
              disabled={isLoading}
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              {isLoading ? 'Recording...' : 'Log Time to Timesheet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
