// src/services/Ads/ApiProviders/SiriusXMAdAPI.js

class SiriusXMAdAPI {
  constructor(apiConfig, businessConfig) {
    this.apiConfig = apiConfig;
    this.businessConfig = businessConfig;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.isInitialized = false;
    
    // SiriusXM specific settings
    this.baseUrl = apiConfig.api_endpoint || 'https://api.siriusxm.ca/media/v1';
    this.apiKey = apiConfig.credentials?.api_key;
    this.clientSecret = apiConfig.credentials?.client_secret;
    this.partnerId = businessConfig.api_account_id;
    
    console.log('📻 SiriusXMAdAPI created');
  }

  async initialize() {
    try {
      // Get API access token
      await this.refreshAccessToken();
      
      // Verify partner account access
      await this.verifyAccount();
      
      this.isInitialized = true;
      console.log('📻 SiriusXMAdAPI initialized successfully');
      
    } catch (error) {
      console.error('📻 Error initializing SiriusXMAdAPI:', error);
      throw error;
    }
  }

  async refreshAccessToken() {
    try {
      // In production, implement proper SiriusXM token flow
      // For now, simulate token refresh
      
      if (!this.apiKey || !this.clientSecret) {
        throw new Error('Missing SiriusXM credentials');
      }

      // Mock token for development
      this.accessToken = `siriusxm_mock_token_${Date.now()}`;
      this.tokenExpiry = Date.now() + 7200000; // 2 hours
      
      console.log('📻 SiriusXM access token refreshed');
      
    } catch (error) {
      console.error('📻 Error refreshing SiriusXM token:', error);
      throw error;
    }
  }

  async verifyAccount() {
    try {
      // Verify partner account access
      const accountData = await this.makeRequest('/partners/' + this.partnerId, 'GET');
      
      console.log('📻 SiriusXM account verified:', accountData?.name || 'Unknown');
      return true;
      
    } catch (error) {
      console.error('📻 Error verifying SiriusXM account:', error);
      return false;
    }
  }

  async requestAd(targetingParams = {}) {
    if (!this.isInitialized) {
      throw new Error('SiriusXMAdAPI not initialized');
    }

    try {
      // Ensure token is valid
      await this.ensureValidToken();

      // Build ad request for SiriusXM
      const adRequest = this.buildAdRequest(targetingParams);
      
      // Request ad from SiriusXM
      const response = await this.makeRequest('/ad-requests', 'POST', adRequest);
      
      if (response && response.ad) {
        return this.formatAdResponse(response.ad);
      }
      
      console.log('📻 No ad available from SiriusXM');
      return null;
      
    } catch (error) {
      console.error('📻 Error requesting ad from SiriusXM:', error);
      throw error;
    }
  }

  buildAdRequest(targetingParams) {
    return {
      partnerId: this.partnerId,
      adUnit: {
        type: 'AUDIO_STREAM',
        duration: 30,
        format: 'MP3',
        environment: 'BUSINESS_STREAMING'
      },
      targeting: {
        geography: {
          country: 'CA',
          province: this.mapLocationToProvince(targetingParams.location),
          city: targetingParams.location
        },
        demographics: {
          interests: this.mapBusinessTypeToInterests(targetingParams.businessType),
          context: 'BACKGROUND_MUSIC'
        },
        temporal: {
          dayOfWeek: this.getCurrentDayOfWeek(),
          hourOfDay: targetingParams.timeOfDay || new Date().getHours(),
          timeZone: 'America/Toronto'
        },
        device: {
          type: 'AUDIO_SYSTEM',
          category: 'BUSINESS_STREAMING'
        }
      },
      pricing: {
        model: 'CPM',
        maxBid: 0.030, // $0.030 CAD - premium pricing for SiriusXM
        currency: 'CAD'
      },
      preferences: {
        contentRating: 'G', // General audience for business environments
        language: 'en-CA',
        exclusions: ['explicit_content', 'political_ads']
      }
    };
  }

  mapLocationToProvince(location) {
    const provinceMap = {
      'Toronto': 'ON',
      'Ottawa': 'ON',
      'Hamilton': 'ON',
      'London': 'ON',
      'Windsor': 'ON',
      'Ontario': 'ON'
    };

    return provinceMap[location] || 'ON';
  }

  mapBusinessTypeToInterests(businessType) {
    const interestMap = {
      'restaurant': ['dining', 'food_beverage', 'local_dining', 'culinary'],
      'retail': ['shopping', 'retail', 'fashion', 'consumer_goods'],
      'entertainment': ['entertainment', 'events', 'leisure', 'recreation'],
      'fitness': ['health', 'fitness', 'wellness', 'active_lifestyle'],
      'automotive': ['automotive', 'transportation', 'vehicles'],
      'healthcare': ['health', 'medical', 'wellness', 'healthcare'],
      'beauty': ['beauty', 'personal_care', 'wellness', 'cosmetics'],
      'education': ['education', 'learning', 'professional_development']
    };

    return interestMap[businessType] || ['local_business', 'general_interest'];
  }

