// components/HR/YTDComponents/YTDSummaryCard.jsx - Fixed YTD Summary Display Card
import React from 'react';
import { SecurityWrapper } from '../../../Security';
import { useSecurityContext } from '../../../Security';
import POSAuthWrapper from '../../Auth/POSAuthWrapper';
import TavariCheckbox from '../../UI/TavariCheckbox';
import { TavariStyles } from '../../../utils/TavariStyles';

const YTDSummaryCard = ({ 
  employee, 
  ytdData, 
  showDetailed = false, 
  onViewDetails = null,
  formatAmount = null 
}) => {
  const { recordAction } = useSecurityContext({
    componentName: 'YTDSummaryCard',
    sensitiveComponent: true,
    enableAuditLogging: true
  });

  const format = (amount) => {
    if (formatAmount) return formatAmount(amount);
    return Number(amount || 0).toFixed(2);
  };

  const handleViewDetails = async () => {
    await recordAction('ytd_details_viewed', employee?.id);
    if (onViewDetails) onViewDetails(employee, ytdData);
  };

  const handleCardClick = async () => {
    // Make the entire card clickable
    await recordAction('ytd_card_clicked', employee?.id);
    if (onViewDetails) onViewDetails(employee, ytdData);
  };

  const styles = {
    card: {
      backgroundColor: TavariStyles.colors.white,
      border: `1px solid ${TavariStyles.colors.gray200}`,
      borderRadius: TavariStyles.borderRadius?.md || '8px',
      padding: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.sm,
      boxShadow: TavariStyles.shadows?.sm || '0 1px 3px rgba(0,0,0,0.1)',
      transition: 'all 0.2s ease',
      cursor: onViewDetails ? 'pointer' : 'default', // Make card appear clickable
      position: 'relative'
    },
    cardHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      borderColor: TavariStyles.colors.primary + '50'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing.sm,
      paddingBottom: TavariStyles.spacing.xs,
      borderBottom: `1px solid ${TavariStyles.colors.gray100}`
    },
    employeeName: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800
    },
    taxYear: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray500,
      backgroundColor: TavariStyles.colors.gray50,
      padding: '4px 8px',
      borderRadius: TavariStyles.borderRadius?.sm || '4px'
    },
    noDataBadge: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.warning,
      backgroundColor: TavariStyles.colors.warning + '20',
      padding: '4px 8px',
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: showDetailed ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
      gap: TavariStyles.spacing.sm
    },
    dataItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    },
    label: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray500,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    value: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800
    },
    primaryValue: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.primary
    },
    deductionValue: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.danger
    },
    noDataValue: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray400,
      fontStyle: 'italic'
    },
    actionButton: {
      marginTop: TavariStyles.spacing.sm,
      padding: '10px 20px',
      backgroundColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.white,
      border: 'none',
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      width: '100%'
    },
    secondaryButton: {
      marginTop: TavariStyles.spacing.sm,
      padding: '10px 20px',
      backgroundColor: 'transparent',
      color: TavariStyles.colors.primary,
      border: `1px solid ${TavariStyles.colors.primary}`,
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      width: '100%'
    },
    lastUpdated: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.gray400,
      marginTop: TavariStyles.spacing.xs,
      textAlign: 'right'
    },
    noDataContainer: {
      textAlign: 'center',
      padding: TavariStyles.spacing.lg,
      color: TavariStyles.colors.gray500,
      border: `2px dashed ${TavariStyles.colors.gray200}`,
      borderRadius: TavariStyles.borderRadius?.md || '8px',
      marginTop: TavariStyles.spacing.sm
    },
    noDataIcon: {
      fontSize: '2rem',
      marginBottom: TavariStyles.spacing.sm,
      color: TavariStyles.colors.gray400
    },
    noDataTitle: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray600,
      marginBottom: TavariStyles.spacing.xs
    },
    noDataText: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray500,
      marginBottom: TavariStyles.spacing.md
    },
    clickHint: {
      position: 'absolute',
      top: '8px',
      right: '8px',
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.primary,
      backgroundColor: TavariStyles.colors.primary + '10',
      padding: '2px 6px',
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      fontWeight: TavariStyles.typography.fontWeight.medium
    }
  };

  // Handle hover effects
  const [isHovered, setIsHovered] = React.useState(false);

  if (!ytdData) {
    return (
      <div 
        style={{
          ...styles.card,
          ...(isHovered ? styles.cardHover : {})
        }}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {onViewDetails && (
          <div style={styles.clickHint}>Click to Add YTD Data</div>
        )}
        
        <div style={styles.header}>
          <div style={styles.employeeName}>
            {employee?.first_name} {employee?.last_name}
          </div>
          <div style={styles.noDataBadge}>No YTD Data</div>
        </div>

        <div style={styles.noDataContainer}>
          <div style={styles.noDataIcon}>📊</div>
          <div style={styles.noDataTitle}>No Year-to-Date Information</div>
          <div style={styles.noDataText}>
            No YTD data available for {new Date().getFullYear()}
          </div>
          
          {onViewDetails && (
            <button 
              style={styles.actionButton}
              onClick={(e) => {
                e.stopPropagation(); // Prevent double-click from card
                handleViewDetails();
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = TavariStyles.colors.primaryDark;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = TavariStyles.colors.primary;
              }}
            >
              ➕ Add YTD Data
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{
        ...styles.card,
        ...(isHovered ? styles.cardHover : {})
      }}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {onViewDetails && (
        <div style={styles.clickHint}>Click to View Details</div>
      )}
      
      <div style={styles.header}>
        <div style={styles.employeeName}>
          {employee?.first_name} {employee?.last_name}
        </div>
        <div style={styles.taxYear}>
          {ytdData.tax_year} YTD
        </div>
      </div>

      <div style={styles.grid}>
        {/* Hours Summary */}
        <div style={styles.dataItem}>
          <div style={styles.label}>Total Hours</div>
          <div style={styles.value}>{format(ytdData.hours_worked)} hrs</div>
        </div>

        {/* Gross Pay */}
        <div style={styles.dataItem}>
          <div style={styles.label}>Gross Pay</div>
          <div style={styles.primaryValue}>${format(ytdData.gross_pay)}</div>
        </div>

        {/* Net Pay */}
        <div style={styles.dataItem}>
          <div style={styles.label}>Net Pay</div>
          <div style={styles.primaryValue}>${format(ytdData.net_pay)}</div>
        </div>

        {showDetailed && (
          <>
            {/* Federal Tax */}
            <div style={styles.dataItem}>
              <div style={styles.label}>Federal Tax</div>
              <div style={styles.deductionValue}>${format(ytdData.federal_tax)}</div>
            </div>

            {/* Provincial Tax */}
            <div style={styles.dataItem}>
              <div style={styles.label}>Provincial Tax</div>
              <div style={styles.deductionValue}>${format(ytdData.provincial_tax)}</div>
            </div>

            {/* CPP */}
            <div style={styles.dataItem}>
              <div style={styles.label}>CPP</div>
              <div style={styles.deductionValue}>${format(ytdData.cpp_deduction)}</div>
            </div>

            {/* EI */}
            <div style={styles.dataItem}>
              <div style={styles.label}>EI</div>
              <div style={styles.deductionValue}>${format(ytdData.ei_deduction)}</div>
            </div>

            {/* Vacation Pay */}
            <div style={styles.dataItem}>
              <div style={styles.label}>Vacation Pay</div>
              <div style={styles.value}>${format(ytdData.vacation_pay)}</div>
            </div>

            {/* Premium Pay */}
            <div style={styles.dataItem}>
              <div style={styles.label}>Premium Pay</div>
              <div style={styles.value}>${format(ytdData.shift_premiums)}</div>
            </div>
          </>
        )}
      </div>

      {onViewDetails && (
        <button 
          style={styles.secondaryButton}
          onClick={(e) => {
            e.stopPropagation(); // Prevent double-click from card
            handleViewDetails();
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = TavariStyles.colors.primary;
            e.target.style.color = TavariStyles.colors.white;
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = TavariStyles.colors.primary;
          }}
        >
          📊 View Full Details
        </button>
      )}

      <div style={styles.lastUpdated}>
        Last updated: {new Date(ytdData.last_updated).toLocaleDateString()}
      </div>
    </div>
  );
};

export default YTDSummaryCard;