// src/services/Ads/ApiProviders/SpotifyAdAPI.js

class SpotifyAdAPI {
  constructor(apiConfig, businessConfig) {
    this.apiConfig = apiConfig;
    this.businessConfig = businessConfig;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.isInitialized = false;
    
    // Spotify-specific settings
    this.baseUrl = apiConfig.api_endpoint || 'https://ads.spotify.com/api/v1';
    this.clientId = apiConfig.credentials?.client_id;
    this.clientSecret = apiConfig.credentials?.client_secret;
    this.accountId = businessConfig.api_account_id;
    
    console.log('🎵 SpotifyAdAPI created');
  }

  async initialize() {
    try {
      // Get OAuth2 access token
      await this.refreshAccessToken();
      
      // Verify account access
      await this.verifyAccount();
      
      this.isInitialized = true;
      console.log('🎵 SpotifyAdAPI initialized successfully');
      
    } catch (error) {
      console.error('🎵 Error initializing SpotifyAdAPI:', error);
      throw error;
    }
  }

  async refreshAccessToken() {
    try {
      // In production, implement proper OAuth2 flow
      // For now, simulate token refresh
      
      if (!this.clientId || !this.clientSecret) {
        throw new Error('Missing Spotify credentials');
      }

      // Mock token for development
      this.accessToken = `spotify_mock_token_${Date.now()}`;
      this.tokenExpiry = Date.now() + 3600000; // 1 hour
      
      console.log('🎵 Spotify access token refreshed');
      
    } catch (error) {
      console.error('🎵 Error refreshing Spotify token:', error);
      throw error;
    }
  }

  async verifyAccount() {
    try {
      // Verify account access and get account details
      const accountData = await this.makeRequest('/accounts/' + this.accountId, 'GET');
      
      console.log('🎵 Spotify account verified:', accountData?.name || 'Unknown');
      return true;
      
    } catch (error) {
      console.error('🎵 Error verifying Spotify account:', error);
      return false;
    }
  }

  async requestAd(targetingParams = {}) {
    if (!this.isInitialized) {
      throw new Error('SpotifyAdAPI not initialized');
    }

    try {
      // Ensure token is valid
      await this.ensureValidToken();

      // Build ad request parameters
      const adRequest = this.buildAdRequest(targetingParams);
      
      // Request ad from Spotify
      const response = await this.makeRequest('/ad-requests', 'POST', adRequest);
      
      if (response && response.ad) {
        return this.formatAdResponse(response.ad);
      }
      
      console.log('🎵 No ad available from Spotify');
      return null;
      
    } catch (error) {
      console.error('🎵 Error requesting ad from Spotify:', error);
      throw error;
    }
  }

  buildAdRequest(targetingParams) {
    return {
      account_id: this.accountId,
      placement: {
        format: 'audio',
        duration: 30, // 30 second ads
        environment: 'streaming'
      },
      targeting: {
        geo: {
          countries: ['CA'],
          regions: targetingParams.location ? [targetingParams.location] : ['Ontario']
        },
        demographics: {
          age_ranges: ['18-34', '35-54', '55+'],
          interests: this.mapBusinessTypeToInterests(targetingParams.businessType)
        },
        contextual: {
          time_of_day: this.mapTimeOfDay(targetingParams.timeOfDay),
          device_types: ['mobile', 'desktop', 'tablet']
        }
      },
      budget: {
        bid_type: 'cpm',
        max_bid: 0.025 // $0.025 CAD max bid
      }
    };
  }

  mapBusinessTypeToInterests(businessType) {
    const interestMap = {
      'restaurant': ['food', 'dining', 'local_business'],
      'retail': ['shopping', 'fashion', 'local_business'],
      'entertainment': ['entertainment', 'music', 'events'],
      'fitness': ['fitness', 'health', 'wellness'],
      'automotive': ['automotive', 'transportation'],
      'healthcare': ['health', 'wellness', 'medical'],
      'beauty': ['beauty', 'wellness', 'fashion'],
      'education': ['education', 'learning', 'development']
    };

    return interestMap[businessType] || ['local_business', 'general'];
  }

