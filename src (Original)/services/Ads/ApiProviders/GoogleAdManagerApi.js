// src/services/Ads/ApiProviders/GoogleAdManagerAPI.js

class GoogleAdManagerAPI {
  constructor(apiConfig, businessConfig) {
    this.apiConfig = apiConfig;
    this.businessConfig = businessConfig;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.isInitialized = false;
    
    // Google Ad Manager specific settings
    this.baseUrl = apiConfig.api_endpoint || 'https://googleads.googleapis.com/v13';
    this.serviceAccountKey = apiConfig.credentials?.service_account_key;
    this.customerId = businessConfig.api_account_id;
    this.networkCode = businessConfig.settings?.network_code;
    
    console.log('🎯 GoogleAdManagerAPI created');
  }

  async initialize() {
    try {
      // Get OAuth2 access token for service account
      await this.refreshAccessToken();
      
      // Verify account access and network configuration
      await this.verifyAccount();
      
      this.isInitialized = true;
      console.log('🎯 GoogleAdManagerAPI initialized successfully');
      
    } catch (error) {
      console.error('🎯 Error initializing GoogleAdManagerAPI:', error);
      throw error;
    }
  }

  async refreshAccessToken() {
    try {
      // In production, implement proper service account JWT flow
      // For now, simulate token refresh
      
      if (!this.serviceAccountKey) {
        throw new Error('Missing Google service account credentials');
      }

      // Mock token for development
      this.accessToken = `google_mock_token_${Date.now()}`;
      this.tokenExpiry = Date.now() + 3600000; // 1 hour
      
      console.log('🎯 Google access token refreshed');
      
    } catch (error) {
      console.error('🎯 Error refreshing Google token:', error);
      throw error;
    }
  }

  async verifyAccount() {
    try {
      // Verify account access and get network details
      const accountData = await this.makeRequest('/customers/' + this.customerId, 'GET');
      
      console.log('🎯 Google account verified:', accountData?.descriptive_name || 'Unknown');
      return true;
      
    } catch (error) {
      console.error('🎯 Error verifying Google account:', error);
      return false;
    }
  }

  async requestAd(targetingParams = {}) {
    if (!this.isInitialized) {
      throw new Error('GoogleAdManagerAPI not initialized');
    }

    try {
      // Ensure token is valid
      await this.ensureValidToken();

      // Build ad request for Google Ad Manager
      const adRequest = this.buildAdRequest(targetingParams);
      
      // Request ad from Google
      const response = await this.makeRequest('/ad-requests', 'POST', adRequest);
      
      if (response && response.lineItems && response.lineItems.length > 0) {
        return this.formatAdResponse(response.lineItems[0]);
      }
      
      console.log('🎯 No ad available from Google');
      return null;
      
    } catch (error) {
      console.error('🎯 Error requesting ad from Google:', error);
      throw error;
    }
  }

  buildAdRequest(targetingParams) {
    return {
      networkCode: this.networkCode,
      adUnitTargeting: {
        adUnitId: 'audio_streaming_unit',
        targeting: {
          inventoryTargeting: {
            targetedAdUnits: [{
              adUnitId: 'audio_streaming_unit',
              includeDescendants: true
            }]
          },
          geoTargeting: {
            targetedLocations: this.mapLocationToGoogleGeo(targetingParams.location)
          },
          customTargeting: {
            customCriteria: this.buildCustomTargeting(targetingParams)
          },
          dayPartTargeting: {
            dayParts: [{
              dayOfWeek: this.getCurrentDayOfWeek(),
              startTime: this.mapTimeToGoogleFormat(targetingParams.timeOfDay),
              endTime: this.mapTimeToGoogleFormat(targetingParams.timeOfDay + 1)
            }]
          }
        }
      },
      creative: {
        size: { width: 1, height: 1 }, // Audio creative
        creativeType: 'AUDIO'
      },
      bidding: {
        strategy: 'CPM',
        maxBid: { microAmount: 25000 } // $0.025 CAD in micro amounts
      }
    };
  }

  mapLocationToGoogleGeo(location) {
    const locationMap = {
      'Ontario': [{ id: 20032, displayName: 'Ontario, Canada' }],
      'Toronto': [{ id: 1002775, displayName: 'Toronto, ON, Canada' }],
      'Ottawa': [{ id: 1002787, displayName: 'Ottawa, ON, Canada' }],
      'Hamilton': [{ id: 1002773, displayName: 'Hamilton, ON, Canada' }]
    };

    return locationMap[location] || locationMap['Ontario'];
  }

  buildCustomTargeting(targetingParams) {
    const criteria = [];

    if (targetingParams.businessType) {
      criteria.push({
        keyId: 'business_type',
        valueIds: [this.mapBusinessTypeToGoogleKey(targetingParams.businessType)]
      });
    }

    criteria.push({
      keyId: 'device_type',
      valueIds: ['audio_system', 'streaming_device']
    });

    return criteria;
  }

  mapBusinessTypeToGoogleKey(businessType) {
    const typeMap = {
      'restaurant': 'food_beverage',
      'retail': 'retail_shopping',
      'entertainment': 'entertainment_media',
      'fitness': 'health_fitness',
      'automotive': 'automotive',
      'healthcare': 'healthcare_medical',
      'beauty': 'beauty_personal_care',
      'education': 'education_training'
    };

    return typeMap[businessType] || 'local_business';
  }

  getCurrentDayOfWeek() {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[new Date().getDay()];
  }

  mapTimeToGoogleFormat(hour) {
    return {
      hour: hour % 24,
      minute: 0
    };
  }

