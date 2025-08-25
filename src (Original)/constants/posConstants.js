// constants/posConstants.js
// Step 42: PIN attempt limits, timeouts, and other POS constants

export const PIN_CONSTANTS = {
  MAX_ATTEMPTS: 3,
  LOCKOUT_DURATION_MS: 5 * 60 * 1000, // 5 minutes
  MANAGER_OVERRIDE_WINDOW_MS: 30 * 1000, // 30 seconds
  PIN_MAX_LENGTH: 6,
};

export const SESSION_CONSTANTS = {
  AUTO_LOCK_MS: 5 * 60 * 1000, // 5 minutes default
  WARNING_WINDOW_MS: 60 * 1000, // 60 seconds warning
  ACTIVITY_EVENTS: ['mousemove', 'keydown', 'click', 'touchstart'],
};

export const BARCODE_CONSTANTS = {
  KEY_TIMEOUT_MS: 100, // Reset buffer if gap between keys > 100ms
  MIN_CODE_LENGTH: 3,
  MAX_CODE_LENGTH: 50,
};

export const CART_CONSTANTS = {
  MAX_QUANTITY_PER_ITEM: 99,
  MIN_QUANTITY_PER_ITEM: 1,
  MAX_CART_ITEMS: 100,
};

export const LOYALTY_CONSTANTS = {
  MIN_REDEMPTION_DEFAULT: 5.00,
  MANAGER_OVERRIDE_THRESHOLD_DEFAULT: 50.00,
  REDEMPTION_RATE_DEFAULT: 0.01, // $0.01 per point
  AUTO_REDEEM_DEFAULT: false,
};

export const AUDIT_ACTIONS = {
  // Session Management
  AUTO_LOCK: 'auto_lock',
  MANUAL_LOCK: 'manual_lock',
  UNLOCK_SUCCESS: 'unlock_success',
  UNLOCK_FAILED: 'unlock_failed',
  PIN_LOCKOUT: 'pin_lockout',
  MANAGER_OVERRIDE: 'manager_override',
  
  // Cart Operations
  ITEM_ADDED: 'item_added',
  ITEM_REMOVED: 'item_removed',
  QTY_UPDATED: 'qty_updated',
  CART_CLEARED: 'cart_cleared',
  
  // Loyalty
  LOYALTY_APPLIED: 'loyalty_applied',
  LOYALTY_REMOVED: 'loyalty_removed',
  
  // Barcode Scanning
  BARCODE_SCANNED: 'barcode_scanned',
  BARCODE_NOT_FOUND: 'barcode_not_found',
  
  // Checkout
  CHECKOUT_INITIATED: 'checkout_initiated',
  CHECKOUT_COMPLETED: 'checkout_completed',
  CHECKOUT_CANCELLED: 'checkout_cancelled',
};

export const UI_CONSTANTS = {
  EDGE_PADDING: 20,
  TEAL_COLOR: '#008080',
  BUTTON_BORDER_RADIUS: 6,
  MODAL_Z_INDEX: 2000,
  LOCK_OVERLAY_Z_INDEX: 1000,
};

export const PAYMENT_TYPES = {
  CASH: 'cash',
  CARD: 'card',
  LOYALTY: 'loyalty',
  CUSTOM: 'custom',
};

export const RECEIPT_TYPES = {
  STANDARD: 'standard',
  GIFT: 'gift',
  KITCHEN: 'kitchen',
  REFUND: 'refund',
  REPRINT: 'reprint',
};

// Validation helpers
export const validatePinLength = (pin) => {
  return pin && pin.length >= 3 && pin.length <= PIN_CONSTANTS.PIN_MAX_LENGTH;
};

export const validateQuantity = (qty) => {
  const num = Number(qty);
  return num >= CART_CONSTANTS.MIN_QUANTITY_PER_ITEM && 
         num <= CART_CONSTANTS.MAX_QUANTITY_PER_ITEM;
};

export const validateBarcodeLength = (code) => {
  return code && 
         code.length >= BARCODE_CONSTANTS.MIN_CODE_LENGTH && 
         code.length <= BARCODE_CONSTANTS.MAX_CODE_LENGTH;
};