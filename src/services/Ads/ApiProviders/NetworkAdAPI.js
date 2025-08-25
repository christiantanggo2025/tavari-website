// src/services/Ads/ApiProviders/NetworkAdAPI.js

class NetworkAdAPI {
  constructor(apiConfig, businessConfig) {
    this.apiConfig = apiConfig;
    this.businessConfig = businessConfig;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.isInitialized = false;
    
    // Network-specific settings (aggregated networks)
    this.networks = apiConfig.credentials?.networks || [
      { name: 'AdvertiseCast', endpoint: 'https://api.advertisecast.com/v2', priority: 1 },
      { name: 'AudioGO', endpoint: 'https://api.audiogo.com/ads/v1', priority: 2 },
      { name: 'StreamAds', endpoint: 'https://api.streamads.ca/v1', priority: 3 },
      { name: 'PodscribeAudio', endpoint: 'https://api.podscribe.com/audio/v1', priority: 4 }
    ];
    
    this.partnerId = businessConfig.api_account_id;
    this.fallbackMode = true; // This API is typically used as fallback
    
    console.log('🌐 NetworkAdAPI created with', this.networks.length, 'networks');
  }

  async initialize() {
    try {
      // Initialize connections to all available networks
      await this.initializeNetworks();
      
      // Verify at least one network is available
      await this.verifyNetworkAccess();
      
      this.isInitialized = true;
      console.log('🌐 NetworkAdAPI initialized successfully');
      
    } catch (error) {
      console.error('🌐 Error initializing NetworkAdAPI:', error);
      throw error;
    }
  }

  async initializeNetworks() {
    for (const network of this.networks) {
      try {
        await this.authenticateNetwork(network);
        network.status = 'active';
        console.log(`🌐 Initialized network: ${network.name}`);
      } catch (error) {
        console.warn(`🌐 Failed to initialize ${network.name}:`, error.message);
        network.status = 'inactive';
      }
    }
  }

  async authenticateNetwork(network) {
    // Simple API key or basic auth for most networks
    // Each network might have different auth requirements
    
    if (network.name === 'AdvertiseCast') {
      network.token = this.apiConfig.credentials?.advertisecast_key || `mock_ac_token_${Date.now()}`;
    } else if (network.name === 'AudioGO') {
      network.token = this.apiConfig.credentials?.audiogo_key || `mock_ago_token_${Date.now()}`;
    } else if (network.name === 'StreamAds') {
      network.token = this.apiConfig.credentials?.streamads_key || `mock_sa_token_${Date.now()}`;
    } else {
      network.token = `mock_network_token_${Date.now()}`;
    }
    
    network.tokenExpiry = Date.now() + 86400000; // 24 hours
  }

  async verifyNetworkAccess() {
    const activeNetworks = this.networks.filter(n => n.status === 'active');
    
    if (activeNetworks.length === 0) {
      throw new Error('No active networks available');
    }
    
    console.log(`🌐 ${activeNetworks.length} networks ready for ad serving`);
    return true;
  }

  async requestAd(targetingParams = {}) {
    if (!this.isInitialized) {
      throw new Error('NetworkAdAPI not initialized');
    }

    try {
      // Try networks in priority order until we get an ad
      const activeNetworks = this.networks
        .filter(n => n.status === 'active')
        .sort((a, b) => a.priority - b.priority);

      for (const network of activeNetworks) {
        try {
          console.log(`🌐 Trying network: ${network.name}`);
          
          const ad = await this.requestAdFromNetwork(network, targetingParams);
          if (ad) {
            return ad;
          }
        } catch (error) {
          console.warn(`🌐 ${network.name} failed:`, error.message);
          continue; // Try next network
        }
      }
      
      console.log('🌐 No ads available from any network');
      return null;
      
    } catch (error) {
      console.error('🌐 Error requesting ad from networks:', error);
      throw error;
    }
  }

  async requestAdFromNetwork(network, targetingParams) {
    await this.ensureNetworkTokenValid(network);

    const adRequest = this.buildNetworkAdRequest(network, targetingParams);
    const response = await this.makeNetworkRequest(network, '/ads/request', 'POST', adRequest);
    
    if (response && (response.ad || response.ads?.[0])) {
      const ad = response.ad || response.ads[0];
      return this.formatNetworkAdResponse(ad, network);
    }
    
    return null;
  }

  buildNetworkAdRequest(network, targetingParams) {
    // Generic ad request format that works with most networks
    const baseRequest = {
      partnerId: this.partnerId,
      adUnit: {
        type: 'audio',
        duration: [15, 30, 60], // Accept multiple durations
        format: ['mp3', 'aac'],
        maxBitrate: 128
      },
      targeting: {
        geo: {
          country: 'CA',
          region: targetingParams.location || 'Ontario'
        },
        device: 'audio_streaming',
        environment: 'business',
        categories: this.mapBusinessTypeToCategories(targetingParams.businessType)
      },
      pricing: {
        model: 'cpm',
        floor: 0.005, // $0.005 CAD minimum - networks typically have lower rates
        currency: 'CAD'
      }
    };

    // Network-specific adjustments
    switch (network.name) {
      case 'AdvertiseCast':
        baseRequest.platform = 'streaming';
        baseRequest.inventory_type = 'background_music';
        break;
        
      case 'AudioGO':
        baseRequest.context = 'ambient';
        baseRequest.audience = 'business_customers';
        break;
        
      case 'StreamAds':
        baseRequest.placement = 'inter_track';
        baseRequest.canadian_content = true;
        break;
        
      default:
        baseRequest.generic = true;
    }

    return baseRequest;
  }

