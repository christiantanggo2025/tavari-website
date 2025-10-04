// src/hooks/useHRAuth.js
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { canAccessHR, hasHRPermission } from '../helpers/hrPermissions';

export const useHRAuth = () => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    validateHRAccess();
  }, []);

  const validateHRAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      setUser(user);

      // Get business association and role
      const { data: businessUsers, error: businessError } = await supabase
        .from('business_users')
        .select(`
          business_id,
          role,
          businesses(id, name, created_at)
        `)
        .eq('user_id', user.id)
        .single();

      if (businessError || !businessUsers) {
        setError('No business association found');
        setLoading(false);
        return;
      }

      // Validate business exists and is active
      if (!businessUsers.businesses) {
        setError('Business not found or inactive');
        setLoading(false);
        return;
      }

      setBusiness(businessUsers.businesses);
      setUserRole(businessUsers.role);

      // Check HR access permissions
      const canAccess = canAccessHR(businessUsers.role);
      setHasAccess(canAccess);

      if (!canAccess) {
        setError('Insufficient permissions for HR module');
      }

    } catch (error) {
      console.error('Error validating HR access:', error);
      setError('Failed to validate access permissions');
    } finally {
      setLoading(false);
    }
  };

  const checkPermission = (permission) => {
    return hasHRPermission(userRole, permission);
  };

  const refreshAccess = () => {
    validateHRAccess();
  };

  return {
    user,
    business,
    userRole,
    loading,
    error,
    hasAccess,
    checkPermission,
    refreshAccess,
    canAccessHR: () => canAccessHR(userRole)
  };
};