  mapTimeOfDay(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  formatAdResponse(spotifyAd) {
    return {
      id: spotifyAd.id || `spotify_${Date.now()}`,
      title: spotifyAd.title || spotifyAd.creative?.title || 'Spotify Ad',
      advertiser: spotifyAd.advertiser?.name || 'Advertiser',
      audioUrl: spotifyAd.creative?.audio_url || this.generateMockAudioUrl(),
      duration: spotifyAd.creative?.duration || 30,
      cpm: spotifyAd.bid?.amount || 0.020, // $0.020 CAD
      currency: spotifyAd.bid?.currency || 'CAD',
      metadata: {
        campaign_id: spotifyAd.campaign_id,
        creative_id: spotifyAd.creative?.id,
        targeting: spotifyAd.targeting,
        provider: 'spotify'
      }
    };
  }

  generateMockAudioUrl() {
    // In development, return a mock audio URL
    // In production, this would be the actual Spotify creative URL
    return `https://ads-audio.spotify.com/mock/${Date.now()}.mp3`;
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'TavariMusic/1.0'
      };

      const options = {
        method,
        headers
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      console.log(`🎵 Making Spotify API request: ${method} ${endpoint}`);
      
      // In development, return mock response
      if (process.env.NODE_ENV === 'development' || !this.clientId) {
        return this.getMockResponse(endpoint, method, data);
      }

      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('🎵 Spotify API request failed:', error);
      throw error;
    }
  }

  getMockResponse(endpoint, method, data) {
    // Mock responses for development
    if (endpoint.includes('/ad-requests') && method === 'POST') {
      // 80% success rate for testing
      if (Math.random() < 0.8) {
        return {
          ad: {
            id: `spotify_mock_${Date.now()}`,
            title: 'Premium Audio Experience',
            advertiser: { name: 'Local Business Network' },
            creative: {
              id: `creative_${Date.now()}`,
              title: 'Discover Local Businesses',
              audio_url: 'https://mock-cdn.spotify.com/ads/sample_30s.mp3',
              duration: 30
            },
            bid: {
              amount: 0.018 + Math.random() * 0.010, // Random between $0.018-0.028
              currency: 'CAD'
            },
            campaign_id: `campaign_${Date.now()}`,
            targeting: data?.targeting
          }
        };
      } else {
        return null; // No ad available
      }
    }

    if (endpoint.includes('/accounts/')) {
      return {
        id: this.accountId,
        name: 'Test Business Account',
        status: 'active',
        currency: 'CAD'
      };
    }

    return {};
  }

  async ensureValidToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.refreshAccessToken();
    }
  }

  async reportAdPlay(adId, playData) {
    try {
      await this.ensureValidToken();

      const reportData = {
        ad_id: adId,
        event_type: 'impression',
        timestamp: new Date().toISOString(),
        context: {
          device_type: 'audio_system',
          location: playData.location,
          duration_played: playData.duration || 30
        }
      };

      await this.makeRequest('/events', 'POST', reportData);
      console.log('🎵 Reported ad play to Spotify');
      
    } catch (error) {
      console.error('🎵 Error reporting ad play to Spotify:', error);
    }
  }

  async getRevenueReport(startDate, endDate) {
    try {
      await this.ensureValidToken();

      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        account_id: this.accountId,
        group_by: 'day'
      });

      const response = await this.makeRequest(`/reports/revenue?${params}`, 'GET');
      
      return this.formatRevenueReport(response);
      
    } catch (error) {
      console.error('🎵 Error getting Spotify revenue report:', error);
      return null;
    }
  }

  formatRevenueReport(reportData) {
    if (!reportData || !reportData.data) {
      return { totalRevenue: 0, impressions: 0, averageCPM: 0 };
    }

    let totalRevenue = 0;
    let totalImpressions = 0;

    reportData.data.forEach(row => {
      totalRevenue += parseFloat(row.revenue || 0);
      totalImpressions += parseInt(row.impressions || 0);
    });

    return {
      totalRevenue,
      impressions: totalImpressions,
      averageCPM: totalImpressions > 0 ? (totalRevenue / totalImpressions) * 1000 : 0,
      currency: reportData.currency || 'CAD',
      period: `${reportData.start_date} to ${reportData.end_date}`
    };
  }

  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return { status: 'not_initialized' };
      }

      await this.ensureValidToken();
      
      // Simple ping to verify connectivity
      await this.makeRequest('/accounts/' + this.accountId, 'GET');
      
      return {
        status: 'healthy',
        provider: 'spotify',
        lastCheck: new Date().toISOString(),
        tokenValid: !!this.accessToken,
        accountId: this.accountId
      };
      
    } catch (error) {
      return {
        status: 'error',
        provider: 'spotify',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }

  getProviderInfo() {
    return {
      name: 'spotify',
      displayName: 'Spotify Ad Studio',
      priority: this.apiConfig.priority || 1,
      active: this.apiConfig.active !== false,
      initialized: this.isInitialized,
      rateLimits: {
        requestsPerHour: this.apiConfig.rate_limit_requests || 100,
        windowSeconds: this.apiConfig.rate_limit_window || 3600
      }
    };
  }

  // Cleanup
  destroy() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.isInitialized = false;
    console.log('🎵 SpotifyAdAPI destroyed');
  }
}

export default SpotifyAdAPI;