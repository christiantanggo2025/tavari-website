// components/POS/POSModifierPopup.jsx
// Step 38: placeholder modal for modifiers
import React from 'react';

export default function POSModifierPopup({ visible, onClose, product, onApply }) {
  if (!visible) return null;

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Customize: {product?.name || 'Item'}</h3>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ marginTop: 12, color: '#666' }}>
          Placeholder for modifier groups/options. Hook up to pos_modifier_groups later.
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <button style={styles.btn} onClick={onClose}>Cancel</button>
          <button style={{ ...styles.btn, background:'#008080', color:'#fff' }} onClick={() => onApply && onApply([])}>Apply</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1500 },
  modal: { width: 520, background:'#fff', padding:20, borderRadius:12, boxShadow:'0 10px 30px rgba(0,0,0,0.2)' },
  closeBtn: { border:'none', background:'#eee', borderRadius:8, padding:'6px 10px', cursor:'pointer' },
  btn: { border:'none', background:'#eee', borderRadius:8, padding:'8px 12px', cursor:'pointer', fontWeight:'bold' },
};
