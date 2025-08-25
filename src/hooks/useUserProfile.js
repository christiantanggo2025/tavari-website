import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export function useUserProfile() {
  const [profile, setProfile] = useState(null);
  const [roleInfo, setRoleInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user }, error: sessionError } = await supabase.auth.getUser();

      if (sessionError || !user) {
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .single();

      setProfile(profileData || null);
      setRoleInfo(roleData || null);
      setLoading(false);
    };

    fetchProfile();
  }, []);

  return { profile, roleInfo, loading };
}
