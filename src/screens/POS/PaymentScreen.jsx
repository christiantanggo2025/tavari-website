// screens/POS/PaymentScreen.jsx - Fixed with proper imports and props
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { logAction } from '../../helpers/posAudit';

// Foundation Components
import POSAuthWrapper from '../../components/Auth/POSAuthWrapper';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import { useTaxCalculations } from '../../hooks/useTaxCalculations';
import { TavariStyles } from '../../utils/TavariStyles';

// Payment Screen Components
import PaymentSummary from '../../components/POS/POSPaymentScreenComponents/PaymentSummary';
import PaymentMethods from '../../components/POS/POSPaymentScreenComponents/PaymentMethods';
import PaymentAmountInput from '../../components/POS/POSPaymentScreenComponents/PaymentAmountInput';
import TipControls from '../../components/POS/POSPaymentScreenComponents/TipControls';
import ManagerOverrideModal from '../../components/POS/POSPaymentScreenComponents/ManagerOverrideModal';
import LoyaltyDisplay from '../../components/POS/POSPaymentScreenComponents/LoyaltyDisplay';
import TaxBreakdown from '../../components/POS/POSPaymentScreenComponents/TaxBreakdown';
import { useSaleProcessor } from '../../components/POS/POSPaymentScreenComponents/SaleProcessor';

const PaymentScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Authentication using standardized hook
  const auth = usePOSAuth({
    requiredRoles: ['employee', 'manager', 'owner'],
    requireBusiness: true,
    componentName: 'PaymentScreen'
  });
  
  // Tax calculation utility using standardized hook
  const taxCalc = useTaxCalculations(auth.selectedBusinessId);
  
  const [saleData, setSaleData] = useState(null);
  const [loyaltySettings, setLoyaltySettings] = useState(null);
  const [businessSettings, setBusinessSettings] = useState(null);
  
  const [payments, setPayments] = useState([]);
  const [currentPayment, setCurrentPayment] = useState({ method: 'cash', amount: '' });
  const [customMethodName, setCustomMethodName] = useState('');
  const [showCustomMethod, setShowCustomMethod] = useState(false);
  const [showManagerOverride, setShowManagerOverride] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tipAmount, setTipAmount] = useState(0);
  const [overrideError, setOverrideError] = useState('');
  
  // LOYALTY STATE
  const [autoLoyaltyApplied, setAutoLoyaltyApplied] = useState(0);
  const [availableLoyaltyCredit, setAvailableLoyaltyCredit] = useState(0);
  const [loyaltyPointsToEarn, setLoyaltyPointsToEarn] = useState(0);
  const [loyaltyCreditsToEarn, setLoyaltyCreditsToEarn] = useState(0);
  const [dailyUsageRemaining, setDailyUsageRemaining] = useState(0);

  const receivedSaleData = location.state?.saleData;

  // Sale processor utilities
  const saleProcessor = useSaleProcessor(auth, taxCalc, businessSettings);

  // Helper function to display balance in correct format
  const getBalanceDisplay = (dollarAmount) => {
    if (!loyaltySettings) return '$0.00';
    
    const balanceInDollars = Math.abs(dollarAmount || 0);
    
    if (loyaltySettings.loyalty_mode === 'points') {
      const points = Math.round(balanceInDollars * loyaltySettings.redemption_rate);
      const displayPoints = Math.abs(points);
      return `${displayPoints.toLocaleString()} pts`;
    }
    return `$${balanceInDollars.toFixed(2)}`;
  };

  // Set up sale data when authentication is ready
  useEffect(() => {
    if (auth.isReady && receivedSaleData) {
      console.log('PaymentScreen: Setting up sale data:', receivedSaleData);
      setSaleData(receivedSaleData);
      
      logAction({
        action: 'payment_screen_opened',
        context: 'PaymentScreen',
        metadata: {
          sale_total: receivedSaleData.total_amount,
          item_count: receivedSaleData.item_count,
          customer_attached: !!receivedSaleData.loyaltyCustomer,
          tax_breakdown: receivedSaleData.aggregated_taxes,
          rebate_breakdown: receivedSaleData.aggregated_rebates
        }
      });
    } else if (auth.isReady && !receivedSaleData) {
      setError('No sale data provided - please return to tabs and try again');
    }
  }, [auth.isReady, receivedSaleData]);

  // Load settings after authentication
  useEffect(() => {
    if (auth.isReady) {
      loadLoyaltySettings();
      loadBusinessSettings();
    }
  }, [auth.isReady]);

  const loadBusinessSettings = async () => {
    if (!auth.selectedBusinessId) return;

    try {
      console.log('PaymentScreen: Loading business settings for:', auth.selectedBusinessId);
      
      const { data: businessInfo, error: businessError } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', auth.selectedBusinessId)
        .single();

      const { data: posSettings, error: posError } = await supabase
        .from('pos_settings')
        .select('*')
        .eq('business_id', auth.selectedBusinessId)
        .single();

      if (businessError && businessError.code !== 'PGRST116') {
        console.error('Error loading business info:', businessError);
      }

      const combinedSettings = {
        timezone: 'America/Toronto',
        name: businessInfo?.name || 'Business',
        tip_enabled: posSettings?.tip_enabled || false,
        default_tip_percent: posSettings?.default_tip_percent || 0.15,
        ...posSettings
      };

      console.log('PaymentScreen: Business settings loaded:', combinedSettings);
      setBusinessSettings(combinedSettings);
    } catch (err) {
      console.error('Failed to load business settings:', err);
      setBusinessSettings({
        timezone: 'America/Toronto',
        name: 'Business',
        tip_enabled: false,
        default_tip_percent: 0.15
      });
    }
  };

  const loadLoyaltySettings = async () => {
    if (!auth.selectedBusinessId) return;

    try {
      console.log('PaymentScreen: Loading loyalty settings for:', auth.selectedBusinessId);
      
      const { data: settings, error } = await supabase
        .from('pos_loyalty_settings')
        .select('*')
        .eq('business_id', auth.selectedBusinessId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading loyalty settings:', error);
        return;
      }

      if (settings) {
        console.log('PaymentScreen: Loyalty settings loaded:', settings);
        setLoyaltySettings(settings);
      } else {
        console.log('PaymentScreen: No loyalty settings found, loyalty disabled');
        setLoyaltySettings(null);
      }
    } catch (err) {
      console.error('Failed to load loyalty settings:', err);
      setLoyaltySettings(null);
    }
  };

  // MAIN LOYALTY CALCULATION
  const calculateLoyaltyCredits = async () => {
    if (!saleData?.loyaltyCustomer || !loyaltySettings?.is_active) {
      console.log('PaymentScreen: Skipping loyalty calculation - no customer or loyalty inactive');
      setAvailableLoyaltyCredit(0);
      setAutoLoyaltyApplied(0);
      setLoyaltyPointsToEarn(0);
      setLoyaltyCreditsToEarn(0);
      return;
    }

    try {
      console.log('🎯 Calculating loyalty for customer:', saleData.loyaltyCustomer);
      console.log('🎯 Using loyalty settings:', loyaltySettings);
      
      // Get today's date in business timezone
      const today = saleProcessor.getTodayInBusinessTimezone();
      console.log('🎯 Today in business timezone:', today);
      
      // Get today's usage for this customer
      const { data: todayUsage } = await supabase
        .from('pos_loyalty_daily_usage')
        .select('amount_used')
        .eq('loyalty_account_id', saleData.loyaltyCustomer.id)
        .eq('usage_date', today)
        .single();

      const usedTodayDollars = todayUsage?.amount_used || 0;
      console.log('🎯 Used today ($):', usedTodayDollars);
      
      // Calculate daily limit in dollars
      const dailyLimitPoints = loyaltySettings.max_redemption_per_day || 5000;
      const dailyLimitDollars = dailyLimitPoints / loyaltySettings.redemption_rate;
      
      console.log('🎯 Daily limit (points):', dailyLimitPoints);
      console.log('🎯 Daily limit ($):', dailyLimitDollars);
      
      const remainingDailyLimitDollars = Math.max(0, dailyLimitDollars - usedTodayDollars);
      setDailyUsageRemaining(remainingDailyLimitDollars);
      
      // Customer balance is in dollars - this is the source of truth
      const customerBalanceDollars = Math.abs(saleData.loyaltyCustomer.balance || 0);
      
      console.log('🎯 Customer balance ($):', customerBalanceDollars);
      console.log('🎯 Remaining daily limit ($):', remainingDailyLimitDollars);
      
      // Available credit is minimum of: customer balance, remaining daily limit, and sale amount
      const saleSubtotal = saleData?.subtotal || 0;
      const maxUsableDollars = Math.min(customerBalanceDollars, remainingDailyLimitDollars, saleSubtotal);
      
      console.log('🎯 Sale subtotal:', saleSubtotal);
      console.log('🎯 Max usable credit ($):', maxUsableDollars);
      
      setAvailableLoyaltyCredit(Math.max(0, maxUsableDollars));

      // Auto-apply logic
      let autoApplyAmount = 0;
      if (loyaltySettings.auto_apply === 'always' && maxUsableDollars > 0) {
        // Check minimum redemption (in points, convert to dollars)
        const minRedemptionPoints = loyaltySettings.min_redemption || 5000;
        const minRedemptionDollars = minRedemptionPoints / loyaltySettings.redemption_rate;
        
        console.log('🎯 Min redemption (points):', minRedemptionPoints);
        console.log('🎯 Min redemption ($):', minRedemptionDollars);
        
        if (maxUsableDollars >= minRedemptionDollars) {
          if (loyaltySettings.allow_partial_redemption) {
            // Use maximum available up to daily limit and sale amount
            autoApplyAmount = Math.min(maxUsableDollars, saleSubtotal);
          } else {
            // Use minimum redemption amount if customer has enough
            autoApplyAmount = Math.min(minRedemptionDollars, maxUsableDollars, saleSubtotal);
          }
          console.log('🎯 Will auto-apply ($):', autoApplyAmount);
        } else {
          console.log('🎯 Customer balance below minimum redemption, no auto-apply');
        }
      }
      
      console.log('🎯 Final auto-apply amount ($):', autoApplyAmount);
      setAutoLoyaltyApplied(autoApplyAmount);

      // Calculate points to earn on this purchase
      const earnRatePercent = loyaltySettings.earn_rate_percentage / 100;
      const taxableAmountForEarning = saleSubtotal - autoApplyAmount; // Earn on amount after loyalty redemption
      const dollarsToEarn = taxableAmountForEarning * earnRatePercent;
      const pointsToEarn = Math.round(dollarsToEarn * loyaltySettings.redemption_rate);
      
      console.log('🎯 Earn rate %:', loyaltySettings.earn_rate_percentage);
      console.log('🎯 Taxable amount for earning:', taxableAmountForEarning);
      console.log('🎯 Dollars to earn:', dollarsToEarn);
      console.log('🎯 Points to earn:', pointsToEarn);
      
      setLoyaltyCreditsToEarn(dollarsToEarn);
      setLoyaltyPointsToEarn(pointsToEarn);

    } catch (err) {
      console.error('Error calculating loyalty credits:', err);
      setAvailableLoyaltyCredit(0);
      setAutoLoyaltyApplied(0);
      setLoyaltyPointsToEarn(0);
      setLoyaltyCreditsToEarn(0);
    }
  };

  // Calculate loyalty credits after saleData, settings, and business settings are loaded
  useEffect(() => {
    if (saleData && loyaltySettings && businessSettings && auth.selectedBusinessId) {
      calculateLoyaltyCredits();
    }
  }, [saleData, loyaltySettings, businessSettings, auth.selectedBusinessId]);

  // ENHANCED TAX CALCULATIONS using the standardized utility
  const saleSubtotal = saleData?.subtotal || 0;
  const loyaltyRedemption = autoLoyaltyApplied; // Use calculated auto-apply amount
  const discountAmount = saleData?.discount_amount || 0;
  
  // Recalculate taxes when tip changes or when we have all required data
  const recalculateTaxes = () => {
    if (!saleData?.items || taxCalc.loading || !taxCalc.taxCategories.length) {
      return {
        totalTax: saleData?.tax_amount || 0,
        aggregatedTaxes: saleData?.aggregated_taxes || {},
        aggregatedRebates: saleData?.aggregated_rebates || {},
        itemTaxDetails: []
      };
    }

    return taxCalc.calculateTotalTax(
      saleData.items,
      discountAmount,
      loyaltyRedemption,
      saleSubtotal
    );
  };

  const taxCalculation = recalculateTaxes();
  const finalTaxAmount = taxCalculation.totalTax;
  
  // Calculate taxable amount after discounts and loyalty
  const taxableAmount = saleSubtotal - discountAmount - loyaltyRedemption;
  
  // Final total calculation with tip
  const subtotalAfterReductions = taxableAmount;
  const finalTotal = subtotalAfterReductions + finalTaxAmount + tipAmount;
  
  // Apply cash rounding for cash payments using standardized utility
  const getDisplayTotal = () => {
    const primaryPaymentMethod = payments.length > 0 ? payments[0].method : currentPayment.method;
    return taxCalc.applyCashRounding(finalTotal, primaryPaymentMethod);
  };

  const displayTotal = getDisplayTotal();
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remainingBalance = displayTotal - totalPaid;
  const changeOwed = Math.max(0, totalPaid - displayTotal);

  // Payment handling functions
  const handleAddPayment = async (amount, method, customName) => {
    // Special handling for loyalty credit payments
    if (method === 'loyalty_credit') {
      if (amount > availableLoyaltyCredit) {
        setError(`Maximum loyalty credit available: ${availableLoyaltyCredit.toFixed(2)}`);
        return;
      }
      
      if (!loyaltySettings.allow_partial_redemption) {
        const minRedemptionDollars = loyaltySettings.min_redemption / loyaltySettings.redemption_rate;
        if (amount < minRedemptionDollars) {
          setError(`Minimum redemption: $${minRedemptionDollars.toFixed(2)}`);
          return;
        }
      }
    }

    if (amount > remainingBalance && method !== 'cash') {
      if (!showManagerOverride) {
        setShowManagerOverride(true);
        setOverrideReason('Overpayment detected - Manager approval required for non-cash overpayment');
        return;
      }
    }

    if (method === 'custom' && !customName?.trim()) {
      setError('Please enter a custom payment method name');
      return;
    }

    if (showManagerOverride) {
      const isValidPin = await auth.validateManagerPin(managerPin);
      if (!isValidPin) {
        setOverrideError('Invalid manager PIN. Please try again.');
        return;
      }

      setOverrideError('');
      await logAction({
        action: 'manager_override_payment',
        context: 'PaymentScreen',
        metadata: { 
          reason: overrideReason, 
          amount, 
          method: method
        }
      });
    }

    const newPayment = {
      id: Date.now(),
      method: method,
      amount,
      custom_method_name: method === 'custom' ? customName : null,
      tip_amount: payments.length === 0 ? tipAmount : 0,
      timestamp: new Date().toISOString()
    };

    setPayments([...payments, newPayment]);
    
    const newRemainingBalance = remainingBalance - amount;
    setCurrentPayment({ 
      method: 'cash', 
      amount: newRemainingBalance > 0 ? newRemainingBalance.toFixed(2) : '' 
    });
    setCustomMethodName('');
    setShowCustomMethod(false);
    setShowManagerOverride(false);
    setManagerPin('');
    setOverrideReason('');
    setOverrideError('');
    setError(null);
  };

  // Complete sale finalization with enhanced loyalty processing
  const finalizeSale = async () => {
    if (remainingBalance > 0.01) {
      setError('Payment incomplete. Please add more payments to cover the total.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!auth.authUser) {
        throw new Error('User not authenticated');
      }

      console.log('🎯 Starting sale finalization with loyalty...');

      // Generate receipt number and QR code
      const receiptNumber = await saleProcessor.generateReceiptNumber();
      const qrCode = saleProcessor.generateQRCode(receiptNumber);
      
      console.log('Generated receipt number:', receiptNumber);

      // Calculate total loyalty redeemed from all loyalty payment methods
      const totalLoyaltyRedeemed = payments
        .filter(p => p.method === 'loyalty_credit')
        .reduce((sum, p) => sum + p.amount, 0) + autoLoyaltyApplied;

      // Create basic sale record
      const saleRecord = {
        business_id: auth.selectedBusinessId,
        user_id: auth.authUser.id,
        customer_id: saleData.loyaltyCustomer?.id || null,
        loyalty_customer_id: saleData.loyaltyCustomer?.id || null,
        customer_name: saleData.loyaltyCustomer?.customer_name || null,
        customer_phone: saleData.loyaltyCustomer?.customer_phone || null,
        
        subtotal: saleSubtotal,
        tax: finalTaxAmount,
        discount: discountAmount,
        loyalty_discount: totalLoyaltyRedeemed,
        total: displayTotal,
        
        payment_status: 'completed',
        payment_method: payments[0]?.method || 'cash',
        sale_number: receiptNumber,
        notes: totalLoyaltyRedeemed > 0 ? `Loyalty redemption: $${totalLoyaltyRedeemed.toFixed(2)}` : null,
        item_count: saleData.items?.length || 0,
        created_at: new Date().toISOString()
      };

      console.log('🎯 Creating sale record:', saleRecord);

      const { data: sale, error: saleError } = await supabase
        .from('pos_sales')
        .insert(saleRecord)
        .select()
        .single();

      if (saleError) {
        console.error('Sale creation error:', saleError);
        throw saleError;
      }

      console.log('🎯 Sale created successfully:', sale);

      // Create receipt record
      const receipt = await saleProcessor.createReceiptRecord(
        sale.id, receiptNumber, qrCode, saleData, payments, tipAmount, 
        changeOwed, displayTotal, taxCalculation, finalTaxAmount, 
        saleSubtotal, discountAmount, totalLoyaltyRedeemed
      );

      // Save sale items
      if (saleData.items && saleData.items.length > 0) {
        const saleItems = saleData.items.map(item => ({
          business_id: auth.selectedBusinessId,
          sale_id: sale.id,
          inventory_id: item.id,
          name: item.name,
          quantity: item.quantity || 1,
          unit_price: item.price || 0,
          total_price: (item.price || 0) * (item.quantity || 1),
          modifiers: item.modifiers || null,
          created_at: new Date().toISOString()
        }));

        const { error: itemsError } = await supabase
          .from('pos_sale_items')
          .insert(saleItems);

        if (itemsError) {
          console.error('Error saving sale items:', itemsError);
        }
      }

      // Save payment records
      if (payments.length > 0) {
        const paymentRecords = payments.map(payment => ({
          business_id: auth.selectedBusinessId,
          sale_id: sale.id,
          payment_method: payment.method,
          amount: payment.amount,
          custom_method_name: payment.custom_method_name || null,
          processed_by: auth.authUser.id,
          created_at: new Date().toISOString()
        }));

        const { error: paymentsError } = await supabase
          .from('pos_payments')
          .insert(paymentRecords);

        if (paymentsError) {
          console.error('Error saving payments:', paymentsError);
        }
      }

      // ENHANCED LOYALTY PROCESSING
      if (saleData.loyaltyCustomer && loyaltySettings?.is_active) {
        const today = saleProcessor.getTodayInBusinessTimezone();
        const customerBalanceBefore = Math.abs(saleData.loyaltyCustomer.balance || 0);
        
        // Process loyalty redemption if any
        if (totalLoyaltyRedeemed > 0) {
          console.log('🎯 Processing loyalty redemption:', totalLoyaltyRedeemed);
          
          // Record redemption transaction
          await supabase
            .from('pos_loyalty_transactions')
            .insert({
              business_id: auth.selectedBusinessId,
              loyalty_account_id: saleData.loyaltyCustomer.id,
              transaction_id: sale.id,
              transaction_type: 'redeem',
              amount: totalLoyaltyRedeemed,
              points: Math.round(totalLoyaltyRedeemed * loyaltySettings.redemption_rate),
              balance_before: customerBalanceBefore,
              balance_after: customerBalanceBefore - totalLoyaltyRedeemed,
              points_before: Math.round(customerBalanceBefore * loyaltySettings.redemption_rate),
              points_after: Math.round((customerBalanceBefore - totalLoyaltyRedeemed) * loyaltySettings.redemption_rate),
              description: `Redeemed for receipt ${receiptNumber}`,
              processed_by: auth.authUser.id,
              earned_date: today
            });

          // Update daily usage
          await supabase
            .from('pos_loyalty_daily_usage')
            .upsert({
              business_id: auth.selectedBusinessId,
              loyalty_account_id: saleData.loyaltyCustomer.id,
              usage_date: today,
              amount_used: (dailyUsageRemaining > 0 ? 
                (loyaltySettings.max_redemption_per_day / loyaltySettings.redemption_rate - dailyUsageRemaining) + totalLoyaltyRedeemed : 
                totalLoyaltyRedeemed)
            }, {
              onConflict: 'business_id,loyalty_account_id,usage_date',
              ignoreDuplicates: false
            });
        }

        // Award new loyalty points
        if (loyaltyPointsToEarn > 0) {
          console.log('🎯 Awarding loyalty points:', loyaltyPointsToEarn);
          
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          let expiryDate = null;
          if (loyaltySettings.credits_expire && loyaltySettings.expiry_months) {
            expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + loyaltySettings.expiry_months);
          }

          const newBalance = customerBalanceBefore + loyaltyCreditsToEarn - totalLoyaltyRedeemed;
          const newPoints = Math.round(newBalance * loyaltySettings.redemption_rate);

          // Record earning transaction
          await supabase
            .from('pos_loyalty_transactions')
            .insert({
              business_id: auth.selectedBusinessId,
              loyalty_account_id: saleData.loyaltyCustomer.id,
              transaction_id: sale.id,
              transaction_type: 'earn',
              amount: loyaltyCreditsToEarn,
              points: loyaltyPointsToEarn,
              balance_before: customerBalanceBefore - totalLoyaltyRedeemed,
              balance_after: newBalance,
              points_before: Math.round((customerBalanceBefore - totalLoyaltyRedeemed) * loyaltySettings.redemption_rate),
              points_after: newPoints,
              description: `Earned from receipt ${receiptNumber}`,
              processed_by: auth.authUser.id,
              earned_date: tomorrow.toISOString().split('T')[0],
              expires_at: expiryDate ? expiryDate.toISOString().split('T')[0] : null
            });

          // Update customer balance and points to be in sync
          await supabase
            .from('pos_loyalty_accounts')
            .update({ 
              balance: newBalance,
              points: newPoints, // Now calculated from balance to stay in sync
              total_earned: (saleData.loyaltyCustomer.total_earned || 0) + loyaltyCreditsToEarn,
              total_spent: (saleData.loyaltyCustomer.total_spent || 0) + totalLoyaltyRedeemed,
              last_activity: new Date().toISOString()
            })
            .eq('id', saleData.loyaltyCustomer.id);

          console.log('🎯 Updated customer balance:', newBalance, 'points:', newPoints);
        }
      }

      // Save enhanced sale data for receipt screen
      const enhancedSaleData = {
        ...saleData,
        sale_id: sale.id,
        receipt_id: receipt.id,
        receipt_number: receiptNumber,
        qr_code: qrCode,
        payments,
        tip_amount: tipAmount,
        change_given: changeOwed,
        final_total: displayTotal,
        final_tax_amount: finalTaxAmount,
        final_taxable_amount: taxableAmount,
        tax_calculation: taxCalculation,
        cash_rounding_applied: taxCalc.applyCashRounding(finalTotal, 'cash') !== finalTotal,
        business_name: businessSettings?.name || 'Business',
        cashier_name: auth.authUser?.email || 'Unknown',
        loyalty_redeemed: totalLoyaltyRedeemed,
        loyalty_points_earned: loyaltyPointsToEarn
      };
      
      sessionStorage.setItem('lastSaleData', JSON.stringify(enhancedSaleData));

      console.log('🎯 Sale and receipt finalized successfully. Receipt number:', receiptNumber);

      // Log successful completion
      await logAction({
        action: 'sale_completed',
        context: 'PaymentScreen',
        metadata: {
          business_id: auth.selectedBusinessId,
          sale_id: sale.id,
          receipt_id: receipt.id,
          receipt_number: receiptNumber,
          total_amount: displayTotal,
          payment_methods: payments.map(p => p.method),
          customer_attached: !!saleData.loyaltyCustomer,
          loyalty_redeemed: totalLoyaltyRedeemed,
          loyalty_points_earned: loyaltyPointsToEarn,
          user_role: auth.userRole
        }
      });

      // Navigate to receipt screen
      navigate('/dashboard/pos/receipt', {
        state: {
          saleData: enhancedSaleData,
          from: location.state?.from || 'payment'
        }
      });

    } catch (err) {
      console.error('Sale finalization error:', err);
      setError(`Failed to complete sale: ${err.message}`);
      
      await logAction({
        action: 'sale_completion_error',
        context: 'PaymentScreen',
        metadata: {
          business_id: auth.selectedBusinessId,
          error: err.message,
          user_role: auth.userRole
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Error handling for missing sale data
  if (!receivedSaleData) {
    return (
      <POSAuthWrapper
        requiredRoles={['employee', 'manager', 'owner']}
        componentName="PaymentScreen"
      >
        <div style={TavariStyles.utils.merge(styles.container, TavariStyles.layout.flexCenter)}>
          <div style={styles.errorCard}>
            <h3 style={styles.errorTitle}>No Sale Data</h3>
            <p style={styles.errorMessage}>No sale data was provided. Please return to tabs and try again.</p>
            <button 
              style={TavariStyles.utils.merge(
                TavariStyles.components.button.base,
                TavariStyles.components.button.variants.primary
              )}
              onClick={() => navigate('/dashboard/pos/tabs')}
            >
              Back to Tabs
            </button>
          </div>
        </div>
      </POSAuthWrapper>
    );
  }

  // Loading state while settings load
  if (!saleData || !businessSettings) {
    return (
      <POSAuthWrapper
        requiredRoles={['employee', 'manager', 'owner']}
        componentName="PaymentScreen"
      >
        <div style={styles.container}>
          <div style={styles.loading}>
            <div style={TavariStyles.components.loading.spinner}></div>
            <div>Loading payment screen...</div>
            <style>{TavariStyles.keyframes.spin}</style>
            <br />
            <small>Business ID: {auth.selectedBusinessId || 'Not found'}</small>
            <br />
            <small>Sale Data: {saleData ? 'Loaded' : 'Missing'}</small>
            <br />
            <small>Loyalty Settings: {loyaltySettings ? 'Loaded' : 'Loading...'}</small>
            <br />
            <small>Business Settings: {businessSettings ? 'Loaded' : 'Loading...'}</small>
          </div>
        </div>
      </POSAuthWrapper>
    );
  }

  return (
    <POSAuthWrapper
      requiredRoles={['employee', 'manager', 'owner']}
      componentName="PaymentScreen"
    >
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Process Payment</h2>
          <p style={styles.subtitle}>Complete the payment for this sale</p>
          
          <LoyaltyDisplay
            loyaltyCustomer={saleData.loyaltyCustomer}
            loyaltySettings={loyaltySettings}
            availableLoyaltyCredit={availableLoyaltyCredit}
            dailyUsageRemaining={dailyUsageRemaining}
            loyaltyPointsToEarn={loyaltyPointsToEarn}
            loyaltyCreditsToEarn={loyaltyCreditsToEarn}
          />
        </div>

        <div style={styles.content}>
          {/* Payment Summary with Tax Breakdown */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Payment Summary</h3>
            <PaymentSummary
              saleSubtotal={saleSubtotal}
              discountAmount={discountAmount}
              loyaltyRedemption={loyaltyRedemption}
              taxableAmount={taxableAmount}
              taxCalculation={taxCalculation}
              finalTaxAmount={finalTaxAmount}
              tipAmount={tipAmount}
              displayTotal={displayTotal}
              totalPaid={totalPaid}
              remainingBalance={remainingBalance}
              saleData={saleData}
              loyaltySettings={loyaltySettings}
              loyaltyPointsToEarn={loyaltyPointsToEarn}
              loyaltyCreditsToEarn={loyaltyCreditsToEarn}
              getBalanceDisplay={getBalanceDisplay}
            />
            
            <TaxBreakdown 
              taxCalculation={taxCalculation}
              taxCalc={taxCalc}
            />
          </div>

          {/* Tip Controls with updated business settings */}
          <TipControls
            tipAmount={tipAmount}
            onTipChange={setTipAmount}
            saleSubtotal={saleSubtotal}
            businessSettings={businessSettings}
            defaultTipPercent={businessSettings?.default_tip_percent || 0.15}
          />

          {/* Payment Methods */}
          <PaymentMethods
            currentPayment={currentPayment}
            setCurrentPayment={setCurrentPayment}
            loyaltySettings={loyaltySettings}
            availableLoyaltyCredit={availableLoyaltyCredit}
            remainingBalance={remainingBalance}
            getBalanceDisplay={getBalanceDisplay}
            showCustomMethod={showCustomMethod}
            setShowCustomMethod={setShowCustomMethod}
            customMethodName={customMethodName}
            setCustomMethodName={setCustomMethodName}
          />

          {/* Payment Amount Input */}
          <PaymentAmountInput
            currentPayment={currentPayment}
            setCurrentPayment={setCurrentPayment}
            remainingBalance={remainingBalance}
            availableLoyaltyCredit={availableLoyaltyCredit}
            getBalanceDisplay={getBalanceDisplay}
            onAddPayment={(amount, method, customName) => handleAddPayment(Number(amount), method, customName)}
            error={error}
          />

          {error && (
            <div style={TavariStyles.utils.merge(
              TavariStyles.components.banner.base,
              TavariStyles.components.banner.variants.error
            )}>
              {error}
            </div>
          )}
        </div>

        {/* Manager Override Modal */}
        <ManagerOverrideModal
          showManagerOverride={showManagerOverride}
          setShowManagerOverride={setShowManagerOverride}
          overrideReason={overrideReason}
          managerPin={managerPin}
          setManagerPin={setManagerPin}
          onApprove={() => handleAddPayment(
            Number(currentPayment.amount),
            currentPayment.method,
            customMethodName
          )}
          onCancel={() => {
            setShowManagerOverride(false);
            setManagerPin('');
            setOverrideError('');
          }}
          overrideError={overrideError}
        />

        <div style={styles.actions}>
          <button
            style={TavariStyles.utils.merge(
              TavariStyles.components.button.base,
              TavariStyles.components.button.variants.secondary,
              TavariStyles.components.button.sizes.lg,
              loading ? TavariStyles.utils.disabled({}, {}) : {}
            )}
            onClick={() => navigate('/dashboard/pos/tabs')}
            disabled={loading}
          >
            Back to Tabs
          </button>
          
          <button
            style={TavariStyles.utils.merge(
              TavariStyles.components.button.base,
              remainingBalance > 0.01 || loading ? 
                TavariStyles.components.button.variants.secondary : 
                TavariStyles.components.button.variants.success,
              TavariStyles.components.button.sizes.lg,
              { flex: 2 },
              remainingBalance > 0.01 || loading ? TavariStyles.utils.disabled({}, {}) : {}
            )}
            onClick={finalizeSale}
            disabled={remainingBalance > 0.01 || loading}
          >
            {loading ? 'Processing Sale...' : 
             remainingBalance > 0.01 ? `${remainingBalance.toFixed(2)} Remaining` : 
             'Complete Sale'}
          </button>
        </div>
      </div>
    </POSAuthWrapper>
  );
};

// Custom styles using TavariStyles as base
const styles = {
  container: {
    ...TavariStyles.layout.container,
    gap: TavariStyles.spacing.xl
  },
  
  header: {
    textAlign: 'center',
    marginBottom: TavariStyles.spacing.xl
  },
  
  title: {
    fontSize: TavariStyles.typography.fontSize['3xl'],
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.gray800,
    margin: 0,
    marginBottom: TavariStyles.spacing.sm
  },
  
  subtitle: {
    fontSize: TavariStyles.typography.fontSize.lg,
    color: TavariStyles.colors.gray600,
    margin: 0,
    marginBottom: TavariStyles.spacing.md
  },
  
  content: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: TavariStyles.spacing.lg
  },
  
  section: {
    ...TavariStyles.layout.card,
    padding: TavariStyles.spacing.xl
  },
  
  sectionTitle: {
    margin: 0,
    marginBottom: TavariStyles.spacing.lg,
    fontSize: TavariStyles.typography.fontSize.xl,
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.gray800,
    borderBottom: `2px solid ${TavariStyles.colors.primary}`,
    paddingBottom: TavariStyles.spacing.sm
  },
 
  actions: {
    display: 'flex',
    gap: TavariStyles.spacing.lg,
    justifyContent: 'space-between',
    marginTop: TavariStyles.spacing.xl
  },
 
  loading: {
    ...TavariStyles.components.loading.container,
    textAlign: 'center',
    lineHeight: TavariStyles.typography.lineHeight.relaxed
  },
 
  errorCard: {
    ...TavariStyles.layout.card,
    padding: TavariStyles.spacing['3xl'],
    textAlign: 'center',
    maxWidth: '500px',
    border: `2px solid ${TavariStyles.colors.danger}`
  },
 
  errorTitle: {
    fontSize: TavariStyles.typography.fontSize['2xl'],
    fontWeight: TavariStyles.typography.fontWeight.bold,
    color: TavariStyles.colors.danger,
    marginBottom: TavariStyles.spacing.lg
  },
 
  errorMessage: {
    fontSize: TavariStyles.typography.fontSize.lg,
    color: TavariStyles.colors.gray700,
    marginBottom: TavariStyles.spacing.xl,
    lineHeight: TavariStyles.typography.lineHeight.relaxed
  }
};

export default PaymentScreen;