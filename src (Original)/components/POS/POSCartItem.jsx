// components/POS/POSCartItem.jsx
// Step 49: basic cart item w/ modifiers stack, discount, overrides
import React from 'react';

export default function POSCartItem({ name, qty, price, discount = 0, priceOverride = null, modifiers = [] }) {
  const unit = priceOverride ?? price ?? 0;
  const line = unit * (qty || 1);
  const afterDiscount = Math.max(0, line - (discount || 0));

  return (
    <div style={styles.item}>
      <div style={styles.row}>
        <div style={{ fontWeight: 'bold' }}>{qty}× {name}</div>
        <div>${afterDiscount.toFixed(2)}</div>
      </div>
      {priceOverride !== null && (
        <div style={styles.meta}>Override: ${Number(priceOverride).toFixed(2)} (orig ${Number(price||0).toFixed(2)})</div>
      )}
      {discount ? <div style={styles.meta}>Discount: -${Number(discount).toFixed(2)}</div> : null}
      {modifiers?.length ? (
        <div style={styles.mods}>
          {modifiers.map((m, i) => (
            <div key={i} style={styles.mod}>• {m.name}{m.price ? ` (+$${Number(m.price).toFixed(2)})` : ''}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  item: { borderBottom: '1px solid #eee', padding: '8px 0' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  meta: { fontSize: 12, color: '#666' },
  mods: { marginTop: 6, paddingLeft: 10, fontSize: 13, color: '#444', display: 'flex', flexDirection: 'column', gap: 4 },
  mod: {}
};
