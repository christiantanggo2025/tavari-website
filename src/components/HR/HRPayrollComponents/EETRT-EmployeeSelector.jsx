// components/HR/HRPayrollComponents/EETRT-EmployeeSelector.jsx
import React from 'react';
import { TavariStyles } from '../../../utils/TavariStyles';

const EETRT_EmployeeSelector = ({ employees, selectedEmployee, onEmployeeChange, effectiveBusinessId }) => {
  const styles = {
    section: {
      marginBottom: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.white,
      padding: TavariStyles.spacing.lg,
      borderRadius: '12px',
      border: `1px solid ${TavariStyles.colors.gray200}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    sectionTitle: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      marginBottom: TavariStyles.spacing.md,
      color: TavariStyles.colors.gray800
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.xs,
      marginBottom: TavariStyles.spacing.md
    },
    label: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray700
    },
    select: {
      padding: '12px 16px',
      border: `1px solid ${TavariStyles.colors.gray300}`,
      borderRadius: '6px',
      fontSize: TavariStyles.typography.fontSize.sm,
      backgroundColor: TavariStyles.colors.white
    }
  };

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Employee Tax & Separation Report Generator</div>
      
      <div style={styles.formGroup}>
        <label style={styles.label}>Select Employee:</label>
        <select
          style={styles.select}
          value={selectedEmployee?.users.id || ''}
          onChange={(e) => onEmployeeChange(e.target.value)}
          disabled={!effectiveBusinessId}
        >
          <option value="">Choose an employee to generate comprehensive report...</option>
          {employees.map(emp => (
            <option key={emp.users.id} value={emp.users.id}>
              {emp.users.first_name} {emp.users.last_name} ({emp.users.email})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default EETRT_EmployeeSelector;