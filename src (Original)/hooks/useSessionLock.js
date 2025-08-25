// hooks/useSessionLock.js
// Steps 30-34, 41-43: Session lock context hook with inactivity timer, countdown, PIN + manager override
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { logAction } from '../helpers/posAudit';

const AUTO_LOCK_MS = (parseInt(localStorage.getItem('auto_lock_minutes') || '5', 10)) * 60 * 1000;
const WARNING_WINDOW_MS = 60 * 1000; // 60s visual warning

export function useSessionLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [warningSeconds, setWarningSeconds] = useState(null); // null or countdown int
  const [pinAttempts, setPinAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null); // timestamp during lockout after 3 failed attempts
  const [overrideActiveUntil, setOverrideActiveUntil] = useState(null); // manager override window (30s)

  const timerRef = useRef(null);
  const warningIntervalRef = useRef(null);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
    warningIntervalRef.current = null;
    timerRef.current = null;
    setWarningSeconds(null); // Clear the warning display
  };

  const startInactivityTimer = useCallback(() => {
    clearTimers();
    // schedule warning first
    timerRef.current = setTimeout(() => {
      let secondsLeft = Math.floor(WARNING_WINDOW_MS / 1000);
      setWarningSeconds(secondsLeft);
      warningIntervalRef.current = setInterval(() => {
        secondsLeft -= 1;
        setWarningSeconds(secondsLeft);
        if (secondsLeft <= 0) {
          clearInterval(warningIntervalRef.current);
          setWarningSeconds(null);
          setIsLocked(true);
          logAction({ action: 'auto_lock', context: 'useSessionLock', metadata: { reason: 'inactivity' } });
        }
      }, 1000);
    }, Math.max(AUTO_LOCK_MS - WARNING_WINDOW_MS, 0));
  }, []);

  const registerActivity = useCallback(() => {
    if (isLocked) return; // ignore when locked
    startInactivityTimer();
  }, [isLocked, startInactivityTimer]);

  // public API: call to lock immediately (e.g., manual)
  const lock = useCallback(async () => {
    setIsLocked(true);
    await logAction({ action: 'lock', context: 'useSessionLock' });
    clearTimers();
  }, []);

  // PIN check (basic demo — replace with your secure PIN logic)
  const validatePin = async (pin) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    // Fetch pin from your users table (keep it basic for now)
    const { data, error } = await supabase.from('users').select('pin').eq('id', user.id).single();
    if (error) return false;
    const stored = data?.pin?.toString() || '';
    return stored && stored === String(pin);
  };

  // manager override check (simple: any user with role 'manager' matching PIN)
  const validateManagerPin = async (pin) => {
    const bizId = localStorage.getItem('currentBusinessId');
    if (!bizId) return false;
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('business_id', bizId)
      .eq('role', 'manager');
    if (error || !data?.length) return false;

    const managerIds = data.map(r => r.user_id);
    const { data: managers } = await supabase.from('users').select('id, pin').in('id', managerIds);
    const match = (managers || []).some(m => String(m.pin || '') === String(pin));
    return !!match;
  };

  const unlockWithPin = useCallback(async (pin) => {
    // lockout window?
    if (lockedUntil && Date.now() < lockedUntil) {
      const ms = lockedUntil - Date.now();
      return { ok: false, reason: 'locked_out', msRemaining: ms };
    }

    const ok = await validatePin(pin);
    if (ok) {
      setIsLocked(false);
      setPinAttempts(0);
      setLockedUntil(null);
      setWarningSeconds(null);
      startInactivityTimer();
      await logAction({ action: 'unlock', context: 'useSessionLock' });
      return { ok: true };
    } else {
      const next = pinAttempts + 1;
      setPinAttempts(next);
      await logAction({ action: 'unlock_attempt_failed', context: 'useSessionLock', metadata: { attempts: next } });
      if (next >= 3) {
        const fiveMin = 5 * 60 * 1000;
        const until = Date.now() + fiveMin;
        setLockedUntil(until);
        await logAction({ action: 'pin_lockout', context: 'useSessionLock', metadata: { minutes: 5 } });
      }
      return { ok: false, reason: 'bad_pin' };
    }
  }, [pinAttempts, lockedUntil, startInactivityTimer]);

  const managerOverride = useCallback(async (pin, reason) => {
    const ok = await validateManagerPin(pin);
    if (ok) {
      setOverrideActiveUntil(Date.now() + 30_000); // 30s
      await logAction({ action: 'manager_override', context: 'useSessionLock', metadata: { reason, window_s: 30 } });
    }
    return ok;
  }, []);

  // Expose an isOverrideActive helper
  const isOverrideActive = () => !!(overrideActiveUntil && Date.now() < overrideActiveUntil);

  // Bind global listeners on POS screens only
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    const handler = () => registerActivity();
    events.forEach(e => window.addEventListener(e, handler));
    startInactivityTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      clearTimers();
    };
  }, [registerActivity, startInactivityTimer]);

  return {
    isLocked,
    warningSeconds,
    pinAttempts,
    lockedUntil,
    lock,
    unlockWithPin,
    managerOverride,
    isOverrideActive,
    registerActivity, // expose in case components want to ping
  };
}
