// src/services/Ads/RevenueCalculator.js
import { supabase } from '../../supabaseClient';

class RevenueCalculator {
  constructor() {
    this.businessId = null;
    this.exchangeRates = new Map();
    this.lastRateUpdate = null;
    
    // Default commission structure
    this.defaultCommissions = {
      spotify: { api: 0.30, tavari: 0.10, business: 0.60 },
      google: { api: 0.32, tavari: 0.08, business: 0.60 },
      siriusxm: { api: 0.35, tavari: 0.05, business: 0.60 },
      networks: { api: 0.40, tavari: 0.00, business: 0.60 }
    };
    
    console.log('💰 RevenueCalculator created');
  }

  async initialize(businessId) {
    this.businessId = businessId;
    
    // Load current exchange rates
    await this.updateExchangeRates();
    
    console.log('💰 RevenueCalculator initialized for business:', businessId);
  }

  async calculateAdRevenue(adPlayId, adData, apiProvider) {
    if (!this.businessId || !adPlayId) {
      console.warn('💰 Cannot calculate revenue - missing required data');
      return null;
    }

    try {
      // Get business-specific revenue share settings
      const businessApiSettings = await this.getBusinessApiSettings(apiProvider);
      
      // Determine revenue type and base amount
      const revenueData = this.extractRevenueData(adData, apiProvider);
      
      // Calculate commission splits
      const commissions = this.calculateCommissions(
        revenueData.grossRevenue,
        apiProvider,
        businessApiSettings
      );

      // Convert currency if needed
      const convertedAmounts = await this.convertCurrency(commissions, revenueData.currency);

      // Store detailed revenue record
      const revenueRecord = await this.storeRevenueRecord({
        adPlayId,
        apiProvider,
        revenueType: revenueData.type,
        grossRevenue: convertedAmounts.gross,
        apiCommission: convertedAmounts.api,
        tavariCommission: convertedAmounts.tavari,
        businessPayout: convertedAmounts.business,
        currency: 'CAD',
        exchangeRate: convertedAmounts.exchangeRate,
        originalCurrency: revenueData.currency,
        originalAmount: revenueData.grossRevenue
      });

      // Update business running totals
      await this.updateBusinessTotals(convertedAmounts.business);

      console.log(`💰 Calculated revenue for ${apiProvider}: $${convertedAmounts.business.toFixed(4)} CAD to business`);
      
      return revenueRecord;
      
    } catch (error) {
      console.error('💰 Error calculating ad revenue:', error);
      return null;
    }
  }

  extractRevenueData(adData, apiProvider) {
    let grossRevenue = 0;
    let revenueType = 'cpm';
    let currency = 'CAD';

    // Extract revenue based on API provider
    switch (apiProvider) {
      case 'spotify':
        grossRevenue = adData.cpm || adData.bidAmount || 0.015; // Default $0.015 CAD
        revenueType = 'cpm';
        currency = adData.currency || 'USD';
        break;
        
      case 'google':
        grossRevenue = adData.cpm || adData.revenue || 0.012; // Default $0.012 CAD
        revenueType = 'cpm';
        currency = adData.currency || 'USD';
        break;
        
      case 'siriusxm':
        grossRevenue = adData.cpm || 0.020; // Default $0.020 CAD (premium)
        revenueType = 'cpm';
        currency = 'CAD'; // SiriusXM Canada uses CAD
        break;
        
      case 'networks':
        grossRevenue = adData.cpm || 0.008; // Default $0.008 CAD (lower fill rate)
        revenueType = 'cpm';
        currency = adData.currency || 'USD';
        break;
        
      default:
        grossRevenue = 0.010; // Fallback
        revenueType = 'cpm';
        currency = 'CAD';
    }

    return {
      grossRevenue: parseFloat(grossRevenue),
      type: revenueType,
      currency: currency
    };
  }

  calculateCommissions(grossRevenue, apiProvider, businessSettings = null) {
    // Use business-specific settings if available, otherwise use defaults
    const commissionRates = businessSettings?.commissionRates || 
                           this.defaultCommissions[apiProvider] || 
                           this.defaultCommissions.networks;

    const apiCommission = grossRevenue * commissionRates.api;
    const tavariCommission = grossRevenue * commissionRates.tavari;
    const businessPayout = grossRevenue * commissionRates.business;

    // Ensure totals add up correctly (handle rounding)
    const total = apiCommission + tavariCommission + businessPayout;
    const adjustment = grossRevenue - total;
    
    return {
      gross: grossRevenue,
      api: parseFloat(apiCommission.toFixed(6)),
      tavari: parseFloat(tavariCommission.toFixed(6)),
      business: parseFloat((businessPayout + adjustment).toFixed(6))
    };
  }

