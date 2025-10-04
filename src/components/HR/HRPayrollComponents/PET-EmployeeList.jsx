// components/HR/HRPayrollComponents/PET-EmployeeList.jsx
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';

const PETEmployeeList = ({ 
  employees = [], 
  payrollRun, 
  employeeHours = {},
  employeeAdditionalFedTax = {},
  getEmployeePreview,
  onEmployeeClick
}) => {
  
  const [employeePreviews, setEmployeePreviews] = useState({});
  
  const safeFormat = useCallback((value, decimals = 2) => {
    try {
      const num = parseFloat(value || 0);
      return isNaN(num) ? '0.00' : num.toFixed(decimals);
    } catch {
      return '0.00';
    }
  }, []);

  const handleEmployeeClick = useCallback((employee) => {
    if (!employee?.id || !onEmployeeClick) return;
    
    try {
      onEmployeeClick(employee);
    } catch (error) {
      console.error('Error handling employee click:', error);
    }
  }, [onEmployeeClick]);

  // LOAD FROM DATABASE - hrpayroll_entries table
  useEffect(() => {
    const loadFromDatabase = async () => {
      if (!payrollRun?.id || !Array.isArray(employees) || employees.length === 0) {
        setEmployeePreviews({});
        return;
      }
    
      try {
        const { data: entries, error } = await supabase
          .from('hrpayroll_entries')
          .select('user_id, total_hours, net_pay, additional_tax')
          .eq('payroll_run_id', payrollRun.id);

        if (error) {
          console.error('Error loading from database:', error);
          return;
        }

        const entriesByUserId = {};
        if (entries && Array.isArray(entries)) {
          entries.forEach(entry => {
            if (entry && entry.user_id) {
              entriesByUserId[entry.user_id] = {
                net_pay: parseFloat(entry.net_pay) || 0,
                total_hours: parseFloat(entry.total_hours) || 0,
                additional_tax: parseFloat(entry.additional_tax) || 0
              };
            }
          });
        }

        setEmployeePreviews(entriesByUserId);
      } catch (error) {
        console.error('Error loading from database:', error);
      }
    };
  
    loadFromDatabase();
  
    // Refresh every 2 seconds to pick up new saves
    const interval = setInterval(loadFromDatabase, 2000);
    return () => clearInterval(interval);
  }, [payrollRun?.id, employees]);

  const processedEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];

    return employees
      .filter(emp => emp && emp.id)
      .map(employee => {
        const employeeId = employee.id;
        const dbEntry = employeePreviews[employeeId];
      
        if (!dbEntry) {
          return {
            ...employee,
            calculated: {
              totalHours: 0,
              netPay: 0,
              additionalFedTax: 0,
              hasHours: false,
              hasEntry: false
            }
          };
        }

        const totalHours = dbEntry.total_hours || 0;
      
        return {
          ...employee,
          calculated: {
            totalHours: totalHours,
            netPay: dbEntry.net_pay || 0,
            additionalFedTax: dbEntry.additional_tax || 0,
            hasHours: totalHours > 0,
            hasEntry: true
          }
        };
      });
  }, [employees, employeePreviews]);

  const styles = {
    section: {
      marginBottom: '16px',
      backgroundColor: '#ffffff',
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '12px',
      color: '#1f2937',
      margin: 0
    },
    instructionText: {
      fontSize: '14px',
      color: '#6b7280',
      marginBottom: '16px'
    },
    employeeList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    employeeCard: {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
      cursor: 'pointer',
      transition: 'border-color 0.2s',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    employeeInfo: {
      flex: 1
    },
    employeeName: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '4px'
    },
    employeeDetails: {
      fontSize: '14px',
      color: '#6b7280',
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap'
    },
    employeeStats: {
      display: 'flex',
      gap: '20px',
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    statItem: {
      textAlign: 'center',
      minWidth: '60px'
    },
    statValue: {
      fontSize: '16px',
      fontWeight: '700'
    },
    statLabel: {
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '4px'
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#6b7280',
      fontSize: '16px'
    }
  };

  if (!processedEmployees || processedEmployees.length === 0) {
    return (
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Employee Hours Entry</h3>
        <div style={styles.emptyState}>
          No employees available for payroll entry.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>Employee Hours Entry</h3>
      <div style={styles.instructionText}>
        Click on any employee to edit their hours and taxes.
      </div>
      
      <div style={styles.employeeList}>
        {processedEmployees.map(employee => {
          const { calculated } = employee;
          const {
            totalHours,
            additionalFedTax,
            netPay,
            hasHours,
            hasEntry
          } = calculated;

          return (
            <div
              key={employee.id}
              style={styles.employeeCard}
              onClick={() => handleEmployeeClick(employee)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#008080';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <div style={styles.employeeInfo}>
                <div style={styles.employeeName}>
                  {employee.first_name || 'Unknown'} {employee.last_name || 'Employee'}
                  {!hasEntry && (
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#9ca3af', 
                      marginLeft: '8px',
                      fontWeight: '400'
                    }}>
                      (No entry yet)
                    </span>
                  )}
                </div>
                <div style={styles.employeeDetails}>
                  <span>Rate: ${safeFormat(employee.wage)}/hr</span>
                  <span>Hours: {safeFormat(totalHours, 2)}</span>
                  <span>Lieu: {safeFormat(employee.lieu_time_balance || 0, 1)}</span>
                </div>
              </div>

              <div style={styles.employeeStats}>
                {additionalFedTax > 0 && (
                  <div style={styles.statItem}>
                    <div style={{
                      ...styles.statValue,
                      color: '#f59e0b'
                    }}>
                      ${safeFormat(additionalFedTax)}
                    </div>
                    <div style={styles.statLabel}>Add'l Fed Tax</div>
                  </div>
                )}

                <div style={styles.statItem}>
                  <div style={{
                    ...styles.statValue,
                    color: hasHours && netPay > 0 ? '#008080' : '#9ca3af',
                    fontSize: '18px'
                  }}>
                    ${safeFormat(netPay)}
                  </div>
                  <div style={styles.statLabel}>Net Pay</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PETEmployeeList;