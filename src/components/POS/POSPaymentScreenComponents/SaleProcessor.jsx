// components/POS/POSPaymentScreenComponents/SaleProcessor.jsx
import React from 'react';
import { supabase } from '../../../supabaseClient';
import { logAction } from '../../../helpers/posAudit';

export const useSaleProcessor = (auth, taxCalc, businessSettings) => {
  // Generate receipt number in proper format
  const generateReceiptNumber = async () => {
    try {
      const businessShort = auth.selectedBusinessId.slice(-4).toUpperCase();
      const today = new Date();
      const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
      
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      
      const { data: todaySales, error: countError } = await supabase
        .from('pos_sales')
        .select('id')
        .eq('business_id', auth.selectedBusinessId)
        .gte('created_at', startOfDay)
        .lt('created_at', endOfDay);
      
      if (countError) {
        console.error('Error counting today sales:', countError);
        return `R${businessShort}${dateStr}${Date.now().toString().slice(-3)}`;
      }
      
      const sequenceNumber = (todaySales?.length || 0) + 1;
      const paddedSequence = sequenceNumber.toString().padStart(3, '0');
      
      return `R${businessShort}${dateStr}${paddedSequence}`;
    } catch (err) {
      console.error('Error generating receipt number:', err);
      return `R${auth.selectedBusinessId.slice(-4)}${Date.now().toString().slice(-6)}`;
    }
  };

  const generateQRCode = (receiptNumber) => {
    return `${receiptNumber}-${auth.selectedBusinessId.slice(-8)}`;
  };

  const createReceiptRecord = async (saleId, receiptNumber, qrCode, saleData, payments, tipAmount, changeOwed, displayTotal, taxCalculation, finalTaxAmount, saleSubtotal, discountAmount, loyaltyRedemption) => {
    try {
      console.log('Creating receipt record for sale:', saleId);
      
      const receiptData = {
        business_id: auth.selectedBusinessId,
        sale_id: saleId,
        receipt_number: receiptNumber,
        qr_code: qrCode,
        total: displayTotal,
        items: saleData.items || [],
        receipt_type: 'Standard',
        subtotal: saleSubtotal,
        discount_amount: discountAmount,
        loyalty_redemption: loyaltyRedemption,
        tax_amount: finalTaxAmount,
        tip_amount: tipAmount,
        aggregated_taxes: taxCalculation.aggregatedTaxes,
        aggregated_rebates: taxCalculation.aggregatedRebates,
        payment_methods: payments,
        change_given: changeOwed,
        customer_name: saleData.loyaltyCustomer?.customer_name || null,
        customer_phone: saleData.loyaltyCustomer?.customer_phone || null,
        customer_email: saleData.loyaltyCustomer?.customer_email || null,
        employee_name: auth.authUser?.email || 'Unknown',
        business_name: businessSettings?.name || 'Business',
        cash_rounding_applied: taxCalc.applyCashRounding(displayTotal, 'cash') !== displayTotal
      };

      const { data: receipt, error: receiptError } = await supabase
        .from('pos_receipts')
        .insert(receiptData)
        .select()
        .single();

      if (receiptError) {
        console.error('Receipt creation error:', receiptError);
        throw receiptError;
      }

      console.log('Receipt created successfully:', receipt);
      return receipt;
      
    } catch (err) {
      console.error('Error creating receipt record:', err);
      throw err;
    }
  };

  // Helper function to get today's date in business timezone
  const getTodayInBusinessTimezone = () => {
    const businessTimezone = businessSettings?.timezone || 'America/Toronto';
    const today = new Date();
    
    const todayInBizTz = new Intl.DateTimeFormat('sv-SE', {
      timeZone: businessTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(today);
    
    return todayInBizTz;
  };

  return {
    generateReceiptNumber,
    generateQRCode,
    createReceiptRecord,
    getTodayInBusinessTimezone
  };
};

const SaleProcessor = () => {
  // This is a utility component, no JSX needed
  return null;
};

export default SaleProcessor;