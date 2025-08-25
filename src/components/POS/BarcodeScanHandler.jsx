// components/POS/BarcodeScanHandler.jsx
// Step 40: barcode listener with buffered keystrokes and simple detection
import { useEffect, useRef } from 'react';
import { logAction } from '../../helpers/posAudit';

/**
 * Props:
 *  onScan: (code: string) => void
 */
export default function BarcodeScanHandler({ onScan }) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    const onKeyDown = (e) => {
      const now = Date.now();
      const delta = now - (lastKeyTimeRef.current || 0);
      // Reset buffer if too slow (>100ms between keys) — adjust to your scanner
      if (delta > 100) bufferRef.current = '';
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const code = bufferRef.current;
        bufferRef.current = '';
        if (code) {
          console.log('[BarcodeScanHandler] scanned:', code);
          logAction({ action: 'barcode_scanned', context: 'BarcodeScanHandler', metadata: { code } });
          onScan && onScan(code);
        }
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onScan]);

  return null;
}
