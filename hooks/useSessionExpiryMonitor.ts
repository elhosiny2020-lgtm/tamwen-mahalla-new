'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { UserRole } from '@/types';

export interface SessionExpiryState {
  /** Remaining seconds before the session token expires (null when unknown/unauthenticated) */
  remainingSeconds: number | null;
  /** True when the session token is within the warning threshold (default: <= 5 minutes) */
  isNearExpiration: boolean;
  /** True when the session has expired */
  isExpired: boolean;
  /** Role from verified server session payload */
  sessionRole: UserRole | null;
  /** Dismiss the warning banner temporarily */
  dismissWarning: () => void;
  /** Extend/refresh the session check manually */
  refreshSessionStatus: () => Promise<void>;
}

export interface UseSessionExpiryMonitorOptions {
  /** Whether a user is currently logged in on the client */
  enabled: boolean;
  /** Seconds before expiration to trigger the non-intrusive warning (default: 300 seconds = 5 minutes) */
  warningThresholdSeconds?: number;
  /** Polling interval in milliseconds to sync with server session (default: 30000ms) */
  pollIntervalMs?: number;
  /** Callback fired when session expires to automatically redirect user to the login screen */
  onExpire: () => void;
}

const CLIENT_SESSION_EXP_KEY = 'gharbia_supply_session_exp_v1';
const DEFAULT_CLIENT_TTL_SECONDS = 8 * 60 * 60;

export function setClientSessionExpiryTimestamp(expSeconds?: number) {
  if (typeof window === 'undefined') return;
  const targetExp = expSeconds ?? Math.floor(Date.now() / 1000) + DEFAULT_CLIENT_TTL_SECONDS;
  try {
    sessionStorage.setItem(CLIENT_SESSION_EXP_KEY, String(targetExp));
  } catch {
    // Ignore storage errors
  }
}

export function clearClientSessionExpiryTimestamp() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CLIENT_SESSION_EXP_KEY);
  } catch {
    // Ignore storage errors
  }
}

function getStoredClientExpiryTimestamp(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CLIENT_SESSION_EXP_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Client-side hook that detects when the session token is near expiration,
 * exposes state for a gentle non-intrusive warning banner, and automatically
 * redirects the user to the login screen upon expiration.
 */
export function useSessionExpiryMonitor({
  enabled,
  warningThresholdSeconds = 300,
  pollIntervalMs = 30_000,
  onExpire,
}: UseSessionExpiryMonitorOptions): SessionExpiryState {
  const [expTimestampSec, setExpTimestampSec] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [sessionRole, setSessionRole] = useState<UserRole | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const refreshSessionStatus = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch('/api/auth/session', {
        method: 'GET',
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.authenticated && data?.session?.exp) {
        const serverExp = Number(data.session.exp);
        setExpTimestampSec(serverExp);
        setClientSessionExpiryTimestamp(serverExp);
        if (data.session.role) {
          setSessionRole(data.session.role as UserRole);
        }
      } else {
        // Fallback to client session expiry timestamp if cookie session wasn't found
        let fallbackExp = getStoredClientExpiryTimestamp();
        if (!fallbackExp) {
          fallbackExp = Math.floor(Date.now() / 1000) + DEFAULT_CLIENT_TTL_SECONDS;
          setClientSessionExpiryTimestamp(fallbackExp);
        }
        setExpTimestampSec(fallbackExp);
      }
    } catch {
      let fallbackExp = getStoredClientExpiryTimestamp();
      if (!fallbackExp) {
        fallbackExp = Math.floor(Date.now() / 1000) + DEFAULT_CLIENT_TTL_SECONDS;
        setClientSessionExpiryTimestamp(fallbackExp);
      }
      setExpTimestampSec(fallbackExp);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const initialTimer = setTimeout(() => {
      void refreshSessionStatus();
    }, 0);
    const pollTimer = setInterval(() => {
      void refreshSessionStatus();
    }, pollIntervalMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(pollTimer);
    };
  }, [enabled, pollIntervalMs, refreshSessionStatus]);

  useEffect(() => {
    if (!enabled || !expTimestampSec) return;

    const tick = () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const diff = expTimestampSec - nowSec;
      if (diff <= 0) {
        setRemainingSeconds(0);
        clearClientSessionExpiryTimestamp();
        onExpireRef.current();
      } else {
        setRemainingSeconds(diff);
      }
    };

    const initialTick = setTimeout(tick, 0);
    const countdownTimer = setInterval(tick, 1000);
    return () => {
      clearTimeout(initialTick);
      clearInterval(countdownTimer);
    };
  }, [enabled, expTimestampSec]);

  const activeRemainingSeconds = enabled ? remainingSeconds : null;
  const isExpired = enabled && activeRemainingSeconds !== null && activeRemainingSeconds <= 0;
  const isNearExpiration =
    enabled &&
    !dismissed &&
    activeRemainingSeconds !== null &&
    activeRemainingSeconds > 0 &&
    activeRemainingSeconds <= warningThresholdSeconds;

  const dismissWarning = useCallback(() => {
    setDismissed(true);
  }, []);

  return {
    remainingSeconds: activeRemainingSeconds,
    isNearExpiration,
    isExpired,
    sessionRole: enabled ? sessionRole : null,
    dismissWarning,
    refreshSessionStatus,
  };
}