  formatAdResponse(googleLineItem) {
    const creative = googleLineItem.creatives?.[0] || {};
    
    return {
      id: googleLineItem.id || `google_${Date.now()}`,
      title: creative.name || googleLineItem.name || 'Google Audio Ad',
      advertiser: googleLineItem.advertiser?.name || 'Advertiser',
      audioUrl: creative.audioUrl || this.generateMockAudioUrl(),
      duration: creative.duration || 30,
      cpm: this.extractCPMFromLineItem(googleLineItem),
      currency: 'USD', // Google typically reports in USD
      metadata: {
        line_item_id: googleLineItem.id,
        creative_id: creative.id,
        order_id: googleLineItem.orderId,
        targeting: googleLineItem.targeting,
        provider: 'google'
      }
    };
  }

  extractCPMFromLineItem(lineItem) {
    if (lineItem.costPerUnit && lineItem.costPerUnit.microAmount) {
      return lineItem.costPerUnit.microAmount / 1000000; // Convert micro amounts to actual amount
    }
    return 0.015; // Default $0.015 USD
  }

  generateMockAudioUrl() {
    // In development, return a mock audio URL
    // In production, this would be the actual Google creative URL
    return `https://storage.googleapis.com/ad-audio/mock/${Date.now()}.mp3`;
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Developer-Token': this.apiConfig.credentials?.developer_token,
        'User-Agent': 'TavariMusic/1.0'
      };

      const options = {
        method,
        headers
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      console.log(`🎯 Making Google API request: ${method} ${endpoint}`);
      
      // In development, return mock response
      if (process.env.NODE_ENV === 'development' || !this.serviceAccountKey) {
        return this.getMockResponse(endpoint, method, data);
      }

      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`Google API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('🎯 Google API request failed:', error);
      throw error;
    }
  }

  getMockResponse(endpoint, method, data) {
    // Mock responses for development
    if (endpoint.includes('/ad-requests') && method === 'POST') {
      // 75% success rate for testing
      if (Math.random() < 0.75) {
        return {
          lineItems: [{
            id: `google_lineitem_${Date.now()}`,
            name: 'Premium Audio Campaign',
            advertiser: { name: 'Google Ads Network' },
            creatives: [{
              id: `creative_${Date.now()}`,
              name: 'Audio Advertisement',
              audioUrl: 'https://storage.googleapis.com/ads/sample_audio.mp3',
              duration: 30
            }],
            costPerUnit: {
              microAmount: 12000 + Math.random() * 8000 // Random between $0.012-0.020
            },
            orderId: `order_${Date.now()}`,
            targeting: data?.adUnitTargeting?.targeting
          }]
        };
      } else {
        return { lineItems: [] }; // No ad available
      }
    }

    if (endpoint.includes('/customers/')) {
      return {
        id: this.customerId,
        descriptive_name: 'Test Business Account',
        currency_code: 'CAD',
        time_zone: 'America/Toronto'
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
        lineItemId: adId,
        eventType: 'IMPRESSION',
        timestamp: new Date().toISOString(),
        deviceType: 'AUDIO_STREAMING_DEVICE',
        location: playData.location,
        duration: playData.duration || 30
      };

      await this.makeRequest('/events', 'POST', reportData);
      console.log('🎯 Reported ad play to Google');
      
    } catch (error) {
      console.error('🎯 Error reporting ad play to Google:', error);
    }
  }

  async getRevenueReport(startDate, endDate) {
    try {
      await this.ensureValidToken();

      const params = new URLSearchParams({
        startDate: startDate,
        endDate: endDate,
        customerId: this.customerId,
        networkCode: this.networkCode
      });

      const response = await this.makeRequest(`/reports/revenue?${params}`, 'GET');
      
      return this.formatRevenueReport(response);
      
    } catch (error) {
      console.error('🎯 Error getting Google revenue report:', error);
      return null;
    }
  }

  formatRevenueReport(reportData) {
    if (!reportData || !reportData.rows) {
      return { totalRevenue: 0, impressions: 0, averageCPM: 0 };
    }

    let totalRevenue = 0;
    let totalImpressions = 0;

    reportData.rows.forEach(row => {
      totalRevenue += parseFloat(row.revenue || 0);
      totalImpressions += parseInt(row.impressions || 0);
    });

    return {
      totalRevenue,
      impressions: totalImpressions,
      averageCPM: totalImpressions > 0 ? (totalRevenue / totalImpressions) * 1000 : 0,
      currency: reportData.currency || 'USD',
      period: `${reportData.startDate} to ${reportData.endDate}`
    };
  }

  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return { status: 'not_initialized' };
      }

      await this.ensureValidToken();
      
      // Simple ping to verify connectivity
      await this.makeRequest('/customers/' + this.customerId, 'GET');
      
      return {
        status: 'healthy',
        provider: 'google',
        lastCheck: new Date().toISOString(),
        tokenValid: !!this.accessToken,
        customerId: this.customerId,
        networkCode: this.networkCode
      };
      
    } catch (error) {
      return {
        status: 'error',
        provider: 'google',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }

  getProviderInfo() {
    return {
      name: 'google',
      displayName: 'Google Ad Manager',
      priority: this.apiConfig.priority || 2,
      active: this.apiConfig.active !== false,
      initialized: this.isInitialized,
      rateLimits: {
        requestsPerHour: this.apiConfig.rate_limit_requests || 1000,
        windowSeconds: this.apiConfig.rate_limit_window || 3600
      }
    };
  }

  // Cleanup
  destroy() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.isInitialized = false;
    console.log('🎯 GoogleAdManagerAPI destroyed');
  }
}

export default GoogleAdManagerAPI;