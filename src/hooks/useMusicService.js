// src/hooks/useMusicService.js - NON-INITIALIZING HOOK
import { useEffect } from 'react';
import { globalMusicService } from '../services/GlobalMusicService';

export const useMusicService = () => {
  // If you want to attach global window listeners or analytics later, do it here.
  // IMPORTANT: Do NOT initialize here. App.jsx owns initialization.

  useEffect(() => {
    // no-op on mount
    return () => {
      // no-op on unmount
    };
  }, []);

  return globalMusicService;
};
