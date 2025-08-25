import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const useAccessProtection = (profile, redirectTo = '/locked') => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile) return;

    const now = new Date();
    const startDate = profile.start_date ? new Date(profile.start_date) : null;
    const endDate = profile.end_date ? new Date(profile.end_date) : null;

    const isInactive = profile.status !== 'active';
    const isBeforeStart = startDate && now < startDate;
    const isAfterEnd = endDate && now > endDate;

    if (isInactive || isBeforeStart || isAfterEnd) {
      console.warn('Access denied for user:', {
        status: profile.status,
        startDate,
        endDate,
        now,
      });

      navigate(redirectTo);
    }
  }, [profile]);
};

export default useAccessProtection;
