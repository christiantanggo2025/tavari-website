// src/components/Ads/AdPlayer.jsx
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';

const AdPlayer = ({ 
  ad, 
  onAdCompleted, 
  onAdError, 
  volume = 0.8,
  autoPlay = true,
  showControls = false,
  businessId = null
}) => {
  const { business } = useBusiness();
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [adPlayId, setAdPlayId] = useState(null);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  
  const progressInterval = useRef(null);
  const playStartTime = useRef(null);
  const audioRef = useRef(null);

  const currentBusinessId = businessId || business?.id;

  useEffect(() => {
    if (ad && ad.audioUrl) {
      loadAndPlayAd();
    }

    return () => {
      cleanup();
    };
  }, [ad]);

  useEffect(() => {
    // Apply volume adjustment if specified in ad
    if (audioRef.current && ad?.volumeAdjustment) {
      audioRef.current.volume = volume * ad.volumeAdjustment;
    } else if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, ad?.volumeAdjustment]);

  const loadAndPlayAd = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setNeedsUserInteraction(false);
      
      console.log('🎵 Loading ad audio:', ad.audioUrl);

      // Create HTML5 audio element
      const audio = new Audio();
      audioRef.current = audio;
      
      // Set up event listeners
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration * 1000); // Convert to milliseconds for consistency
        console.log('🎵 Ad metadata loaded, duration:', audio.duration);
      });

      audio.addEventListener('timeupdate', () => {
        setPosition(audio.currentTime * 1000); // Convert to milliseconds
        if (audio.duration > 0) {
          setProgress(audio.currentTime / audio.duration);
        }
      });

      audio.addEventListener('ended', () => {
        handleAdCompleted();
      });

      audio.addEventListener('error', (e) => {
        console.error('🎵 Audio error:', e);
        setError('Failed to load audio file');
        setIsLoading(false);
        if (onAdError) {
          onAdError(new Error('Failed to load audio file'));
        }
      });

      audio.addEventListener('canplaythrough', () => {
        setIsLoading(false);
        console.log('🎵 Ad can play through');
        
        if (autoPlay) {
          playAd();
        }
      });

      // Set audio properties
      audio.volume = volume * (ad.volumeAdjustment || 1.0);
      audio.preload = 'auto';
      
      // Start loading
      audio.src = ad.audioUrl;
      audio.load();

    } catch (error) {
      console.error('🎵 Error loading ad:', error);
      setError(error.message);
      setIsLoading(false);
      
      if (onAdError) {
        onAdError(error);
      }
    }
  };

  const playAd = async () => {
    if (!audioRef.current) return;

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      setNeedsUserInteraction(false);
      playStartTime.current = Date.now();
      startProgressTracking();
      
      // Log ad play start
      await logAdPlayStart();
      
    } catch (error) {
      console.error('🎵 Error playing ad:', error);
      
      // Check if this is a user interaction error
      if (error.name === 'NotAllowedError') {
        console.log('🎵 User interaction required to play audio');
        setNeedsUserInteraction(true);
        setIsLoading(false);
        setError(null); // Clear error since this is expected behavior
      } else {
        setError('Failed to play audio');
        if (onAdError) {
          onAdError(error);
        }
      }
    }
  };

  const handleUserPlay = async () => {
    if (!audioRef.current) return;
    
    try {
      await audioRef.current.play();
      setIsPlaying(true);
      setNeedsUserInteraction(false);
      playStartTime.current = Date.now();
      startProgressTracking();
      
      // Log ad play start
      await logAdPlayStart();
      
    } catch (error) {
      console.error('🎵 Error playing ad after user interaction:', error);
      setError('Failed to play audio');
      if (onAdError) {
        onAdError(error);
      }
    }
  };

  const handleAdCompleted = async () => {
    console.log('🎵 Ad playback completed');
    
    setIsPlaying(false);
    stopProgressTracking();
    
    const actualDuration = playStartTime.current 
      ? Date.now() - playStartTime.current 
      : duration;

    // Log ad completion
    await logAdPlayCompleted(actualDuration);
    
    // Notify parent component
    if (onAdCompleted) {
      onAdCompleted({
        adId: ad.id,
        adPlayId: adPlayId,
        actualDuration: actualDuration,
        completionRate: 1.0
      });
    }

    // Clean up
    cleanup();
  };

  const startProgressTracking = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    progressInterval.current = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused) {
        setPosition(audioRef.current.currentTime * 1000);
        if (audioRef.current.duration > 0) {
          setProgress(audioRef.current.currentTime / audioRef.current.duration);
        }
      }
    }, 100);
  };

  const stopProgressTracking = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  const playPauseAd = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        stopProgressTracking();
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
        startProgressTracking();
        
        if (!playStartTime.current) {
          playStartTime.current = Date.now();
          await logAdPlayStart();
        }
      }
    } catch (error) {
      console.error('🎵 Error toggling playback:', error);
      
      // Check if this is a user interaction error
      if (error.name === 'NotAllowedError') {
        setNeedsUserInteraction(true);
      } else {
        setError(error.message);
      }
    }
  };

  const skipAd = async () => {
    if (!audioRef.current) return;

    try {
      const currentPosition = position;
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      console.log('🎵 Ad skipped by user');
      
      // Log partial completion
      const partialDuration = playStartTime.current 
        ? Date.now() - playStartTime.current 
        : currentPosition;
      
      const completionRate = duration > 0 ? currentPosition / duration : 0;
      
      await logAdPlayCompleted(partialDuration, completionRate, true);
      
      if (onAdCompleted) {
        onAdCompleted({
          adId: ad.id,
          adPlayId: adPlayId,
          actualDuration: partialDuration,
          completionRate: completionRate,
          skipped: true
        });
      }

      cleanup();
      
    } catch (error) {
      console.error('🎵 Error skipping ad:', error);
    }
  };

  const logAdPlayStart = async () => {
    if (!currentBusinessId || !ad) return;

    console.log('🔍 Debug - About to log ad play:', {
      currentBusinessId,
      adId: ad.id,
      adIdType: typeof ad.id,
      businessIdType: typeof currentBusinessId
    });

    try {
      // Insert ad play record
      const { data, error } = await supabase
        .from('music_ad_plays')
        .insert({
          business_id: currentBusinessId,
          ad_id: ad.id,
          played_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('🚨 Supabase error details:', error);
        throw error;
      }

      setAdPlayId(data.id);

      console.log('🎵 Ad play logged successfully:', data);

      // TODO: Add music_ad_revenue_detailed table logging when ready
      if (ad.cpm && ad.cpm > 0) {
        const grossRevenue = (ad.cpm / 1000); // CPM to actual revenue
        const tavariFee = grossRevenue * 0.40; // 40% to Tavari
        const businessPayout = grossRevenue * 0.60; // 60% to business

        console.log('🎵 Revenue data (not yet stored):', {
          business_id: currentBusinessId,
          ad_play_id: data.id,
          api_provider: ad.metadata?.provider || 'unknown',
          revenue_type: 'cpm',
          gross_revenue: grossRevenue,
          api_commission: 0,
          tavari_commission: tavariFee,
          business_payout: businessPayout,
          currency: ad.currency || 'CAD',
          payment_status: 'pending'
        });
      }

    } catch (error) {
      console.error('🎵 Error logging ad play start:', error);
      // Generate a temporary ID for testing if database fails
      const tempId = 'temp_' + Date.now();
      setAdPlayId(tempId);
    }
  };

  const logAdPlayCompleted = async (actualDuration, completionRate = 1.0, skipped = false) => {
    if (!adPlayId) return;

    try {
      console.log('🎵 Ad completion data:', {
        adPlayId: adPlayId,
        actual_duration: Math.round(actualDuration / 1000),
        completion_rate: completionRate,
        skipped: skipped,
        completed_at: new Date().toISOString()
      });

      // Only try to update if we have a real database ID (not temp)
      if (adPlayId && !adPlayId.startsWith('temp_')) {
        // Check if your table has these columns - for now just log completion
        console.log('🎵 Ad completion logged successfully (completion tracking pending table schema update)');
        
        // TODO: Update this when you add completion tracking columns to music_ad_plays
        /*
        await supabase
          .from('music_ad_plays')
          .update({
            actual_duration: Math.round(actualDuration / 1000),
            completion_rate: completionRate,
            skipped: skipped,
            completed_at: new Date().toISOString()
          })
          .eq('id', adPlayId);
        */
      }

    } catch (error) {
      console.error('🎵 Error logging ad completion:', error);
    }
  };

  const cleanup = () => {
    stopProgressTracking();
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeEventListener('loadedmetadata', () => {});
      audioRef.current.removeEventListener('timeupdate', () => {});
      audioRef.current.removeEventListener('ended', () => {});
      audioRef.current.removeEventListener('error', () => {});
      audioRef.current.removeEventListener('canplaythrough', () => {});
      audioRef.current.src = '';
      audioRef.current = null;
    }
    
    setIsPlaying(false);
    setPosition(0);
    setProgress(0);
    playStartTime.current = null;
    setAdPlayId(null);
  };

  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getAdDisplayInfo = () => {
    if (!ad) return { title: 'No Ad', advertiser: 'Unknown' };
    
    return {
      title: ad.title || 'Audio Advertisement',
      advertiser: ad.advertiser || 'Advertiser',
      provider: ad.metadata?.provider || 'Unknown Provider'
    };
  };

  if (!ad) {
    return (
      <div style={styles.container}>
        <div style={styles.content}>
          <div style={styles.noAdText}>No ad to play</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{...styles.container, ...styles.errorContainer}}>
        <div style={styles.content}>
          <div style={styles.errorText}>Failed to load advertisement</div>
          <div style={styles.errorDetails}>{error}</div>
          <button 
            onClick={() => onAdError && onAdError(new Error(error))}
            style={styles.errorButton}
          >
            Skip Ad
          </button>
        </div>
      </div>
    );
  }

  const adInfo = getAdDisplayInfo();

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <div style={styles.adInfo}>
            <div style={styles.adLabel}>Advertisement</div>
            <div style={styles.adTitle}>{adInfo.title}</div>
            <div style={styles.advertiser}>by {adInfo.advertiser}</div>
            {adInfo.provider && (
              <div style={styles.provider}>via {adInfo.provider}</div>
            )}
            {ad.cpm && (
              <div style={styles.cpmInfo}>
                Revenue: {new Intl.NumberFormat('en-CA', {
                  style: 'currency',
                  currency: 'CAD',
                  minimumFractionDigits: 4
                }).format((ad.cpm / 1000) * 0.6)} {/* Show business share */}
              </div>
            )}
          </div>
          
          {isLoading && (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingSpinner}></div>
              <div style={styles.loadingText}>Loading...</div>
            </div>
          )}
        </div>

        {needsUserInteraction && (
          <div style={styles.userInteractionContainer}>
            <div style={styles.userInteractionText}>
              Click Play to start advertisement
            </div>
            <button
              onClick={handleUserPlay}
              style={styles.userInteractionButton}
            >
              ▶️ Play Ad
            </button>
          </div>
        )}

        {!isLoading && !needsUserInteraction && (
          <div style={styles.playbackContainer}>
            <div style={styles.progressBarContainer}>
              <div 
                style={{
                  ...styles.progressBar,
                  width: `${progress * 100}%`
                }}
              />
            </div>
            
            <div style={styles.timeContainer}>
              <div style={styles.timeText}>{formatTime(position)}</div>
              <div style={styles.timeText}>{formatTime(duration)}</div>
            </div>

            {showControls && (
              <div style={styles.controls}>
                <button
                  onClick={playPauseAd}
                  disabled={isLoading}
                  style={styles.controlButton}
                >
                  {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                </button>
                
                <button
                  onClick={skipAd}
                  disabled={isLoading}
                  style={styles.controlButton}
                >
                  ⭐️ Skip Ad
                </button>
              </div>
            )}
          </div>
        )}
        
        {!showControls && isPlaying && (
          <div style={styles.playingIndicator}>
            <div style={styles.playingSpinner}></div>
            <div style={styles.playingText}>Playing advertisement...</div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    margin: '10px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0'
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336'
  },
  content: {
    padding: '15px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  adInfo: {
    flex: 1
  },
  adLabel: {
    fontSize: '12px',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: '5px',
    fontWeight: 'bold'
  },
  adTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '5px'
  },
  advertiser: {
    fontSize: '14px',
    color: '#555',
    marginBottom: '3px'
  },
  provider: {
    fontSize: '12px',
    color: '#777',
    fontStyle: 'italic',
    marginBottom: '3px'
  },
  cpmInfo: {
    fontSize: '12px',
    color: '#009688',
    fontWeight: '500'
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center'
  },
  loadingSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #e0e0e0',
    borderTop: '2px solid #009688',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginLeft: '8px',
    fontSize: '12px',
    color: '#666'
  },
  userInteractionContainer: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#fff3e0',
    border: '1px solid #ffb74d',
    borderRadius: '8px',
    marginBottom: '15px'
  },
  userInteractionText: {
    fontSize: '14px',
    color: '#e65100',
    marginBottom: '15px',
    fontWeight: '500'
  },
  userInteractionButton: {
    padding: '12px 24px',
    backgroundColor: '#009688',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  playbackContainer: {
    marginTop: '10px'
  },
  progressBarContainer: {
    width: '100%',
    height: '4px',
    backgroundColor: '#e0e0e0',
    borderRadius: '2px',
    marginBottom: '10px',
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#009688',
    transition: 'width 0.1s ease'
  },
  timeContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '15px'
  },
  timeText: {
    fontSize: '12px',
    color: '#666'
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px'
  },
  controlButton: {
    minWidth: '80px',
    padding: '8px 16px',
    border: '1px solid #009688',
    borderRadius: '4px',
    backgroundColor: '#fff',
    color: '#009688',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  playingIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '10px'
  },
  playingSpinner: {
    width: '12px',
    height: '12px',
    border: '2px solid #e0e0e0',
    borderTop: '2px solid #009688',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  playingText: {
    marginLeft: '8px',
    fontSize: '12px',
    color: '#009688',
    fontStyle: 'italic'
  },
  noAdText: {
    textAlign: 'center',
    color: '#666',
    fontSize: '14px'
  },
  errorText: {
    color: '#d32f2f',
    fontSize: '14px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '5px'
  },
  errorDetails: {
    color: '#666',
    fontSize: '12px',
    textAlign: 'center',
    marginBottom: '15px'
  },
  errorButton: {
    display: 'block',
    margin: '0 auto',
    padding: '8px 16px',
    border: '1px solid #f44336',
    borderRadius: '4px',
    backgroundColor: '#fff',
    color: '#f44336',
    cursor: 'pointer',
    fontSize: '14px'
  }
};

// Add spinner animation and hover effects CSS
if (!document.querySelector('#ad-player-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'ad-player-styles';
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    button:hover {
      opacity: 0.8;
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .userInteractionButton:hover {
      background-color: #00796b !important;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default AdPlayer;