  mapBusinessTypeToCategories(businessType) {
    const categoryMap = {
      'restaurant': ['food', 'dining', 'hospitality'],
      'retail': ['shopping', 'retail', 'consumer'],
      'entertainment': ['entertainment', 'leisure', 'events'],
      'fitness': ['health', 'fitness', 'wellness'],
      'automotive': ['automotive', 'transportation'],
      'healthcare': ['health', 'medical'],
      'beauty': ['beauty', 'personal_care'],
      'education': ['education', 'professional']
    };

    return categoryMap[businessType] || ['general', 'local_business'];
  }

  formatNetworkAdResponse(networkAd, network) {
    // Normalize response format across different networks
    return {
      id: networkAd.id || networkAd.adId || `${network.name.toLowerCase()}_${Date.now()}`,
      title: networkAd.title || networkAd.name || `${network.name} Ad`,
      advertiser: networkAd.advertiser || networkAd.brand || 'Network Advertiser',
      audioUrl: networkAd.audioUrl || networkAd.creative?.url || this.generateMockAudioUrl(network),
      duration: networkAd.duration || networkAd.creative?.duration || 30,
      cpm: this.extractCPMFromResponse(networkAd, network),
      currency: networkAd.currency || 'CAD',
      metadata: {
        network: network.name,
        campaign_id: networkAd.campaignId || networkAd.campaign,
        creative_id: networkAd.creativeId || networkAd.creative?.id,
        targeting: networkAd.targeting,
        provider: 'networks'
      }
    };
  }

  extractCPMFromResponse(ad, network) {
    // Different networks return pricing in different formats
    if (ad.cpm) return parseFloat(ad.cpm);
    if (ad.price) return parseFloat(ad.price);
    if (ad.rate) return parseFloat(ad.rate);
    if (ad.revenue) return parseFloat(ad.revenue);
    
    // Fallback rates by network (typical ranges)
    const fallbackRates = {
      'AdvertiseCast': 0.008,
      'AudioGO': 0.006,
      'StreamAds': 0.010,
      'PodscribeAudio': 0.007
    };
    
    return fallbackRates[network.name] || 0.005;
  }

  generateMockAudioUrl(network) {
    const networkDomains = {
      'AdvertiseCast': 'cdn.advertisecast.com',
      'AudioGO': 'media.audiogo.com',
      'StreamAds': 'assets.streamads.ca',
      'PodscribeAudio': 'audio.podscribe.com'
    };
    
    const domain = networkDomains[network.name] || 'cdn.networkads.com';
    return `https://${domain}/ads/mock/${Date.now()}.mp3`;
  }

