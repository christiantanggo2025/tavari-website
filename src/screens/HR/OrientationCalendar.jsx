import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import ScheduleOrientationModal from './ScheduleOrientationModal';

const OrientationCalendar = () => {
  const navigate = useNavigate();

  // Authentication state
  const [authUser, setAuthUser] = useState(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Component state
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [dashboardSummary, setDashboardSummary] = useState(null);

  // Authentication setup (same pattern as TabScreen)
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('OrientationCalendar: Initializing authentication...');
        
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session?.user) {
          console.error('OrientationCalendar: No valid session');
          navigate('/login');
          return;
        }

        setAuthUser(session.user);
        console.log('OrientationCalendar: Authenticated as:', session.user.email);

        const currentBusinessId = localStorage.getItem('currentBusinessId');
        console.log('OrientationCalendar: Business ID from localStorage:', currentBusinessId);

        if (!currentBusinessId) {
          setAuthError('No business selected');
          return;
        }

        setSelectedBusinessId(currentBusinessId);

        // Verify user has access to this business
        const { data: userRole, error: roleError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('business_id', currentBusinessId)
          .eq('active', true)
          .single();

        if (roleError || !userRole) {
          console.error('OrientationCalendar: User not authorized for this business:', roleError);
          setAuthError('Not authorized for this business');
          return;
        }

        console.log('OrientationCalendar: User role verified:', userRole.role);
        setAuthLoading(false);

      } catch (err) {
        console.error('OrientationCalendar: Authentication error:', err);
        setAuthError(err.message);
        setAuthLoading(false);
      }
    };

    initializeAuth();
  }, [navigate]);

  // Load orientation data
  useEffect(() => {
    if (!authUser || !selectedBusinessId) return;
    loadOrientationData();
    loadDashboardSummary();
  }, [authUser, selectedBusinessId, selectedDate]);

  const loadOrientationData = async () => {
    setLoading(true);
    try {
      const startDate = new Date(selectedDate);
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 30);

      console.log('Loading orientation data for business:', selectedBusinessId);

      const { data, error } = await supabase.rpc('get_orientation_calendar_events', {
        p_business_id: selectedBusinessId,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0]
      });

      if (error) {
        console.error('Orientation data error:', error);
        // Don't throw error, just log it and continue with empty data
        setSessions([]);
      } else {
        console.log('Orientation data loaded:', data);
        setSessions(data || []);
      }
    } catch (error) {
      console.error('Error loading orientation data:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardSummary = async () => {
    try {
      console.log('Loading dashboard summary for business:', selectedBusinessId);
      
      const { data, error } = await supabase.rpc('get_orientation_dashboard_summary', {
        p_business_id: selectedBusinessId
      });

      if (error) {
        console.error('Dashboard summary error:', error);
        // Set default values instead of throwing error
        setDashboardSummary({
          upcoming_sessions: 0,
          total_registered: 0,
          pending_attendance: 0,
          completed_orientations: 0,
          next_session_date: null,
          next_session_title: null,
          available_spots_next: 0
        });
      } else {
        console.log('Dashboard summary loaded:', data);
        if (data && data.length > 0) {
          setDashboardSummary(data[0]);
        } else {
          setDashboardSummary({
            upcoming_sessions: 0,
            total_registered: 0,
            pending_attendance: 0,
            completed_orientations: 0,
            next_session_date: null,
            next_session_title: null,
            available_spots_next: 0
          });
        }
      }
    } catch (error) {
      console.error('Error loading dashboard summary:', error);
      setDashboardSummary({
        upcoming_sessions: 0,
        total_registered: 0,
        pending_attendance: 0,
        completed_orientations: 0,
        next_session_date: null,
        next_session_title: null,
        available_spots_next: 0
      });
    }
  };

  const handleCreateSession = () => {
    setSelectedSession(null);
    setShowCreateModal(true);
  };

  const handleScheduleEmployee = (session) => {
    setSelectedSession(session);
    setShowScheduleModal(true);
  };

  const handleViewAttendees = (session) => {
    navigate(`/dashboard/hr/orientation/attendance/${session.event_id}`);
  };

  const handleBackToHR = () => {
    navigate('/dashboard/hr/dashboard');
  };

  const getNextWeekDates = () => {
    const dates = [];
    const start = new Date(selectedDate);
    const startOfWeek = new Date(start.setDate(start.getDate() - start.getDay()));
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getSessionsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return sessions.filter(session => session.event_date === dateStr);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Loading state
  if (authLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <h3>Loading Orientation Calendar...</h3>
          <p>Authenticating user and loading data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (authError) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h3>Authentication Error</h3>
          <p>{authError}</p>
          <button 
            style={styles.backButton}
            onClick={handleBackToHR}
          >
            Back to HR Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Orientation Calendar</h1>
          <button 
            style={styles.backButton}
            onClick={handleBackToHR}
          >
            ← Back to HR Dashboard
          </button>
        </div>
        <button 
          style={styles.createButton}
          onClick={handleCreateSession}
        >
          Create Session
        </button>
      </div>

      {/* Dashboard Summary */}
      {dashboardSummary && (
        <div style={styles.summaryCards}>
          <div style={styles.summaryCard}>
            <div style={styles.cardTitle}>Upcoming Sessions</div>
            <div style={styles.cardValue}>{dashboardSummary.upcoming_sessions || 0}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.cardTitle}>Total Registered</div>
            <div style={styles.cardValue}>{dashboardSummary.total_registered || 0}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.cardTitle}>Pending Attendance</div>
            <div style={styles.cardValue}>{dashboardSummary.pending_attendance || 0}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.cardTitle}>Completed</div>
            <div style={styles.cardValue}>{dashboardSummary.completed_orientations || 0}</div>
          </div>
        </div>
      )}

      {/* Date Navigation */}
      <div style={styles.dateNavigation}>
        <button 
          style={styles.navButton}
          onClick={() => {
            const newDate = new Date(selectedDate);
            newDate.setDate(newDate.getDate() - 7);
            setSelectedDate(newDate.toISOString().split('T')[0]);
          }}
        >
          ← Previous Week
        </button>
        
        <input
          type="date"
          style={styles.dateInput}
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        
        <button 
          style={styles.navButton}
          onClick={() => {
            const newDate = new Date(selectedDate);
            newDate.setDate(newDate.getDate() + 7);
            setSelectedDate(newDate.toISOString().split('T')[0]);
          }}
        >
          Next Week →
        </button>
      </div>

      {/* Calendar Grid */}
      <div style={styles.calendarContainer}>
        {loading ? (
          <div style={styles.loadingMessage}>Loading sessions...</div>
        ) : (
          <div style={styles.weekGrid}>
            {getNextWeekDates().map((date, index) => {
              const daysSessions = getSessionsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <div key={index} style={{
                  ...styles.dayColumn,
                  backgroundColor: isToday ? '#f0f9ff' : 'white'
                }}>
                  <div style={styles.dayHeader}>
                    <div style={styles.dayName}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div style={styles.dayNumber}>
                      {date.getDate()}
                    </div>
                  </div>
                  
                  <div style={styles.sessionsContainer}>
                    {daysSessions.map((session) => (
                      <div 
                        key={session.event_id} 
                        style={{
                          ...styles.sessionCard,
                          backgroundColor: session.attendee_count >= session.max_attendees ? '#fee2e2' : '#f0fdf4'
                        }}
                      >
                        <div style={styles.sessionTime}>
                          {formatTime(session.start_time)}
                        </div>
                        <div style={styles.sessionTitle}>
                          {session.title}
                        </div>
                        <div style={styles.sessionInfo}>
                          {session.attendee_count}/{session.max_attendees} attendees
                        </div>
                        {session.location && (
                          <div style={styles.sessionLocation}>
                            📍 {session.location}
                          </div>
                        )}
                        
                        <div style={styles.sessionActions}>
                          <button
                            style={styles.actionButton}
                            onClick={() => handleScheduleEmployee(session)}
                          >
                            Schedule
                          </button>
                          <button
                            style={styles.actionButton}
                            onClick={() => handleViewAttendees(session)}
                          >
                            Attendees
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {daysSessions.length === 0 && (
                      <div style={styles.noSessions}>
                        No sessions scheduled
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Next Session Highlight */}
      {dashboardSummary?.next_session_date && (
        <div style={styles.nextSessionCard}>
          <h3 style={styles.nextSessionTitle}>Next Session</h3>
          <div style={styles.nextSessionInfo}>
            <strong>{dashboardSummary.next_session_title}</strong>
            <br />
            {new Date(dashboardSummary.next_session_date).toLocaleDateString()}
            <br />
            {dashboardSummary.available_spots_next} spots available
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>Create Orientation Session</h3>
              <button onClick={() => setShowCreateModal(false)} style={styles.modalClose}>×</button>
            </div>
            <div style={styles.modalContent}>
              <p>Create session functionality will be implemented in a future step.</p>
              <p>For now, you can create sessions directly in the database.</p>
              <button 
                style={styles.createButton} 
                onClick={() => setShowCreateModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && selectedSession && (
        <ScheduleOrientationModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          businessId={selectedBusinessId}
          selectedSession={selectedSession}
          onEmployeeScheduled={() => {
            setShowScheduleModal(false);
            loadOrientationData();
            loadDashboardSummary();
          }}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '60px 20px 20px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px',
    textAlign: 'center'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px',
    textAlign: 'center',
    color: '#dc2626'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 10px 0'
  },
  createButton: {
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  backButton: {
    backgroundColor: 'white',
    border: '2px solid #008080',
    borderRadius: '6px',
    padding: '8px 16px',
    color: '#008080',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '30px'
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    textAlign: 'center'
  },
  cardTitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px'
  },
  cardValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937'
  },
  dateNavigation: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '30px'
  },
  navButton: {
    backgroundColor: 'white',
    border: '2px solid #008080',
    borderRadius: '6px',
    padding: '8px 16px',
    color: '#008080',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  dateInput: {
    padding: '8px 12px',
    border: '2px solid #008080',
    borderRadius: '6px',
    fontSize: '16px'
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden'
  },
  loadingMessage: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280'
  },
  weekGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    minHeight: '400px'
  },
  dayColumn: {
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column'
  },
  dayHeader: {
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    textAlign: 'center',
    backgroundColor: '#f8f9fa'
  },
  dayName: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: 'bold'
  },
  dayNumber: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: '4px'
  },
  sessionsContainer: {
    flex: 1,
    padding: '8px'
  },
  sessionCard: {
    padding: '8px',
    borderRadius: '6px',
    marginBottom: '8px',
    border: '1px solid #d1d5db'
  },
  sessionTime: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#374151'
  },
  sessionTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: '4px'
  },
  sessionInfo: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px'
  },
  sessionLocation: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px'
  },
  sessionActions: {
    display: 'flex',
    gap: '4px',
    marginTop: '8px'
  },
  actionButton: {
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '11px',
    cursor: 'pointer',
    flex: 1
  },
  noSessions: {
    color: '#9ca3af',
    fontSize: '12px',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px'
  },
  nextSessionCard: {
    backgroundColor: '#f0f9ff',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    padding: '20px',
    marginTop: '30px',
    textAlign: 'center'
  },
  nextSessionTitle: {
    margin: '0 0 10px 0',
    color: '#1e40af'
  },
  nextSessionInfo: {
    color: '#374151',
    lineHeight: '1.5'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    maxWidth: '500px',
    width: '90%',
    overflow: 'hidden'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f8f9fa'
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer'
  },
  modalContent: {
    padding: '20px'
  }
};

export default OrientationCalendar;