  getCurrentDayOfWeek() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  }

  formatAdResponse(siriusXMAd) {
    return {
      id: siriusXMAd.id || `siriusxm_${Date.now()}`,
      title: siriusXMAd.title || siriusXMAd.campaignName || 'SiriusXM Audio Ad',
      advertiser: siriusXMAd.advertiser?.name || 'SiriusXM Media Partner',
      audioUrl: siriusXMAd.creative?.audioUrl || this.generateMockAudioUrl(),
      duration: siriusXMAd.creative?.duration || 30,
      cpm: siriusXMAd.pricing?.cpm || 0.025, // $0.025 CAD - premium rate
      currency: siriusXMAd.pricing?.currency || 'CAD',
      metadata: {
        campaign_id: siriusXMAd.campaignId,
        creative_id: siriusXMAd.creative?.id,
        flight_id: siriusXMAd.flightId,
        targeting: siriusXMAd.targeting,
        content_rating: siriusXMAd.contentRating,
        provider: 'siriusxm'
      }
    };
  }

  generateMockAudioUrl() {
    // In development, return a mock audio URL
    // In production, this would be the actual SiriusXM creative URL
    return `https://cdn.siriusxm.ca/ads/audio/mock/${Date.now()}.mp3`;
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'User-Agent': 'TavariMusic/1.0',
        'Accept-Language': 'en-CA'
      };

      const options = {
        method,
        headers
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      console.log(`📻 Making SiriusXM API request: ${method} ${endpoint}`);
      
      // In development, return mock response
      if (process.env.NODE_ENV === 'development' || !this.apiKey) {
        return this.getMockResponse(endpoint, method, data);
      }

      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`SiriusXM API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('📻 SiriusXM API request failed:', error);
      throw error;
    }
  }

  getMockResponse(endpoint, method, data) {
    // Mock responses for development
    if (endpoint.includes('/ad-requests') && method === 'POST') {
      // 70% success rate for testing (premium inventory, lower fill rate)
      if (Math.random() < 0.70) {
        return {
          ad: {
            id: `siriusxm_mock_${Date.now()}`,
            title: 'Premium Canadian Content',
            campaignName: 'SiriusXM Media Canada Campaign',
            advertiser: { name: 'Canadian Premium Brands' },
            creative: {
              id: `creative_${Date.now()}`,
              audioUrl: 'https://cdn.siriusxm.ca/ads/premium_sample.mp3',
              duration: 30,
              format: 'MP3',
              bitrate: 320
            },
            pricing: {
              cpm: 0.020 + Math.random() * 0.015, // Random between $0.020-0.035 CAD
              currency: 'CAD'
            },
            campaignId: `campaign_${Date.now()}`,
            flightId: `flight_${Date.now()}`,
            targeting: data?.targeting,
            contentRating: 'G'
          }
        };
      } else {
        return null; // No ad available
      }
    }

    if (endpoint.includes('/partners/')) {
      return {
        id: this.partnerId,
        name: 'Test Business Partner',
        status: 'active',
        country: 'CA',
        currency: 'CAD',
        tier: 'premium'
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
        adId: adId,
        eventType: 'IMPRESSION',
        timestamp: new Date().toISOString(),
        context: {
          deviceType: 'BUSINESS_AUDIO_SYSTEM',
          location: playData.location,
          duration: playData.duration || 30,
          completionRate: 1.0, // Assume full play for background music
          volume: playData.volume || 0.8
        },
        partnerId: this.partnerId
      };

      await this.makeRequest('/events/impressions', 'POST', reportData);
      console.log('📻 Reported ad play to SiriusXM');
      
    } catch (error) {
      console.error('📻 Error reporting ad play to SiriusXM:', error);
    }
  }

  async getRevenueReport(startDate, endDate) {
    try {
      await this.ensureValidToken();

      const params = new URLSearchParams({
        startDate: startDate,
        endDate: endDate,
        partnerId: this.partnerId,
        currency: 'CAD',
        timeZone: 'America/Toronto'
      });

      const response = await this.makeRequest(`/reports/revenue?${params}`, 'GET');
      
      return this.formatRevenueReport(response);
      
    } catch (error) {
      console.error('📻 Error getting SiriusXM revenue report:', error);
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
      period: `${reportData.startDate} to ${reportData.endDate}`,
      tier: 'premium'
    };
  }

  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return { status: 'not_initialized' };
      }

      await this.ensureValidToken();
      
      // Simple ping to verify connectivity
      await this.makeRequest('/partners/' + this.partnerId, 'GET');
      
      return {
        status: 'healthy',
        provider: 'siriusxm',
        lastCheck: new Date().toISOString(),
        tokenValid: !!this.accessToken,
        partnerId: this.partnerId,
        tier: 'premium'
      };
      
    } catch (error) {
      return {
        status: 'error',
        provider: 'siriusxm',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }

  getProviderInfo() {
    return {
      name: 'siriusxm',
      displayName: 'SiriusXM Media Canada',
      priority: this.apiConfig.priority || 3,
      active: this.apiConfig.active !== false,
      initialized: this.isInitialized,
      tier: 'premium',
      rateLimits: {
        requestsPerHour: this.apiConfig.rate_limit_requests || 500,
        windowSeconds: this.apiConfig.rate_limit_window || 3600
      }
    };
  }

  // Cleanup
  destroy() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.isInitialized = false;
    console.log('📻 SiriusXMAdAPI destroyed');
  }
}

export default SiriusXMAdAPI;