  async makeNetworkRequest(network, endpoint, method = 'GET', data = null) {
    try {
      const url = `${network.endpoint}${endpoint}`;
      const headers = {
        'Authorization': this.getAuthHeader(network),
        'Content-Type': 'application/json',
        'User-Agent': 'TavariMusic/1.0',
        'X-Network': network.name
      };

      const options = {
        method,
        headers
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      console.log(`🌐 Making ${network.name} request: ${method} ${endpoint}`);
      
      // In development, return mock response
      if (process.env.NODE_ENV === 'development' || !network.token.startsWith('real_')) {
        return this.getMockNetworkResponse(network, endpoint, method, data);
      }

      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`${network.name} API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error(`🌐 ${network.name} request failed:`, error);
      throw error;
    }
  }

  getAuthHeader(network) {
    // Different networks use different auth methods
    switch (network.name) {
      case 'AdvertiseCast':
        return `Bearer ${network.token}`;
      case 'AudioGO':
        return `ApiKey ${network.token}`;
      case 'StreamAds':
        return `Token ${network.token}`;
      default:
        return `Bearer ${network.token}`;
    }
  }

  getMockNetworkResponse(network, endpoint, method, data) {
    // Mock responses for development
    if (endpoint.includes('/ads/request') && method === 'POST') {
      // Network success rates vary (50-80% typical for fallback networks)
      const successRates = {
        'AdvertiseCast': 0.65,
        'AudioGO': 0.55,
        'StreamAds': 0.70,
        'PodscribeAudio': 0.50
      };
      
      const successRate = successRates[network.name] || 0.60;
      
      if (Math.random() < successRate) {
        return {
          ad: {
            id: `${network.name.toLowerCase()}_${Date.now()}`,
            title: `${network.name} Audio Advertisement`,
            advertiser: `${network.name} Network Partner`,
            audioUrl: this.generateMockAudioUrl(network),
            duration: 30,
            cpm: this.extractCPMFromResponse({}, network) + Math.random() * 0.003,
            currency: 'CAD',
            campaignId: `campaign_${Date.now()}`,
            creativeId: `creative_${Date.now()}`
          }
        };
      } else {
        return { ads: [] }; // No ad available
      }
    }

    return {};
  }

  async ensureNetworkTokenValid(network) {
    if (!network.token || Date.now() >= network.tokenExpiry) {
      await this.authenticateNetwork(network);
    }
  }

  async reportAdPlay(adId, playData, networkName) {
    try {
      const network = this.networks.find(n => n.name === networkName);
      if (!network) {
        console.warn(`🌐 Network ${networkName} not found for reporting`);
        return;
      }

      await this.ensureNetworkTokenValid(network);

      const reportData = {
        adId: adId,
        event: 'impression',
        timestamp: new Date().toISOString(),
        context: {
          device: 'business_audio_system',
          location: playData.location,
          duration: playData.duration || 30,
          environment: 'background_music'
        }
      };

      await this.makeNetworkRequest(network, '/events', 'POST', reportData);
      console.log(`🌐 Reported ad play to ${network.name}`);
      
    } catch (error) {
      console.error(`🌐 Error reporting ad play to ${networkName}:`, error);
    }
  }

  async getRevenueReport(startDate, endDate) {
    try {
      const reports = [];
      
      // Collect reports from all active networks
      for (const network of this.networks.filter(n => n.status === 'active')) {
        try {
          const params = new URLSearchParams({
            startDate: startDate,
            endDate: endDate,
            partnerId: this.partnerId
          });

          const response = await this.makeNetworkRequest(network, `/reports?${params}`, 'GET');
          
          if (response && response.revenue) {
            reports.push({
              network: network.name,
              ...this.formatNetworkRevenueReport(response, network)
            });
          }
        } catch (error) {
          console.warn(`🌐 Failed to get report from ${network.name}:`, error.message);
        }
      }
      
      return this.aggregateNetworkReports(reports);
      
    } catch (error) {
      console.error('🌐 Error getting network revenue reports:', error);
      return null;
    }
  }

  formatNetworkRevenueReport(reportData, network) {
    return {
      totalRevenue: parseFloat(reportData.revenue || 0),
      impressions: parseInt(reportData.impressions || 0),
      averageCPM: parseFloat(reportData.averageCPM || 0),
      currency: reportData.currency || 'CAD'
    };
  }

  aggregateNetworkReports(reports) {
    if (reports.length === 0) {
      return { totalRevenue: 0, impressions: 0, averageCPM: 0, networks: {} };
    }

    const aggregated = {
      totalRevenue: 0,
      impressions: 0,
      averageCPM: 0,
      currency: 'CAD',
      networks: {}
    };

    reports.forEach(report => {
      aggregated.totalRevenue += report.totalRevenue;
      aggregated.impressions += report.impressions;
      aggregated.networks[report.network] = {
        revenue: report.totalRevenue,
        impressions: report.impressions,
        cpm: report.averageCPM
      };
    });

    aggregated.averageCPM = aggregated.impressions > 0 
      ? (aggregated.totalRevenue / aggregated.impressions) * 1000 
      : 0;

    return aggregated;
  }

  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return { status: 'not_initialized' };
      }

      const networkHealth = {};
      let healthyNetworks = 0;

      for (const network of this.networks) {
        try {
          await this.ensureNetworkTokenValid(network);
          networkHealth[network.name] = { status: 'healthy', priority: network.priority };
          healthyNetworks++;
        } catch (error) {
          networkHealth[network.name] = { status: 'error', error: error.message };
        }
      }
      
      return {
        status: healthyNetworks > 0 ? 'healthy' : 'degraded',
        provider: 'networks',
        lastCheck: new Date().toISOString(),
        healthyNetworks: healthyNetworks,
        totalNetworks: this.networks.length,
        networks: networkHealth
      };
      
    } catch (error) {
      return {
        status: 'error',
        provider: 'networks',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }

  getProviderInfo() {
    const activeNetworks = this.networks.filter(n => n.status === 'active').length;
    
    return {
      name: 'networks',
      displayName: 'Ad Networks',
      priority: this.apiConfig.priority || 4,
      active: this.apiConfig.active !== false && activeNetworks > 0,
      initialized: this.isInitialized,
      networksActive: activeNetworks,
      networksTotal: this.networks.length,
      rateLimits: {
        requestsPerHour: this.apiConfig.rate_limit_requests || 2000,
        windowSeconds: this.apiConfig.rate_limit_window || 3600
      }
    };
  }

  // Cleanup
  destroy() {
    this.networks.forEach(network => {
      network.token = null;
      network.status = 'inactive';
    });
    this.isInitialized = false;
    console.log('🌐 NetworkAdAPI destroyed');
  }
}

export default NetworkAdAPI;