  async convertCurrency(amounts, fromCurrency) {
    if (fromCurrency === 'CAD') {
      return { ...amounts, exchangeRate: 1.0 };
    }

    try {
      const exchangeRate = await this.getExchangeRate(fromCurrency, 'CAD');
      
      return {
        gross: amounts.gross * exchangeRate,
        api: amounts.api * exchangeRate,
        tavari: amounts.tavari * exchangeRate,
        business: amounts.business * exchangeRate,
        exchangeRate: exchangeRate
      };
      
    } catch (error) {
      console.error('💰 Error converting currency:', error);
      // Fallback to approximate rate
      const fallbackRate = fromCurrency === 'USD' ? 1.35 : 1.0;
      return {
        gross: amounts.gross * fallbackRate,
        api: amounts.api * fallbackRate,
        tavari: amounts.tavari * fallbackRate,
        business: amounts.business * fallbackRate,
        exchangeRate: fallbackRate
      };
    }
  }

  async getExchangeRate(fromCurrency, toCurrency) {
    const rateKey = `${fromCurrency}_${toCurrency}`;
    
    // Check cache first
    if (this.exchangeRates.has(rateKey) && this.isRateValid()) {
      return this.exchangeRates.get(rateKey);
    }

    // Update rates if needed
    await this.updateExchangeRates();
    
    return this.exchangeRates.get(rateKey) || 1.0;
  }

  async updateExchangeRates() {
    try {
      // In production, you'd call a real exchange rate API
      // For now, we'll use approximate rates
      const rates = {
        'USD_CAD': 1.35,
        'EUR_CAD': 1.50,
        'GBP_CAD': 1.70
      };

      this.exchangeRates.clear();
      Object.entries(rates).forEach(([key, value]) => {
        this.exchangeRates.set(key, value);
      });

      this.lastRateUpdate = Date.now();
      console.log('💰 Updated exchange rates');
      
    } catch (error) {
      console.error('💰 Error updating exchange rates:', error);
    }
  }

  isRateValid() {
    // Rates are valid for 1 hour
    return this.lastRateUpdate && (Date.now() - this.lastRateUpdate) < 3600000;
  }

  async getBusinessApiSettings(apiProvider) {
    try {
      const { data: settings, error } = await supabase
        .from('music_business_ad_apis')
        .select('revenue_share_percent, settings')
        .eq('business_id', this.businessId)
        .eq('api_id', `(SELECT id FROM music_ad_apis WHERE api_name = '${apiProvider}')`)
        .single();

      if (error || !settings) {
        return null;
      }

      // Convert revenue share percentage to commission rates
      const businessShare = settings.revenue_share_percent / 100;
      const remainingShare = 1 - businessShare;
      
      // Split remaining between API and Tavari based on provider
      const apiShare = this.defaultCommissions[apiProvider]?.api || 0.30;
      const tavariShare = remainingShare - apiShare;

      return {
        commissionRates: {
          api: apiShare,
          tavari: Math.max(0, tavariShare),
          business: businessShare
        },
        customSettings: settings.settings || {}
      };
      
    } catch (error) {
      console.error('💰 Error getting business API settings:', error);
      return null;
    }
  }

