import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const SessionManager = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkExpiration = () => {
      const expiresAt = localStorage.getItem('expiresAt');
      if (!expiresAt) return;

      const now = new Date();
      const expireTime = new Date(expiresAt);

      if (now > expireTime) {
        console.log('⏰ Session expired — logging out');
        supabase.auth.signOut().then(() => {
          localStorage.removeItem('expiresAt');
          localStorage.removeItem('stayLoggedIn');
          navigate('/login');
        });
      }
    };

    const refreshToken = async () => {
      const stayLoggedIn = localStorage.getItem('stayLoggedIn');
      if (!stayLoggedIn) return;

      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data?.session?.expires_at) {
        console.warn('🔄 Token refresh failed:', error?.message || 'unknown error');
        await supabase.auth.signOut();
        localStorage.removeItem('expiresAt');
        localStorage.removeItem('stayLoggedIn');
        navigate('/login');
        return;
      }

      const newExpiresAt = new Date(data.session.expires_at * 1000);
      localStorage.setItem('expiresAt', newExpiresAt.toISOString());
      console.log('🔁 Token refreshed. New expiresAt:', newExpiresAt.toISOString());
    };

    const expirationInterval = setInterval(checkExpiration, 60000); // check every 60 sec
    const refreshInterval = setInterval(refreshToken, 600000); // refresh every 10 min

    return () => {
      clearInterval(expirationInterval);
      clearInterval(refreshInterval);
    };
  }, [navigate]);

  return children;
};

export default SessionManager;
