import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ActiveTimer } from '../types';
import { timesheetsApi } from '../api/endpoints';
import { useAuth } from './AuthContext';

interface TimerContextType {
  timer: ActiveTimer | null;
  isRunning: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  formattedTime: string;
  isLoading: boolean;
  startTimer: (taskId: string, isBillable?: boolean, notes?: string) => Promise<ActiveTimer>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  stopTimer: (description?: string, isBillable?: boolean) => Promise<{ message: string; log: any }>;
  discardTimer: () => Promise<void>;
  refreshTimer: () => Promise<void>;
  isStopModalOpen: boolean;
  setIsStopModalOpen: (open: boolean) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [timer, setTimer] = useState<ActiveTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStopModalOpen, setIsStopModalOpen] = useState<boolean>(false);
  const timerRef = useRef<ActiveTimer | null>(null);
  timerRef.current = timer;

  const calculateElapsed = useCallback((currentTimer: ActiveTimer | null): number => {
    if (!currentTimer) return 0;
    let seconds = Number(currentTimer.accumulated_seconds) || 0;
    if (!currentTimer.is_paused && currentTimer.started_at) {
      const now = Date.now();
      const started = new Date(currentTimer.started_at).getTime();
      const diff = Math.max(0, Math.floor((now - started) / 1000));
      seconds += diff;
    }
    return seconds;
  }, []);

  const formatSeconds = (totalSec: number): string => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const refreshTimer = useCallback(async () => {
    if (!isAuthenticated) {
      setTimer(null);
      setElapsedSeconds(0);
      return;
    }
    try {
      const res = await timesheetsApi.getActiveTimer();
      const data = (res as any)?.data?.timer || null;
      setTimer(data);
      setElapsedSeconds(calculateElapsed(data));
    } catch (e) {
      console.error('Failed to fetch active timer:', e);
    }
  }, [isAuthenticated, calculateElapsed]);

  // Load timer on auth
  useEffect(() => {
    if (isAuthenticated) {
      refreshTimer();
    } else {
      setTimer(null);
      setElapsedSeconds(0);
    }
  }, [isAuthenticated, refreshTimer]);

  // Wall-clock ticker that updates every second when timer is running
  useEffect(() => {
    if (!timer || timer.is_paused) return;

    // Update immediately
    setElapsedSeconds(calculateElapsed(timer));

    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsed(timerRef.current));
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, calculateElapsed]);

  // Periodic poll every 45s for cross-tab / cross-device synchronization
  useEffect(() => {
    if (!isAuthenticated) return;
    const poll = setInterval(() => {
      refreshTimer();
    }, 45000);
    return () => clearInterval(poll);
  }, [isAuthenticated, refreshTimer]);

  const startTimer = async (taskId: string, isBillable?: boolean, notes?: string): Promise<ActiveTimer> => {
    setIsLoading(true);
    try {
      const res = await timesheetsApi.startTimer({ taskId, isBillable, notes });
      const newTimer = (res as any)?.data || res;
      setTimer(newTimer);
      setElapsedSeconds(calculateElapsed(newTimer));
      return newTimer;
    } finally {
      setIsLoading(false);
    }
  };

  const pauseTimer = async () => {
    if (!timer) return;
    setIsLoading(true);
    try {
      const res = await timesheetsApi.pauseTimer();
      const updated = (res as any)?.data || res;
      setTimer(updated);
      setElapsedSeconds(Number(updated.accumulated_seconds) || 0);
    } finally {
      setIsLoading(false);
    }
  };

  const resumeTimer = async () => {
    if (!timer) return;
    setIsLoading(true);
    try {
      const res = await timesheetsApi.resumeTimer();
      const updated = (res as any)?.data || res;
      setTimer(updated);
      setElapsedSeconds(calculateElapsed(updated));
    } finally {
      setIsLoading(false);
    }
  };

  const stopTimer = async (description?: string, isBillable?: boolean) => {
    if (!timer) throw new Error('No active timer');
    setIsLoading(true);
    try {
      const res = await timesheetsApi.stopTimer({ description, isBillable });
      setTimer(null);
      setElapsedSeconds(0);
      setIsStopModalOpen(false);
      return (res as any)?.data || res;
    } finally {
      setIsLoading(false);
    }
  };

  const discardTimer = async () => {
    if (!timer) return;
    setIsLoading(true);
    try {
      await timesheetsApi.discardTimer();
      setTimer(null);
      setElapsedSeconds(0);
      setIsStopModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const isRunning = Boolean(timer && !timer.is_paused);
  const isPaused = Boolean(timer && timer.is_paused);
  const formattedTime = formatSeconds(elapsedSeconds);

  return (
    <TimerContext.Provider
      value={{
        timer,
        isRunning,
        isPaused,
        elapsedSeconds,
        formattedTime,
        isLoading,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        discardTimer,
        refreshTimer,
        isStopModalOpen,
        setIsStopModalOpen,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = (): TimerContextType => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};
