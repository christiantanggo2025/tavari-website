// src/hooks/useMusicService.js
import { useEffect } from 'react';
import { globalMusicService } from '../services/GlobalMusicService';
import { useBusiness } from '../contexts/BusinessContext';

export const useMusicService = () => {
  const { business } = useBusiness();

  useEffect(() => {
    if (business?.id) {
      console.log('🎵 Initializing music service for business:', business.id);
      
      // Initialize the global music service
      globalMusicService.initialize(business.id);
      
      // Start schedule monitoring
      globalMusicService.startScheduleMonitoring();
      
      return () => {
        // Don't destroy on unmount - let it keep playing
        console.log('🎵 Music service continues running in background');
      };
    }
  }, [business?.id]);

  return globalMusicService;
};