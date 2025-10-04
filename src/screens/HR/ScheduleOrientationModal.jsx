import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const ScheduleOrientationModal = ({ 
  isOpen, 
  onClose, 
  businessId, 
  selectedSession,
  onEmployeeScheduled 
}) => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState({});
  const [sessionDetails, setSessionDetails] = useState(null);
  const [currentAttendees, setCurrentAttendees] = useState([]);

  useEffect(() => {
    if (isOpen && businessId && selectedSession) {
      loadAvailableEmployees();
      loadSessionDetails();
      loadCurrentAttendees();
      setSelectedEmployees([]);
      setSearchTerm('');
      setErrors({});
    }
  }, [isOpen, businessId, selectedSession]);

  const loadAvailableEmployees = async () => {
    try {
      console.log('Loading employees for business:', businessId);
      
      // Get all active employees with business_users relationship
      const { data: allEmployees, error: allError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          department,
          hire_date,
          employment_status,
          business_users!inner(business_id)
        `)
        .eq('business_users.business_id', businessId)
        .eq('employment_status', 'active');

      if (allError) {
        console.error('Error loading all employees:', allError);
        throw allError;
      }

      console.log('All employees loaded:', allEmployees?.length);

      // Get employees already registered for this session
      const { data: registeredEmployees, error: regError } = await supabase
        .from('orientation_attendees')
        .select('employee_id')
        .eq('session_id', selectedSession.event_id);

      if (regError) {
        console.error('Error loading registered employees:', regError);
        // Don't throw error here, just log it
      }

      const registeredIds = registeredEmployees ? registeredEmployees.map(r => r.employee_id) : [];
      console.log('Registered employee IDs:', registeredIds);

      // Filter out already registered employees
      const availableEmployees = allEmployees ? allEmployees.filter(emp => 
        !registeredIds.includes(emp.id)
      ) : [];

      console.log('Available employees:', availableEmployees?.length);
      setEmployees(availableEmployees);

    } catch (error) {
      console.error('Error loading employees:', error);
      setErrors({ general: 'Failed to load employees' });
      setEmployees([]);
    }
  };

  const loadSessionDetails = async () => {
    try {
      console.log('Loading session details for:', selectedSession.event_id);
      
      const { data, error } = await supabase
        .from('orientation_sessions')
        .select('*')
        .eq('id', selectedSession.event_id)
        .single();

      if (error) {
        console.error('Error loading session details:', error);
        throw error;
      }
      
      console.log('Session details loaded:', data);
      setSessionDetails(data);
    } catch (error) {
      console.error('Error loading session details:', error);
      setSessionDetails(null);
    }
  };

  const loadCurrentAttendees = async () => {
    try {
      console.log('Loading current attendees for session:', selectedSession.event_id);
      
      const { data, error } = await supabase.rpc('get_orientation_attendees', {
        p_session_id: selectedSession.event_id,
        p_business_id: businessId
      });

      if (error) {
        console.error('Error loading current attendees:', error);
        // Don't throw error, just set empty array
        setCurrentAttendees([]);
      } else {
        console.log('Current attendees loaded:', data?.length);
        setCurrentAttendees(data || []);
      }
    } catch (error) {
      console.error('Error loading current attendees:', error);
      setCurrentAttendees([]);
    }
  };

  const handleEmployeeToggle = (employeeId) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
    // Clear any previous errors
    if (errors.general) {
      setErrors({});
    }
  };

  const handleScheduleEmployees = async () => {
    if (selectedEmployees.length === 0) {
      setErrors({ general: 'Please select at least one employee' });
      return;
    }

    // Check if adding these employees would exceed capacity
    const newTotal = currentAttendees.length + selectedEmployees.length;
    if (sessionDetails && newTotal > sessionDetails.max_attendees) {
      setErrors({ 
        general: `Cannot add ${selectedEmployees.length} employees. Only ${sessionDetails.max_attendees - currentAttendees.length} spots available.` 
      });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const currentUser = await supabase.auth.getUser();
      const registeredBy = currentUser.data.user?.id;

      if (!registeredBy) {
        throw new Error('User authentication required');
      }

      console.log(`Scheduling ${selectedEmployees.length} employees for orientation`);

      const results = await Promise.all(
        selectedEmployees.map(async (employeeId) => {
          console.log('Scheduling employee:', employeeId);
          
          const { data, error } = await supabase.rpc('schedule_employee_orientation', {
            p_business_id: businessId,
            p_employee_id: employeeId,
            p_session_id: selectedSession.event_id,
            p_registered_by: registeredBy
          });

          if (error) {
            console.error('Error scheduling employee:', employeeId, error);
            throw error;
          }
          
          console.log('Successfully scheduled employee:', employeeId, 'Result:', data);
          return { employeeId, success: true, data };
        })
      );

      const successCount = results.filter(r => r.success).length;
      
      console.log(`Successfully scheduled ${successCount} employees for orientation`);
      
      // Call the callback to refresh parent data
      if (onEmployeeScheduled) {
        onEmployeeScheduled();
      }
      
      // Close the modal
      onClose();
      
    } catch (error) {
      console.error('Error scheduling employees:', error);
      setErrors({ general: `Failed to schedule employees: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(employee => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${employee.first_name} ${employee.last_name}`.toLowerCase();
    const department = (employee.department || '').toLowerCase();
    return fullName.includes(searchLower) || department.includes(searchLower);
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Schedule Employees for Orientation</h2>
          <button onClick={onClose} style={styles.modalClose}>×</button>
        </div>

        <div style={styles.modalContent}>
          {/* Session Info */}
          {selectedSession && sessionDetails && (
            <div style={styles.sessionInfo}>
              <h3 style={styles.sectionTitle}>Session Details</h3>
              <div style={styles.sessionDetails}>
                <div><strong>Title:</strong> {sessionDetails.title}</div>
                <div><strong>Date:</strong> {formatDate(selectedSession.event_date)}</div>
                <div><strong>Time:</strong> {formatTime(selectedSession.start_time)} - {formatTime(selectedSession.end_time)}</div>
                {sessionDetails.location && (
                  <div><strong>Location:</strong> {sessionDetails.location}</div>
                )}
                <div><strong>Capacity:</strong> {currentAttendees.length}/{sessionDetails.max_attendees}</div>
                <div><strong>Available Spots:</strong> {Math.max(0, sessionDetails.max_attendees - currentAttendees.length)}</div>
              </div>
            </div>
          )}

          {/* Current Attendees */}
          {currentAttendees.length > 0 && (
            <div style={styles.currentAttendees}>
              <h4 style={styles.subTitle}>Currently Registered ({currentAttendees.length})</h4>
              <div style={styles.attendeesList}>
                {currentAttendees.map((attendee) => (
                  <div key={attendee.attendee_id} style={styles.attendeeItem}>
                    <span>{attendee.employee_name}</span>
                    <span style={styles.attendeeStatus}>
                      {attendee.registration_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employee Search */}
          <div style={styles.searchSection}>
            <h3 style={styles.sectionTitle}>Select Employees to Schedule</h3>
            <input
              type="text"
              style={styles.searchInput}
              placeholder="Search employees by name or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Employee List */}
          <div style={styles.employeeList}>
            {filteredEmployees.length === 0 ? (
              <div style={styles.noEmployees}>
                {employees.length === 0 
                  ? 'No available employees to schedule'
                  : searchTerm 
                    ? 'No employees match your search' 
                    : 'No employees available'
                }
              </div>
            ) : (
              filteredEmployees.map((employee) => {
                const isSelected = selectedEmployees.includes(employee.id);
                return (
                  <div 
                    key={employee.id} 
                    style={{
                      ...styles.employeeItem,
                      backgroundColor: isSelected ? '#e0f2fe' : 'white'
                    }}
                    onClick={() => handleEmployeeToggle(employee.id)}
                  >
                    <div style={styles.employeeInfo}>
                      <div style={styles.employeeName}>
                        {employee.first_name} {employee.last_name}
                      </div>
                      {employee.department && (
                        <div style={styles.employeeDepartment}>
                          {employee.department}
                        </div>
                      )}
                      {employee.hire_date && (
                        <div style={styles.employeeHireDate}>
                          Hired: {new Date(employee.hire_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div style={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by onClick on parent
                        style={styles.checkboxInput}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Count */}
          {selectedEmployees.length > 0 && (
            <div style={styles.selectedCount}>
              Selected: {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''}
            </div>
          )}

          {/* Error Display */}
          {errors.general && (
            <div style={styles.errorMessage}>
              {errors.general}
            </div>
          )}

          {/* Form Actions */}
          <div style={styles.formActions}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleScheduleEmployees}
              disabled={loading || selectedEmployees.length === 0}
              style={{
                ...styles.scheduleButton,
                opacity: (loading || selectedEmployees.length === 0) ? 0.5 : 1
              }}
            >
              {loading ? 'Scheduling...' : `Schedule ${selectedEmployees.length} Employee${selectedEmployees.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f8f9fa'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  modalContent: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1
  },
  sessionInfo: {
    backgroundColor: '#f0f9ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 12px 0'
  },
  subTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    margin: '0 0 8px 0'
  },
  sessionDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '8px',
    fontSize: '14px',
    color: '#374151'
  },
  currentAttendees: {
    marginBottom: '20px'
  },
  attendeesList: {
    maxHeight: '100px',
    overflowY: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    backgroundColor: '#f9fafb'
  },
  attendeeItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '14px',
    cursor: 'pointer'
  },
  attendeeStatus: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'capitalize'
  },
  searchSection: {
    marginBottom: '20px'
  },
  searchInput: {
    width: '100%',
    padding: '12px',
    border: '2px solid #008080',
    borderRadius: '6px',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  employeeList: {
    maxHeight: '300px',
    overflowY: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#f9fafb',
    marginBottom: '15px'
  },
  noEmployees: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic'
  },
  employeeItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  employeeInfo: {
    flex: 1
  },
  employeeName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937'
  },
  employeeDepartment: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '2px'
  },
  employeeHireDate: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '2px'
  },
  checkbox: {
    marginLeft: '12px'
  },
  checkboxInput: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  selectedCount: {
    backgroundColor: '#e0f2fe',
    border: '1px solid #0284c7',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    color: '#0c4a6e',
    marginBottom: '15px',
    textAlign: 'center'
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '15px',
    fontSize: '14px'
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    paddingTop: '15px',
    borderTop: '1px solid #e5e7eb'
  },
  cancelButton: {
    padding: '12px 20px',
    backgroundColor: 'white',
    color: '#374151',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  scheduleButton: {
    padding: '12px 20px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};

export default ScheduleOrientationModal;