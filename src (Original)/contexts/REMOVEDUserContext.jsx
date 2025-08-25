import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      console.log('📡 Checking session...');
      const { data, error } = await supabase.auth.getSession();
      const session = data?.session;

      console.log('📡 Session result:', session);

      setSession(session || null);

      if (session?.user?.id) {
        console.log('📡 Fetching user profile for ID:', session.user.id);
        const { data: profile } = await supabase
          .from('users')
          .select('id, email, roles, full_name')
          .eq('id', session.user.id)
          .maybeSingle();

        setUserProfile(profile);
      }

      setLoading(false);
    };

    init();
  }, []);

  return (
    <UserContext.Provider value={{ session, userProfile, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
