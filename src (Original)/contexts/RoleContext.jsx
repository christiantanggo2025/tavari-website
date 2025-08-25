import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useBusinessContext } from './BusinessContext';

const RoleContext = createContext();

export const RoleProvider = ({ children }) => {
  const [roleInfo, setRoleInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const { selectedBusinessId } = useBusinessContext();

  const fetchRole = async () => {
    // Debug line - remove after fixing
    console.log('🔍 RoleContext Debug - selectedBusinessId:', selectedBusinessId, 'type:', typeof selectedBusinessId);
    
    // Get current user directly from Supabase
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !selectedBusinessId) {
      console.log('🔍 RoleContext - Missing user or businessId:', { hasUser: !!user, selectedBusinessId });
      setRoleInfo(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('business_id', selectedBusinessId)
      .eq('active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching role info:', error);
      setRoleInfo(null);
    } else {
      setRoleInfo(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchRole();
  }, [selectedBusinessId]);

  return (
    <RoleContext.Provider value={{ roleInfo, loading }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);