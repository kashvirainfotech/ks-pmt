import React, { useState } from 'react';
import { useTimer } from '../../context/TimerContext';
import { StopTimerModal } from './StopTimerModal';
import { Play, Pause, Square, Trash2, Clock, CheckCircle2 } from 'lucide-react';

export const GlobalTimerWidget: React.FC = () => {
  const {
    timer,
    isRunning,
    isPaused,
    formattedTime,
    pauseTimer,
    resumeTimer,
    discardTimer,
    setIsStopModalOpen,
    isLoading,
  } = useTimer();

  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const handleDiscard = async () => {
    if (!confirmDiscard) {
      setConfirmDiscard(true);
      setTimeout(() => setConfirmDiscard(false), 4000);
      return;
    }
    await discardTimer();
    setConfirmDiscard(false);
  };

  if (!timer) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-2.5 py-1 text-xs shadow-xs backdrop-blur-xs transition dark:border-slate-700 dark:bg-slate-800/80">
        {/* Status Indicator */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            {isRunning && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                isRunning ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
          </span>
          <span
            className="hidden sm:inline-block font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400 max-w-[90px] truncate"
            title={`${timer.task_code}: ${timer.task_title}`}
          >
            {timer.task_code}
          </span>
        </div>

        {/* Live Clock Display */}
        <div className="flex items-center gap-1 font-mono font-bold tracking-wider text-slate-800 dark:text-slate-100">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>{formattedTime}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5 dark:border-slate-700">
          {isRunning ? (
            <button
              onClick={pauseTimer}
              disabled={isLoading}
              title="Pause Timer"
              className="rounded-md p-1 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={resumeTimer}
              disabled={isLoading}
              title="Resume Timer"
              className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsStopModalOpen(true)}
            disabled={isLoading}
            title="Stop & Log Time"
            className="rounded-md p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
          >
            <Square className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleDiscard}
            disabled={isLoading}
            title={confirmDiscard ? 'Click again to confirm discard' : 'Discard timer'}
            className={`rounded-md p-1 transition ${
              confirmDiscard
                ? 'bg-rose-600 text-white animate-pulse'
                : 'text-slate-400 hover:bg-slate-200 hover:text-rose-500 dark:hover:bg-slate-700'
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <StopTimerModal />
    </>
  );
};
