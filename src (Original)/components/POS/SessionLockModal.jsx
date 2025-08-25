// components/POS/SessionLockModal.jsx
// Steps 28, 31-33, 41-43: PIN entry, keypad, lockout timer, pre-lock countdown, manager override
import React, { useMemo, useState } from 'react';

const btn = {
  width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: '1px solid #ccc', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', userSelect: 'none'
};

/**
 * Props expected (wire from useSessionLock and your screen):
 * - visible: boolean
 * - onSubmitPin: (pin: string) => Promise<{ok:boolean, reason?:'bad_pin'|'locked_out', msRemaining?:number}>
 * - onManagerOverride: (pin: string, reason: string) => Promise<boolean>
 * - pinAttempts: number (0-3)
 * - lockedUntil: number | null (timestamp ms)
 * - warningSeconds?: number | null (pre-lock countdown, e.g., 60..1)
 * - overrideActive?: boolean (true while 30s manager override window is active)
 */
export default function SessionLockModal({
  visible,
  onSubmitPin,
  onManagerOverride,
  pinAttempts,
  lockedUntil,
  warningSeconds = null,
  overrideActive = false,
}) {
  const [pin, setPin] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [reason, setReason] = useState('');

  const isLockedOut = useMemo(() => {
    return !!(lockedUntil && Date.now() < lockedUntil);
  }, [lockedUntil]);

  if (!visible) return null;

  const addDigit = (d) => setPin((p) => (p + d).slice(0, 6));
  const backspace = () => setPin((p) => p.slice(0, -1));

  const submit = async () => {
    if (!pin || isLockedOut) return;
    const res = await onSubmitPin(pin);
    if (!res?.ok) {
      // Clear on failure (incl. bad pin or transition into lockout)
      setPin('');
    }
  };

  const tryOverride = async () => {
    if (!managerPin || !reason) return;
    const ok = await onManagerOverride(managerPin, reason);
    if (ok) {
      setManagerPin('');
      setReason('');
    }
  };

  const msRemaining = isLockedOut ? (lockedUntil - Date.now()) : 0;
  const lockoutSeconds = Math.max(0, Math.ceil(msRemaining / 1000));

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal} role="dialog" aria-modal="true" aria-label="Session Locked">
        <h2 style={{ marginTop: 0 }}>Session Locked</h2>

        {/* Pre-lock visual warning (Step 32) */}
        {warningSeconds !== null && !isLockedOut && (
          <div style={styles.warning}>
            Auto-lock in <b>{warningSeconds}s</b> due to inactivity.
          </div>
        )}

        {/* Active manager override window indicator (Step 43) */}
        {overrideActive && (
          <div style={styles.overrideActive}>
            Manager override active — PIN entry allowed for 30s.
          </div>
        )}

        {/* Lockout banner (Step 42) */}
        {isLockedOut ? (
          <div style={styles.lockout}>
            Too many attempts. Try again in {lockoutSeconds}s.
          </div>
        ) : (
          <>
            <p style={{ margin: '8px 0', color: '#555' }}>Enter your PIN to continue.</p>
            <div style={styles.pinRow} aria-label="PIN dots">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ ...styles.pinDot, backgroundColor: i < pin.length ? '#333' : '#eee' }} />
              ))}
            </div>
          </>
        )}

        {/* Keypad */}
        <div style={styles.keypad} aria-label="Numeric keypad">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <div
              key={n}
              style={{ ...btn, opacity: isLockedOut ? 0.4 : 1, pointerEvents: isLockedOut ? 'none' : 'auto' }}
              onClick={() => !isLockedOut && addDigit(String(n))}
            >
              {n}
            </div>
          ))}
          <div
            style={{ ...btn, opacity: isLockedOut ? 0.4 : 1, pointerEvents: isLockedOut ? 'none' : 'auto' }}
            onClick={() => !isLockedOut && addDigit('0')}
          >
            0
          </div>
          <div
            style={{ ...btn, opacity: isLockedOut ? 0.4 : 1, pointerEvents: isLockedOut ? 'none' : 'auto' }}
            onClick={() => !isLockedOut && backspace()}
          >
            ←
          </div>
          <div
            style={{ ...btn, background:'#008080', color:'#fff', opacity: isLockedOut ? 0.4 : 1, pointerEvents: isLockedOut ? 'none' : 'auto' }}
            onClick={() => !isLockedOut && submit()}
          >
            OK
          </div>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>Attempts: {pinAttempts}/3</div>

        {/* Manager override (Step 43) */}
        <div style={{ marginTop: 20, borderTop: '1px solid #eee', paddingTop: 12 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Manager Override (30s window)</div>
          <input
            placeholder="Manager PIN"
            type="password"
            value={managerPin}
            onChange={(e) => setManagerPin(e.target.value)}
            style={styles.input}
          />
          <input
            placeholder="Reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={styles.input}
          />
          <button style={styles.overrideBtn} onClick={tryOverride}>Start Override</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
  },
  modal: {
    width: 360, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
  },
  warning: {
    background: '#fff8e1', border: '1px solid #ffe0a1', color: '#8a6d3b',
    padding: '8px 10px', borderRadius: 8, marginBottom: 10, fontSize: 13
  },
  overrideActive: {
    background: '#e7f6f6', border: '1px solid #b9e1e1', color: '#006d6d',
    padding: '8px 10px', borderRadius: 8, marginBottom: 10, fontSize: 13
  },
  lockout: {
    color: '#b00020', fontWeight: 'bold', marginBottom: 12
  },
  pinRow: { display: 'flex', gap: 8, margin: '12px 0' },
  pinDot: { width: 14, height: 14, borderRadius: 8, background: '#eee' },
  keypad: { display: 'grid', gridTemplateColumns: 'repeat(3, 60px)', gap: 10, justifyContent: 'center', marginTop: 12 },
  input: { width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 8, marginBottom: 8 },
  overrideBtn: { padding: '8px 12px', fontWeight: 'bold', border: 'none', background: '#008080', color: '#fff', borderRadius: 8, cursor: 'pointer' }
};
