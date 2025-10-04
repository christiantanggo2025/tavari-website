// utils/hrErrorHandling.js
import { supabase } from '../supabaseClient';

export const HR_ERROR_TYPES = {
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION', 
  BUSINESS_ACCESS: 'BUSINESS_ACCESS',
  DATA_ACCESS: 'DATA_ACCESS',
  VALIDATION: 'VALIDATION',
  NETWORK: 'NETWORK',
  DATABASE: 'DATABASE',
  PERMISSION: 'PERMISSION'
};

export const HR_ERROR_CODES = {
  USER_NOT_AUTHENTICATED: 'USER_NOT_AUTHENTICATED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ROLE_NOT_AUTHORIZED: 'ROLE_NOT_AUTHORIZED',
  MODULE_ACCESS_DENIED: 'MODULE_ACCESS_DENIED',
  NO_BUSINESS_ASSOCIATION: 'NO_BUSINESS_ASSOCIATION',
  BUSINESS_NOT_FOUND: 'BUSINESS_NOT_FOUND',
  CROSS_BUSINESS_ACCESS: 'CROSS_BUSINESS_ACCESS',
  BUSINESS_INACTIVE: 'BUSINESS_INACTIVE',
  EMPLOYEE_NOT_FOUND: 'EMPLOYEE_NOT_FOUND',
  CONTRACT_ACCESS_DENIED: 'CONTRACT_ACCESS_DENIED',
  WAGE_DATA_RESTRICTED: 'WAGE_DATA_RESTRICTED',
  DOCUMENT_ACCESS_DENIED: 'DOCUMENT_ACCESS_DENIED',
  CANNOT_EDIT_OWN_ROLE: 'CANNOT_EDIT_OWN_ROLE',
  CANNOT_TERMINATE_SELF: 'CANNOT_TERMINATE_SELF',
  MANAGER_REQUIRED: 'MANAGER_REQUIRED',
  OWNER_REQUIRED: 'OWNER_REQUIRED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

export class HRError extends Error {
  constructor(message, type, code, details = {}) {
    super(message);
    this.name = 'HRError';
    this.type = type;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.userFriendly = true;
  }
}

export const handleHRError = (error, context = {}) => {
  console.error('HR Error:', error);
  
  if (error instanceof HRError) {
    return error;
  }
  
  return new HRError(
    error.message || 'An unexpected error occurred',
    HR_ERROR_TYPES.UNKNOWN_ERROR,
    HR_ERROR_CODES.UNKNOWN_ERROR,
    { originalError: error.message, stack: error.stack }
  );
};

export default {
  HR_ERROR_TYPES,
  HR_ERROR_CODES,
  HRError,
  handleHRError
};