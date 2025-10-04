// components/POS/POSRefundComponents/RefundSearchControls.jsx - Search and Filter Controls Component
import React from 'react';
import { TavariStyles } from '../../../utils/TavariStyles';

const RefundSearchControls = ({
  searchTerm,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  isQrScannerActive,
  onToggleQrScanner,
  onManualRefund,
  loading = false
}) => {
  const styles = {
    controls: {
      display: 'flex',
      gap: TavariStyles.spacing.xl,
      marginBottom: TavariStyles.spacing.xl,
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    searchSection: {
      flex: 1,
      display: 'flex',
      gap: TavariStyles.spacing.md,
      alignItems: 'center',
      minWidth: '300px'
    },
    searchInput: {
      ...TavariStyles.components.form.input,
      flex: 1,
      border: `2px solid ${TavariStyles.colors.primary}`,
      fontSize: TavariStyles.typography.fontSize.lg,
      minWidth: '200px'
    },
    qrButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      ...TavariStyles.components.button.sizes.md,
      whiteSpace: 'nowrap',
      minWidth: '120px'
    },
    qrButtonActive: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.md,
      whiteSpace: 'nowrap',
      minWidth: '120px',
      backgroundColor: TavariStyles.colors.success,
      borderColor: TavariStyles.colors.success
    },
    manualRefundButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.warning,
      ...TavariStyles.components.button.sizes.md,
      whiteSpace: 'nowrap',
      minWidth: '140px'
    },
    dateFilter: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.md,
      minWidth: '200px'
    },
    filterLabel: {
      ...TavariStyles.components.form.label,
      marginBottom: 0,
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      whiteSpace: 'nowrap'
    },
    select: {
      ...TavariStyles.components.form.select,
      border: `2px solid ${TavariStyles.colors.primary}`,
      minWidth: '120px'
    },
    loadingOverlay: {
      position: 'relative'
    },
    loadingSpinner: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '20px',
      height: '20px',
      border: '2px solid #f3f4f6',
      borderTop: '2px solid #008080',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    scannerStatus: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.success,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      marginTop: TavariStyles.spacing.xs
    },
    buttonGroup: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      alignItems: 'center'
    }
  };

  return (
    <>
      <div style={styles.controls}>
        <div style={styles.searchSection}>
          <div style={loading ? styles.loadingOverlay : {}}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by sale number or customer name..."
              style={styles.searchInput}
              disabled={loading}
            />
            {loading && (
              <div style={styles.loadingSpinner}></div>
            )}
          </div>
          
          <div style={styles.buttonGroup}>
            <div>
              <button
                style={isQrScannerActive ? styles.qrButtonActive : styles.qrButton}
                onClick={onToggleQrScanner}
                title="Toggle QR scanner for quick refund lookup"
                disabled={loading}
              >
                {isQrScannerActive ? 'Scanner Active' : 'Scan QR'}
              </button>
              {isQrScannerActive && (
                <div style={styles.scannerStatus}>
                  Camera active - point at QR code
                </div>
              )}
            </div>
            
            <button
              style={styles.manualRefundButton}
              onClick={onManualRefund}
              title="Process a manual refund by entering amount"
              disabled={loading}
            >
              Manual Refund
            </button>
          </div>
        </div>
        
        <div style={styles.dateFilter}>
          <label style={styles.filterLabel}>Time Period:</label>
          <select
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value)}
            style={styles.select}
            disabled={loading}
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Add CSS for spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
          }
        `}
      </style>
    </>
  );
};

export default RefundSearchControls;