  async storeRevenueRecord(revenueData) {
    try {
      const { data: record, error } = await supabase
        .from('music_ad_revenue_detailed')
        .insert({
          business_id: this.businessId,
          ad_play_id: revenueData.adPlayId,
          api_provider: revenueData.apiProvider,
          revenue_type: revenueData.revenueType,
          gross_revenue: revenueData.grossRevenue,
          api_commission: revenueData.apiCommission,
          tavari_commission: revenueData.tavariCommission,
          business_payout: revenueData.businessPayout,
          currency: revenueData.currency,
          exchange_rate: revenueData.exchangeRate,
          payment_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Also update the legacy revenue tracking table for compatibility
      await supabase
        .from('music_revenue_tracking')
        .insert({
          business_id: this.businessId,
          revenue_type: 'ad_revenue',
          amount: revenueData.businessPayout,
          currency: revenueData.currency,
          payment_status: 'pending'
        });

      return record;
      
    } catch (error) {
      console.error('💰 Error storing revenue record:', error);
      return null;
    }
  }

  async updateBusinessTotals(payoutAmount) {
    try {
      // Update daily totals for quick access
      const today = new Date().toISOString().split('T')[0];
      
      await supabase
        .rpc('increment_daily_revenue', {
          p_business_id: this.businessId,
          p_date: today,
          p_amount: payoutAmount
        });
        
    } catch (error) {
      console.error('💰 Error updating business totals:', error);
    }
  }

  async getRevenueStats(timeframe = '30days') {
    try {
      let startDate;
      const now = new Date();
      
      switch (timeframe) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const { data: revenueData, error } = await supabase
        .from('music_ad_revenue_detailed')
        .select('*')
        .eq('business_id', this.businessId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate statistics
      const stats = {
        totalRevenue: 0,
        totalPlays: revenueData?.length || 0,
        averageCPM: 0,
        revenueByProvider: {},
        revenueByDay: {},
        pendingPayout: 0,
        paidOut: 0
      };

      revenueData?.forEach(record => {
        const amount = parseFloat(record.business_payout || 0);
        stats.totalRevenue += amount;

        // Group by provider
        if (!stats.revenueByProvider[record.api_provider]) {
          stats.revenueByProvider[record.api_provider] = 0;
        }
        stats.revenueByProvider[record.api_provider] += amount;

        // Group by day
        const day = record.created_at.split('T')[0];
        if (!stats.revenueByDay[day]) {
          stats.revenueByDay[day] = 0;
        }
        stats.revenueByDay[day] += amount;

        // Payment status
        if (record.payment_status === 'pending') {
          stats.pendingPayout += amount;
        } else if (record.payment_status === 'paid') {
          stats.paidOut += amount;
        }
      });

      stats.averageCPM = stats.totalPlays > 0 ? (stats.totalRevenue / stats.totalPlays) * 1000 : 0;

      return stats;
      
    } catch (error) {
      console.error('💰 Error getting revenue stats:', error);
      return {
        totalRevenue: 0,
        totalPlays: 0,
        averageCPM: 0,
        revenueByProvider: {},
        revenueByDay: {},
        pendingPayout: 0,
        paidOut: 0
      };
    }
  }

  async calculateProjectedEarnings(playsPerDay = 40) {
    const avgCPM = 0.015; // Conservative estimate in CAD
    const dailyRevenue = (playsPerDay * avgCPM);
    
    return {
      daily: dailyRevenue,
      weekly: dailyRevenue * 7,
      monthly: dailyRevenue * 30,
      yearly: dailyRevenue * 365
    };
  }

  async processPayouts(minimumAmount = 25.00) {
    try {
      // Get businesses ready for payout
      const { data: readyPayouts, error } = await supabase
        .from('music_ad_revenue_detailed')
        .select(`
          business_id,
          SUM(business_payout) as total_pending
        `)
        .eq('payment_status', 'pending')
        .gte('business_payout', minimumAmount)
        .group('business_id');

      if (error) throw error;

      const payoutResults = [];

      for (const payout of readyPayouts || []) {
        if (payout.total_pending >= minimumAmount) {
          const result = await this.createPayout(payout.business_id, payout.total_pending);
          payoutResults.push(result);
        }
      }

      return payoutResults;
      
    } catch (error) {
      console.error('💰 Error processing payouts:', error);
      return [];
    }
  }

  async createPayout(businessId, amount) {
    try {
      // This would integrate with actual payment processing
      console.log(`💰 Creating payout of $${amount} for business ${businessId}`);
      
      // Mark revenue records as paid
      await supabase
        .from('music_ad_revenue_detailed')
        .update({
          payment_status: 'paid',
          payment_date: new Date().toISOString()
        })
        .eq('business_id', businessId)
        .eq('payment_status', 'pending');

      return {
        businessId,
        amount,
        status: 'processed',
        date: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('💰 Error creating payout:', error);
      return {
        businessId,
        amount,
        status: 'failed',
        error: error.message
      };
    }
  }
}

export default RevenueCalculator;