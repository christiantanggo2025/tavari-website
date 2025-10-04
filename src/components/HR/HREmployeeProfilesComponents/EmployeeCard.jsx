// components/HR/HREmployeeProfilesComponents/EmployeeCard.jsx - Individual Employee Card Component
import React, { useState } from 'react';
import { Eye, Edit, Clock, Award, DollarSign, Calendar, X, Trash2, User, Shield, GraduationCap } from 'lucide-react';
import { TavariStyles } from '../../../utils/TavariStyles';

const EmployeeCard = ({
  employee,
  formatTaxAmount,
  canManageEmployees,
  canViewAuditHistory,
  onViewEmployee,
  onEditEmployee,
  onManagePremiums,
  onManageCertificates,
  onManageLieuTime,
  onManageVacationPay,
  onViewAuditHistory,
  onTerminateEmployee,
  onDeleteEmployee,
  onManageBirthday,
  onManageSIN,
  onToggleStudentPay
}) => {
  
  // Calculate age from birth_date
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Check if employee qualifies for student minimum wage
  const isStudentEligible = () => {
    const age = calculateAge(employee.birth_date);
    return age !== null && age < 18;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return TavariStyles.colors.success;
      case 'probation': return TavariStyles.colors.warning;
      case 'suspended': return TavariStyles.colors.danger;
      case 'terminated': return TavariStyles.colors.gray500;
      case 'on_leave': return TavariStyles.colors.info;
      default: return TavariStyles.colors.gray500;
    }
  };

  const styles = {
    employeeCard: {
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius?.lg || '12px',
      padding: TavariStyles.spacing.xl,
      border: `2px solid ${TavariStyles.colors.gray200}`,
      boxShadow: TavariStyles.shadows?.base || '0 2px 4px rgba(0,0,0,0.1)',
      transition: TavariStyles.transitions?.normal || 'all 0.2s ease'
    },
    employeeHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: TavariStyles.spacing.lg,
      paddingBottom: TavariStyles.spacing.lg,
      borderBottom: `1px solid ${TavariStyles.colors.gray100}`
    },
    employeeTitle: {
      flex: 1
    },
    employeeName: {
      fontSize: TavariStyles.typography.fontSize.xl,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.xs
    },
    employeeNumber: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.bold
    },
    employeeBody: {
      marginBottom: TavariStyles.spacing.lg
    },
    employeeInfo: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm
    },
    infoRow: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray700
    },
    // NEW: Birthday and age section
    birthdaySection: {
      marginTop: TavariStyles.spacing.md,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.info + '10',
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      border: `1px solid ${TavariStyles.colors.info}30`
    },
    birthdayTitle: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray700,
      marginBottom: TavariStyles.spacing.sm,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs
    },
    // NEW: Student pay section
    studentPaySection: {
      marginTop: TavariStyles.spacing.md,
      padding: TavariStyles.spacing.md,
      backgroundColor: isStudentEligible() ? TavariStyles.colors.warning + '15' : TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      border: `1px solid ${isStudentEligible() ? TavariStyles.colors.warning + '40' : TavariStyles.colors.gray200}`
    },
    studentPayTitle: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray700,
      marginBottom: TavariStyles.spacing.sm,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs
    },
    // SIN section
    sinSection: {
      marginTop: TavariStyles.spacing.md,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray900 + '10',
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      border: `1px solid ${TavariStyles.colors.gray900}30`
    },
    sinTitle: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray700,
      marginBottom: TavariStyles.spacing.sm,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs
    },
    maskedSIN: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.mono || 'monospace',
      color: TavariStyles.colors.gray600,
      letterSpacing: '1px'
    },
    // Lieu time section
    lieuTimeSection: {
      marginTop: TavariStyles.spacing.md,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.primary + '10',
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      border: `1px solid ${TavariStyles.colors.primary}30`
    },
    lieuTimeTitle: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray700,
      marginBottom: TavariStyles.spacing.sm,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs
    },
    lieuTimeBalance: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.primary
    },
    lieuTimeWarning: {
      color: TavariStyles.colors.warning,
      backgroundColor: TavariStyles.colors.warningBg
    },
    premiumsSection: {
      marginTop: TavariStyles.spacing.md,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    premiumsTitle: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray700,
      marginBottom: TavariStyles.spacing.sm,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs
    },
    premiumItem: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.success,
      padding: '2px 6px',
      backgroundColor: TavariStyles.colors.successBg,
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      display: 'inline-block',
      margin: '2px',
      border: `1px solid ${TavariStyles.colors.success}30`
    },
    certificatesSection: {
      marginTop: TavariStyles.spacing.md,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.infoBg,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      border: `1px solid ${TavariStyles.colors.info}30`
    },
    certificatesTitle: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray700,
      marginBottom: TavariStyles.spacing.sm,
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs
    },
    certificateItem: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.info,
      padding: '2px 6px',
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius?.sm || '4px',
      display: 'inline-block',
      margin: '2px',
      border: `1px solid ${TavariStyles.colors.info}50`
    },
    expiredCertificate: {
      color: TavariStyles.colors.danger,
      backgroundColor: TavariStyles.colors.errorBg,
      border: `1px solid ${TavariStyles.colors.danger}50`
    },
    employeeActions: {
      display: 'flex',
      gap: TavariStyles.spacing.sm,
      paddingTop: TavariStyles.spacing.lg,
      borderTop: `1px solid ${TavariStyles.colors.gray100}`,
      flexWrap: 'wrap'
    },
    actionButton: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.xs,
      flex: 1,
      minWidth: '80px',
      padding: TavariStyles.spacing.sm,
      backgroundColor: TavariStyles.colors.gray100,
      color: TavariStyles.colors.gray700,
      border: `1px solid ${TavariStyles.colors.gray300}`,
      borderRadius: TavariStyles.borderRadius?.md || '6px',
      cursor: 'pointer',
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      justifyContent: 'center'
    },
    premiumButton: {
      backgroundColor: TavariStyles.colors.successBg,
      color: TavariStyles.colors.success,
      border: `1px solid ${TavariStyles.colors.success}50`
    },
    certificateButton: {
      backgroundColor: TavariStyles.colors.infoBg,
      color: TavariStyles.colors.info,
      border: `1px solid ${TavariStyles.colors.info}50`
    },
    lieuTimeButton: {
      backgroundColor: TavariStyles.colors.primary + '20',
      color: TavariStyles.colors.primary,
      border: `1px solid ${TavariStyles.colors.primary}50`
    },
    vacationPayButton: {
      backgroundColor: TavariStyles.colors.info + '20',
      color: TavariStyles.colors.info,
      border: `1px solid ${TavariStyles.colors.info}50`
    },
    birthdayButton: {
      backgroundColor: TavariStyles.colors.info + '15',
      color: TavariStyles.colors.info,
      border: `1px solid ${TavariStyles.colors.info}40`
    },
    sinButton: {
      backgroundColor: TavariStyles.colors.gray900 + '15',
      color: TavariStyles.colors.gray900,
      border: `1px solid ${TavariStyles.colors.gray900}40`
    },
    studentButton: {
      backgroundColor: TavariStyles.colors.warning + '15',
      color: TavariStyles.colors.warning,
      border: `1px solid ${TavariStyles.colors.warning}40`
    },
    auditButton: {
      backgroundColor: TavariStyles.colors.infoBg,
      color: TavariStyles.colors.info,
      border: `1px solid ${TavariStyles.colors.info}50`
    },
    terminateButton: {
      backgroundColor: TavariStyles.colors.warningBg,
      color: TavariStyles.colors.warning,
      border: `1px solid ${TavariStyles.colors.warning}50`
    },
    deleteButton: {
      backgroundColor: TavariStyles.colors.errorBg,
      color: TavariStyles.colors.danger,
      border: `1px solid ${TavariStyles.colors.danger}50`
    }
  };

  const age = calculateAge(employee.birth_date);
  const isStudentAge = isStudentEligible();

  return (
    <div style={styles.employeeCard}>
      <div style={styles.employeeHeader}>
        <div style={styles.employeeTitle}>
          <div style={styles.employeeName}>
            {employee.full_name}
          </div>
          <div style={styles.employeeNumber}>
            #{employee.employee_number}
          </div>
        </div>
        <div 
          style={{
            ...styles.statusBadge,
            backgroundColor: `${getStatusColor(employee.employment_status)}20`,
            color: getStatusColor(employee.employment_status),
            border: `1px solid ${getStatusColor(employee.employment_status)}40`
          }}
        >
          {employee.employment_status?.toUpperCase() || 'UNKNOWN'}
        </div>
      </div>

      <div style={styles.employeeBody}>
        <div style={styles.employeeInfo}>
          <div style={styles.infoRow}>
            <strong>Email:</strong> {employee.email}
          </div>
          {employee.phone && (
            <div style={styles.infoRow}>
              <strong>Phone:</strong> {employee.phone}
            </div>
          )}
          {employee.position && (
            <div style={styles.infoRow}>
              <strong>Position:</strong> {employee.position}
            </div>
          )}
          {employee.department && (
            <div style={styles.infoRow}>
              <strong>Department:</strong> {employee.department}
            </div>
          )}
          {employee.hire_date && (
            <div style={styles.infoRow}>
              <strong>Hire Date:</strong> {new Date(employee.hire_date).toLocaleDateString()}
            </div>
          )}
          {employee.probation_end_date && (
            <div style={styles.infoRow}>
              <strong>Probation Ends:</strong> {new Date(employee.probation_end_date).toLocaleDateString()}
            </div>
          )}
          {employee.termination_date && (
            <div style={styles.infoRow}>
              <strong>Termination Date:</strong> {new Date(employee.termination_date).toLocaleDateString()}
            </div>
          )}
          {employee.tenure && !employee.termination_date && (
            <div style={styles.infoRow}>
              <strong>Tenure:</strong> {employee.tenure}
            </div>
          )}
          {employee.wage && (
            <div style={styles.infoRow}>
              <strong>Base Wage:</strong> ${formatTaxAmount(employee.wage)}/hour
            </div>
          )}
          {employee.last_raise_date && (
            <div style={styles.infoRow}>
              <strong>Last Raise:</strong> {new Date(employee.last_raise_date).toLocaleDateString()}
            </div>
          )}
          
          {/* Display current vacation pay rate */}
          <div style={styles.infoRow}>
            <strong>Vacation Pay:</strong> {
              employee.vacation_percent 
                ? `${(employee.vacation_percent * 100).toFixed(1)}%`
                : `${employee.hire_date && new Date(employee.hire_date) < new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000) ? '6.0' : '4.0'}% (ESA Default)`
            }
            {employee.vacation_percent > (employee.hire_date && new Date(employee.hire_date) < new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000) ? 0.06 : 0.04) && 
              <span style={{color: TavariStyles.colors.success, fontSize: '11px', marginLeft: '4px'}}>
                (Company Benefit)
              </span>
            }
          </div>
        </div>

        {/* NEW: Birthday and Age Section */}
        {(employee.birth_date || canManageEmployees()) && (
          <div style={styles.birthdaySection}>
            <div style={styles.birthdayTitle}>
              <User size={16} />
              Birthday & Age Information
            </div>
            {employee.birth_date ? (
              <div>
                <div style={{fontSize: TavariStyles.typography.fontSize.sm, color: TavariStyles.colors.gray700}}>
                  <strong>Birthday:</strong> {new Date(employee.birth_date).toLocaleDateString()}
                </div>
                <div style={{fontSize: TavariStyles.typography.fontSize.sm, color: TavariStyles.colors.gray700, marginTop: '2px'}}>
                  <strong>Age:</strong> {age} years old
                  {isStudentAge && <span style={{color: TavariStyles.colors.warning, marginLeft: '8px'}}>⚠️ Student Age</span>}
                </div>
              </div>
            ) : (
              <div style={{fontSize: TavariStyles.typography.fontSize.sm, color: TavariStyles.colors.gray500}}>
                Birthday not set - Click 'Birthday' button to add
              </div>
            )}
          </div>
        )}

        {/* NEW: Student Pay Status Section */}
        <div style={styles.studentPaySection}>
          <div style={styles.studentPayTitle}>
            <GraduationCap size={16} />
            Student Minimum Wage Status
          </div>
          <div style={{fontSize: TavariStyles.typography.fontSize.sm}}>
            <div style={{color: TavariStyles.colors.gray700}}>
              <strong>Eligible for Student Rate:</strong> {isStudentAge ? 'YES (Under 18)' : 'NO (18 or older)'}
            </div>
            <div style={{color: TavariStyles.colors.gray700, marginTop: '2px'}}>
              <strong>Student Pay Enabled:</strong> {
                employee.student_pay_enabled 
                  ? <span style={{color: TavariStyles.colors.success}}>Enabled</span>
                  : <span style={{color: TavariStyles.colors.warning}}>Disabled</span>
              }
            </div>
            {isStudentAge && employee.student_pay_enabled && (
              <div style={{
                marginTop: '4px', 
                padding: '4px 8px', 
                backgroundColor: TavariStyles.colors.warning + '20',
                borderRadius: '4px',
                color: TavariStyles.colors.warning,
                fontSize: TavariStyles.typography.fontSize.xs,
                fontWeight: 'bold'
              }}>
                📚 Currently receives student minimum wage rate
              </div>
            )}
          </div>
        </div>

        {/* NEW: SIN Number Section (Manager Only) */}
        {canManageEmployees() && (
          <div style={styles.sinSection}>
            <div style={styles.sinTitle}>
              <Shield size={16} />
              SIN Number (Restricted Access)
            </div>
            <div style={styles.maskedSIN}>
              {employee.sin_number ? '•••-•••-•••' : 'Not provided'}
            </div>
            <div style={{
              fontSize: TavariStyles.typography.fontSize.xs,
              color: TavariStyles.colors.gray600,
              marginTop: TavariStyles.spacing.xs
            }}>
              Click 'SIN' button to view/edit with manager PIN verification
            </div>
          </div>
        )}

        {/* Lieu Time Section */}
        {employee.lieu_time_enabled && (
          <div style={employee.lieu_time_balance >= 40 ? {...styles.lieuTimeSection, ...styles.lieuTimeWarning} : styles.lieuTimeSection}>
            <div style={styles.lieuTimeTitle}>
              <Clock size={16} />
              Lieu Time Balance
            </div>
            <div style={styles.lieuTimeBalance}>
              {formatTaxAmount(employee.lieu_time_balance || 0)} hours
              {employee.lieu_time_balance >= 40 && ' ⚠️ HIGH BALANCE'}
            </div>
            <div style={{
              fontSize: TavariStyles.typography.fontSize.xs,
              color: TavariStyles.colors.gray600,
              marginTop: TavariStyles.spacing.xs
            }}>
              Max Paid: {employee.max_paid_hours_per_period || 'Not set'} hours/period
            </div>
          </div>
        )}

        {/* Premiums Section */}
        {employee.active_premiums && employee.active_premiums.length > 0 && (
          <div style={styles.premiumsSection}>
            <div style={styles.premiumsTitle}>
              <DollarSign size={16} />
              Active Premiums ({employee.active_premiums.length})
            </div>
            <div>
              {employee.active_premiums.map((premiumAssignment) => (
                <span key={premiumAssignment.id} style={styles.premiumItem}>
                  {premiumAssignment.premium.name} 
                  {premiumAssignment.premium.rate_type === 'fixed_amount' 
                    ? ` +$${formatTaxAmount(premiumAssignment.premium.rate)}`
                    : ` +${premiumAssignment.premium.rate}%`
                  }
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Certificates Section */}
        {employee.active_certificates && employee.active_certificates.length > 0 && (
          <div style={styles.certificatesSection}>
            <div style={styles.certificatesTitle}>
              <Award size={16} />
              Certificates ({employee.active_certificates.length})
            </div>
            <div>
              {employee.active_certificates.map((certAssignment) => (
                <span 
                  key={certAssignment.id} 
                  style={{
                    ...styles.certificateItem,
                    ...(certAssignment.is_expired ? styles.expiredCertificate : {})
                  }}
                  title={certAssignment.is_expired 
                    ? `Expired ${Math.abs(certAssignment.days_until_expiry)} days ago`
                    : certAssignment.days_until_expiry > 0 
                      ? `Expires in ${certAssignment.days_until_expiry} days`
                      : 'Valid'
                  }
                >
                  {certAssignment.certificate.name}
                  {certAssignment.is_expired && ' (EXPIRED)'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Employee Actions */}
      <div style={styles.employeeActions}>
        <button
          onClick={() => onViewEmployee(employee)}
          style={styles.actionButton}
          title="View Employee"
        >
          <Eye size={16} />
          View
        </button>
        
        {canManageEmployees() && (
          <>
            <button
              onClick={() => onManagePremiums(employee)}
              style={{...styles.actionButton, ...styles.premiumButton}}
              title="Manage Premiums"
            >
              <DollarSign size={16} />
              Premiums
            </button>
            
            <button
              onClick={() => onManageCertificates(employee)}
              style={{...styles.actionButton, ...styles.certificateButton}}
              title="Manage Certificates"
            >
              <Award size={16} />
              Certificates
            </button>

            {/* Lieu Time button - only show if lieu time is enabled */}
            {employee.lieu_time_enabled && (
              <button
                onClick={() => onManageLieuTime(employee)}
                style={{...styles.actionButton, ...styles.lieuTimeButton}}
                title="Manage Lieu Time"
              >
                <Clock size={16} />
                Lieu Time
              </button>
            )}

            {/* Vacation Pay button */}
            <button
              onClick={() => onManageVacationPay(employee)}
              style={{...styles.actionButton, ...styles.vacationPayButton}}
              title="Manage Vacation Pay"
            >
              <Calendar size={16} />
              Vacation
            </button>

            {/* NEW: Birthday Management Button */}
            <button
              onClick={() => onManageBirthday && onManageBirthday(employee)}
              style={{...styles.actionButton, ...styles.birthdayButton}}
              title="Manage Birthday & Age"
            >
              <User size={16} />
              Birthday
            </button>

            {/* NEW: SIN Management Button */}
            <button
              onClick={() => onManageSIN && onManageSIN(employee)}
              style={{...styles.actionButton, ...styles.sinButton}}
              title="Manage SIN Number (Requires Manager PIN)"
            >
              <Shield size={16} />
              SIN
            </button>

            {/* NEW: Student Pay Toggle Button */}
            <button
              onClick={() => onToggleStudentPay && onToggleStudentPay(employee)}
              style={{...styles.actionButton, ...styles.studentButton}}
              title="Toggle Student Minimum Wage"
            >
              <GraduationCap size={16} />
              Student Pay
            </button>
          </>
        )}
        
        {canViewAuditHistory() && (
          <button
            onClick={() => onViewAuditHistory(employee)}
            style={{...styles.actionButton, ...styles.auditButton}}
            title="View Change History"
          >
            <Clock size={16} />
            History
          </button>
        )}
        
        {canManageEmployees() && (
          <>
            <button
              onClick={() => onEditEmployee(employee)}
              style={styles.actionButton}
              title="Edit Employee"
            >
              <Edit size={16} />
              Edit
            </button>
            
            {employee.employment_status !== 'terminated' && (
              <button
                onClick={() => onTerminateEmployee(employee)}
                style={{...styles.actionButton, ...styles.terminateButton}}
                title="Terminate Employee"
              >
                <X size={16} />
                Terminate
              </button>
            )}
            
            <button
              onClick={() => onDeleteEmployee(employee)}
              style={{...styles.actionButton, ...styles.deleteButton}}
              title="Delete Employee"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeCard;