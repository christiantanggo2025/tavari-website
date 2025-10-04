// hooks/useOntarioHealthPremium.js - COMPLETELY FIXED: Removed all async operations and simplified
import { useMemo } from 'react';

/**
 * Ontario Health Premium Calculation Hook - FIXED VERSION
 * 
 * FIXES APPLIED:
 * - Removed ALL async operations that were causing freezing
 * - Removed problematic security context that was blocking renders
 * - Removed unnecessary authentication context
 * - Made all calculations purely synchronous and memoized
 * - Simplified to essential calculation logic only
 * - No side effects or state mutations
 * 
 * This hook is now completely safe for React rendering cycles.
 * 
 * @param {number} grossPay - Gross pay for the period
 * @param {number} payPeriods - Number of pay periods per year (52 = weekly, 26 = bi-weekly)
 * @param {string} jurisdiction - Tax jurisdiction (must be 'ON' for premium to apply)
 * @returns {Object} Health premium calculation functions and constants
 */
export const useOntarioHealthPremium = (grossPay = 0, payPeriods = 52, jurisdiction = 'ON') => {
  
  // Ontario Health Premium brackets (2025 rates) - Static configuration
  const BRACKETS = useMemo(() => ({
    no_premium: { min: 0, max: 20000, rate: 0, base: 0 },
    bracket_1: { min: 20001, max: 36000, rate: 0.06, base: 0 },
    bracket_2: { min: 36001, max: 48000, rate: 0.06, base: 300 },
    bracket_3: { min: 48001, max: 72000, rate: 0.25, base: 450 },
    bracket_4: { min: 72001, max: 200000, rate: 0.25, base: 600 },
    bracket_5: { min: 200001, max: 200600, rate: 0.25, base: 750 },
    bracket_6: { min: 200601, max: Infinity, rate: 0.25, base: 900 }
  }), []);

  /**
   * FIXED: Pure synchronous calculation function
   */
  const calculateHealthPremium = useMemo(() => {
    return (grossPayAmount, periodsPerYear, taxJurisdiction = 'ON') => {
      // Basic input validation and sanitization
      const validatedGrossPay = Math.max(0, parseFloat(grossPayAmount) || 0);
      const validatedPayPeriods = Math.max(1, Math.min(365, parseInt(periodsPerYear) || 52));
      const validatedJurisdiction = String(taxJurisdiction || 'ON').toUpperCase();

      // Only applies to Ontario
      if (validatedJurisdiction !== 'ON') {
        return {
          applies: false,
          annualPremium: 0,
          perPeriodPremium: 0,
          annualIncome: validatedGrossPay * validatedPayPeriods,
          bracket: 'N/A - Not Ontario',
          calculation_method: 'ontario_health_premium_exempt'
        };
      }

      // Calculate projected annual income
      const annualIncome = validatedGrossPay * validatedPayPeriods;
      
      let annualPremium = 0;
      let bracket = '';
      let rate = 0;

      // Apply bracket calculations
      if (annualIncome <= 20000) {
        annualPremium = 0;
        bracket = 'No premium (≤ $20,000)';
        rate = 0;
      } else if (annualIncome <= 36000) {
        const taxableIncome = annualIncome - 20000;
        annualPremium = Math.min(taxableIncome * 0.06, 300);
        bracket = '$20,001 - $36,000 (6% rate)';
        rate = 0.06;
      } else if (annualIncome <= 48000) {
        const taxableIncome = annualIncome - 36000;
        annualPremium = 300 + Math.min(taxableIncome * 0.06, 150);
        bracket = '$36,001 - $48,000 (6% rate on excess)';
        rate = 0.06;
      } else if (annualIncome <= 72000) {
        const taxableIncome = annualIncome - 48000;
        annualPremium = 450 + Math.min(taxableIncome * 0.25, 150);
        bracket = '$48,001 - $72,000 (25% rate on excess)';
        rate = 0.25;
      } else if (annualIncome <= 200000) {
        const taxableIncome = annualIncome - 72000;
        annualPremium = 600 + Math.min(taxableIncome * 0.25, 150);
        bracket = '$72,001 - $200,000 (25% rate on excess)';
        rate = 0.25;
      } else if (annualIncome <= 200600) {
        const taxableIncome = annualIncome - 200000;
        annualPremium = 750 + Math.min(taxableIncome * 0.25, 150);
        bracket = '$200,001 - $200,600 (25% rate on excess)';
        rate = 0.25;
      } else {
        const taxableIncome = annualIncome - 200600;
        annualPremium = 900 + (taxableIncome * 0.25);
        bracket = 'Over $200,600 (25% rate, no cap)';
        rate = 0.25;
      }

      // Convert to per-period deduction
      const perPeriodPremium = annualPremium / validatedPayPeriods;

      return {
        applies: annualPremium > 0,
        annualIncome: Math.round(annualIncome * 100) / 100,
        annualPremium: Math.round(annualPremium * 100) / 100,
        perPeriodPremium: Math.round(perPeriodPremium * 100) / 100,
        bracket: bracket,
        calculation_method: 'ontario_health_premium_2025',
        payPeriods: validatedPayPeriods,
        grossPayUsed: validatedGrossPay,
        rate: rate,
        breakdown: {
          income_threshold_met: annualIncome > 20000,
          bracket_calculation: {
            bracket_name: bracket,
            income_over_threshold: Math.max(0, annualIncome - 20000),
            applicable_rate: rate,
            annual_premium_calculated: annualPremium,
            per_period_premium_calculated: perPeriodPremium
          }
        }
      };
    };
  }, []);

  /**
   * FIXED: Simple calculation that returns just the premium amount
   */
  const calculateSimple = useMemo(() => {
    return (grossPayAmount, periodsPerYear, taxJurisdiction = 'ON') => {
      if (taxJurisdiction !== 'ON' || !grossPayAmount || !periodsPerYear) return 0;
      
      const grossPay = Math.max(0, parseFloat(grossPayAmount) || 0);
      const payPeriods = Math.max(1, parseInt(periodsPerYear) || 52);
      const annualIncome = grossPay * payPeriods;
      
      let annualPremium = 0;
      
      if (annualIncome <= 20000) {
        annualPremium = 0;
      } else if (annualIncome <= 36000) {
        annualPremium = Math.min((annualIncome - 20000) * 0.06, 300);
      } else if (annualIncome <= 48000) {
        annualPremium = 300 + Math.min((annualIncome - 36000) * 0.06, 150);
      } else if (annualIncome <= 72000) {
        annualPremium = 450 + Math.min((annualIncome - 48000) * 0.25, 150);
      } else if (annualIncome <= 200000) {
        annualPremium = 600 + Math.min((annualIncome - 72000) * 0.25, 150);
      } else if (annualIncome <= 200600) {
        annualPremium = 750 + Math.min((annualIncome - 200000) * 0.25, 150);
      } else {
        annualPremium = 900 + (annualIncome - 200600) * 0.25;
      }
      
      return Math.round((annualPremium / payPeriods) * 100) / 100;
    };
  }, []);

  /**
   * FIXED: Pure utility functions with no side effects
   */
  const formatPremiumAmount = useMemo(() => {
    return (amount, precision = 2) => {
      const num = parseFloat(amount) || 0;
      return num.toFixed(precision);
    };
  }, []);

  const premiumApplies = useMemo(() => {
    return (grossPayAmount, periodsPerYear, taxJurisdiction = 'ON') => {
      if (taxJurisdiction !== 'ON') return false;
      const grossPay = parseFloat(grossPayAmount) || 0;
      const payPeriods = parseInt(periodsPerYear) || 52;
      if (grossPay <= 0 || payPeriods <= 0) return false;
      const annualIncome = grossPay * payPeriods;
      return annualIncome > 20000;
    };
  }, []);

  const getBracketInfo = useMemo(() => {
    return (annualIncome) => {
      const income = parseFloat(annualIncome) || 0;
      
      if (income <= 20000) {
        return { name: 'No Premium', rate: 0, min: 0, max: 20000 };
      } else if (income <= 36000) {
        return { name: 'Bracket 1', rate: 0.06, min: 20001, max: 36000 };
      } else if (income <= 48000) {
        return { name: 'Bracket 2', rate: 0.06, min: 36001, max: 48000 };
      } else if (income <= 72000) {
        return { name: 'Bracket 3', rate: 0.25, min: 48001, max: 72000 };
      } else if (income <= 200000) {
        return { name: 'Bracket 4', rate: 0.25, min: 72001, max: 200000 };
      } else if (income <= 200600) {
        return { name: 'Bracket 5', rate: 0.25, min: 200001, max: 200600 };
      } else {
        return { name: 'Bracket 6', rate: 0.25, min: 200601, max: Infinity };
      }
    };
  }, []);

  // Return hook interface - all functions are now memoized and pure
  return {
    // Main calculation functions
    calculateHealthPremium,
    calculateSimple,
    
    // Utility functions
    formatPremiumAmount,
    premiumApplies,
    getBracketInfo,
    
    // Constants for reference
    INCOME_THRESHOLD: 20000,
    BRACKETS,
    
    // Metadata
    version: '2025.1.FIXED',
    lastUpdated: '2025-01-01',
    jurisdiction: 'ON'
  };
};

export default useOntarioHealthPremium;