// components/UI/TavariCheckbox.jsx - Fixed Reusable Checkbox Component
import React from 'react';
import { TavariStyles } from '../../utils/TavariStyles';

/**
 * Reusable checkbox component with consistent Tavari styling
 * 
 * @param {Object} props
 * @param {boolean} props.checked - Whether checkbox is checked
 * @param {Function} props.onChange - Change handler function
 * @param {string} props.label - Label text for checkbox
 * @param {string} props.size - Size variant: 'sm', 'md', 'lg' (default: 'md')
 * @param {boolean} props.disabled - Whether checkbox is disabled
 * @param {string} props.id - Unique ID for the checkbox
 * @param {string} props.name - Name attribute for the checkbox
 * @param {Object} props.style - Additional styles for container
 * @param {Object} props.labelStyle - Additional styles for label
 * @param {string} props.checkIcon - Custom check icon (default: '✓')
 * @param {string} props.testId - Test ID for testing
 * @returns {React.ReactNode} Checkbox component
 */
const TavariCheckbox = ({
  checked = false,
  onChange = () => {},
  label = '',
  size = 'md',
  disabled = false,
  id,
  name,
  style = {},
  labelStyle = {},
  checkIcon = '✓',
  testId,
  ...props
}) => {
  // Define size configurations directly since TavariStyles doesn't have checkbox.sizes
  const sizeConfigs = {
    sm: {
      checkboxSize: '16px',
      fontSize: TavariStyles.typography.fontSize.xs,
      gap: TavariStyles.spacing.xs
    },
    md: {
      checkboxSize: '20px',
      fontSize: TavariStyles.typography.fontSize.sm,
      gap: TavariStyles.spacing.sm
    },
    lg: {
      checkboxSize: '24px',
      fontSize: TavariStyles.typography.fontSize.base,
      gap: TavariStyles.spacing.md
    }
  };
  
  const sizeConfig = sizeConfigs[size] || sizeConfigs.md;
  
  const handleChange = (e) => {
    if (!disabled) {
      onChange(e.target.checked, e);
    }
  };

  const handleContainerClick = (e) => {
    // Prevent double triggering when clicking the actual input
    if (e.target.type === 'checkbox') return;
    
    if (!disabled) {
      onChange(!checked, { target: { checked: !checked, name, id } });
    }
  };

  const styles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      gap: sizeConfig.gap,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      userSelect: 'none',
      ...style
    },
    
    checkboxWrapper: {
      position: 'relative',
      display: 'inline-block'
    },
    
    hiddenInput: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0,
      margin: 0,
      padding: 0
    },
    
    customBox: {
      width: sizeConfig.checkboxSize,
      height: sizeConfig.checkboxSize,
      border: `2px solid ${checked ? TavariStyles.colors.primary : TavariStyles.colors.gray300}`,
      borderRadius: TavariStyles.borderRadius.sm,
      backgroundColor: checked ? TavariStyles.colors.primary : TavariStyles.colors.white,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: TavariStyles.transitions.normal,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: size === 'sm' ? '10px' : size === 'lg' ? '14px' : '12px',
      color: TavariStyles.colors.white,
      fontWeight: TavariStyles.typography.fontWeight.bold
    },
    
    label: {
      fontSize: sizeConfig.fontSize,
      color: disabled ? TavariStyles.colors.gray400 : TavariStyles.colors.gray700,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontWeight: TavariStyles.typography.fontWeight.medium,
      lineHeight: TavariStyles.typography.lineHeight.normal,
      ...labelStyle
    }
  };

  return (
    <label 
      style={styles.container}
      onClick={handleContainerClick}
      data-testid={testId}
    >
      <div style={styles.checkboxWrapper}>
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          style={styles.hiddenInput}
          id={id}
          name={name}
          {...props}
        />
        
        <div style={styles.customBox}>
          {checked && checkIcon}
        </div>
      </div>
      
      {label && (
        <span style={styles.label}>
          {label}
        </span>
      )}
    </label>
  );
};

export default TavariCheckbox;