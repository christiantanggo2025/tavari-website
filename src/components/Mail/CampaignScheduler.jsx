// components/Mail/CampaignScheduler.jsx - Step 101: Campaign Scheduling Preparation
import React, { useState, useEffect } from 'react';
import { 
  FiClock, FiCalendar, FiGlobe, FiSend, FiSave, FiX, FiCheck, 
  FiAlertTriangle, FiRefreshCw, FiSettings, FiUsers, FiEdit3 
} from 'react-icons/fi';

const CampaignScheduler = ({ campaign, isOpen, onClose, onSchedule, businessTimezone = 'America/Toronto' }) => {
  const [scheduleType, setScheduleType] = useState('send_now'); // 'send_now', 'send_later', 'recurring'
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [timezone, setTimezone] = useState(businessTimezone);
  const [recurringSettings, setRecurringSettings] = useState({
    frequency: 'weekly', // 'weekly', 'monthly', 'custom'
    interval: 1,
    daysOfWeek: [],
    endDate: '',
    maxSends: null
  });
  const [optimizeSendTime, setOptimizeSendTime] = useState(false);
  const [sendTimeRecommendations, setSendTimeRecommendations] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewTimes, setPreviewTimes] = useState([]);

  // Common timezones for businesses
  const commonTimezones = [
    { value: 'America/Toronto', label: 'Eastern Time (Toronto)' },
    { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },
    { value: 'America/Edmonton', label: 'Mountain Time (Calgary/Edmonton)' },
    { value: 'America/Winnipeg', label: 'Central Time (Winnipeg)' },
    { value: 'America/Halifax', label: 'Atlantic Time (Halifax)' },
    { value: 'America/St_Johns', label: 'Newfoundland Time (St. Johns)' },
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' }
  ];

  // Days of the week for recurring campaigns
  const daysOfWeek = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  useEffect(() => {
    if (isOpen) {
      loadSendTimeRecommendations();
      setDefaultDateTime();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scheduleType === 'recurring') {
      generatePreviewTimes();
    }
  }, [recurringSettings, scheduledDate, scheduledTime]);

  const setDefaultDateTime = () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Set default to tomorrow at 10 AM
    const defaultDate = tomorrow.toISOString().split('T')[0];
    const defaultTime = '10:00';
    
    setScheduledDate(defaultDate);
    setScheduledTime(defaultTime);
  };

  const loadSendTimeRecommendations = async () => {
    // Simulate loading optimal send times based on audience engagement data
    const recommendations = [
      {
        time: '10:00',
        day: 'tuesday',
        engagement_score: 92,
        reason: 'Highest open rates in your industry'
      },
      {
        time: '14:00',
        day: 'thursday',
        engagement_score: 88,
        reason: 'Peak engagement time for your audience'
      },
      {
        time: '09:00',
        day: 'wednesday',
        engagement_score: 85,
        reason: 'High click-through rates historically'
      }
    ];
    
    setSendTimeRecommendations(recommendations);
  };

  const generatePreviewTimes = () => {
    if (scheduleType !== 'recurring' || !scheduledDate || !scheduledTime) {
      setPreviewTimes([]);
      return;
    }

    const startDate = new Date(`${scheduledDate}T${scheduledTime}`);
    const previews = [];
    let currentDate = new Date(startDate);

    // Generate next 5 send times for preview
    for (let i = 0; i < 5; i++) {
      if (recurringSettings.frequency === 'weekly') {
        if (i > 0) {
          currentDate = new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000));
        }
      } else if (recurringSettings.frequency === 'monthly') {
        if (i > 0) {
          currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
        }
      }

      previews.push({
        date: currentDate.toISOString().split('T')[0],
        time: scheduledTime,
        formatted: formatScheduleDateTime(currentDate, scheduledTime, timezone)
      });
    }

    setPreviewTimes(previews);
  };

  const formatScheduleDateTime = (date, time, tz) => {
    try {
      const dateTime = new Date(`${date.toISOString().split('T')[0]}T${time}`);
      return new Intl.DateTimeFormat('en-CA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: tz
      }).format(dateTime);
    } catch (error) {
      return 'Invalid date/time';
    }
  };

  const validateSchedule = () => {
    const errors = [];
    const now = new Date();

    if (scheduleType === 'send_later' || scheduleType === 'recurring') {
      if (!scheduledDate) {
        errors.push('Schedule date is required');
      } else {
        const scheduleDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        if (scheduleDateTime <= now) {
          errors.push('Schedule time must be in the future');
        }
        
        // Check if it's too far in the future (1 year)
        const oneYearFromNow = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
        if (scheduleDateTime > oneYearFromNow) {
          errors.push('Schedule time cannot be more than 1 year in the future');
        }
      }

      if (!scheduledTime) {
        errors.push('Schedule time is required');
      }
    }

    if (scheduleType === 'recurring') {
      if (recurringSettings.daysOfWeek.length === 0 && recurringSettings.frequency === 'weekly') {
        errors.push('Select at least one day of the week for weekly recurring campaigns');
      }

      if (recurringSettings.endDate) {
        const endDate = new Date(recurringSettings.endDate);
        const startDate = new Date(`${scheduledDate}T${scheduledTime}`);
        if (endDate <= startDate) {
          errors.push('End date must be after the start date');
        }
      }

      if (!recurringSettings.endDate && !recurringSettings.maxSends) {
        errors.push('Specify either an end date or maximum number of sends for recurring campaigns');
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSchedule = async () => {
    if (!validateSchedule()) {
      return;
    }

    setLoading(true);
    try {
      const scheduleData = {
        type: scheduleType,
        campaign_id: campaign.id,
        timezone: timezone
      };

      if (scheduleType === 'send_later') {
        scheduleData.scheduled_for = `${scheduledDate}T${scheduledTime}`;
      } else if (scheduleType === 'recurring') {
        scheduleData.scheduled_for = `${scheduledDate}T${scheduledTime}`;
        scheduleData.recurring_settings = {
          ...recurringSettings,
          next_send_times: previewTimes.map(p => `${p.date}T${p.time}`)
        };
      }

      if (optimizeSendTime && sendTimeRecommendations.length > 0) {
        scheduleData.optimization = {
          enabled: true,
          recommended_time: sendTimeRecommendations[0].time,
          reason: sendTimeRecommendations[0].reason
        };
      }

      await onSchedule(scheduleData);
      onClose();
    } catch (error) {
      console.error('Error scheduling campaign:', error);
      setValidationErrors(['Failed to schedule campaign. Please try again.']);
    } finally {
      setLoading(false);
    }
  };

  const applyRecommendedTime = (recommendation) => {
    setScheduledTime(recommendation.time);
    setOptimizeSendTime(true);
  };

  const handleDayOfWeekToggle = (day) => {
    const updatedDays = recurringSettings.daysOfWeek.includes(day)
      ? recurringSettings.daysOfWeek.filter(d => d !== day)
      : [...recurringSettings.daysOfWeek, day];
    
    setRecurringSettings(prev => ({
      ...prev,
      daysOfWeek: updatedDays
    }));
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Schedule Campaign</h2>
          <div style={styles.headerInfo}>
            <span style={styles.campaignName}>{campaign?.name}</span>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div style={styles.content}>
          {/* Schedule Type Selection */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>When to Send</h3>
            <div style={styles.scheduleTypes}>
              <label style={styles.scheduleType}>
                <input
                  type="radio"
                  name="scheduleType"
                  value="send_now"
                  checked={scheduleType === 'send_now'}
                  onChange={(e) => setScheduleType(e.target.value)}
                  style={styles.radio}
                />
                <div style={styles.scheduleTypeContent}>
                  <FiSend style={styles.scheduleTypeIcon} />
                  <div>
                    <div style={styles.scheduleTypeTitle}>Send Now</div>
                    <div style={styles.scheduleTypeDescription}>
                      Send the campaign immediately
                    </div>
                  </div>
                </div>
              </label>

              <label style={styles.scheduleType}>
                <input
                  type="radio"
                  name="scheduleType"
                  value="send_later"
                  checked={scheduleType === 'send_later'}
                  onChange={(e) => setScheduleType(e.target.value)}
                  style={styles.radio}
                />
                <div style={styles.scheduleTypeContent}>
                  <FiClock style={styles.scheduleTypeIcon} />
                  <div>
                    <div style={styles.scheduleTypeTitle}>Schedule for Later</div>
                    <div style={styles.scheduleTypeDescription}>
                      Send at a specific date and time
                    </div>
                  </div>
                </div>
              </label>

              <label style={styles.scheduleType}>
                <input
                  type="radio"
                  name="scheduleType"
                  value="recurring"
                  checked={scheduleType === 'recurring'}
                  onChange={(e) => setScheduleType(e.target.value)}
                  style={styles.radio}
                />
                <div style={styles.scheduleTypeContent}>
                  <FiRefreshCw style={styles.scheduleTypeIcon} />
                  <div>
                    <div style={styles.scheduleTypeTitle}>Recurring Campaign</div>
                    <div style={styles.scheduleTypeDescription}>
                      Send on a regular schedule
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Date and Time Selection */}
          {(scheduleType === 'send_later' || scheduleType === 'recurring') && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Date and Time</h3>
              
              <div style={styles.dateTimeContainer}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <FiCalendar style={styles.labelIcon} />
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    style={styles.input}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <FiClock style={styles.labelIcon} />
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <FiGlobe style={styles.labelIcon} />
                    Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    style={styles.select}
                  >
                    {commonTimezones.map(tz => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Send Time Optimization */}
              <div style={styles.optimizationSection}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={optimizeSendTime}
                    onChange={(e) => setOptimizeSendTime(e.target.checked)}
                    style={styles.checkbox}
                  />
                  Optimize send time for best engagement
                </label>
                
                {sendTimeRecommendations.length > 0 && (
                  <div style={styles.recommendations}>
                    <h4 style={styles.recommendationsTitle}>Recommended Send Times:</h4>
                    {sendTimeRecommendations.map((rec, index) => (
                      <div key={index} style={styles.recommendation}>
                        <div style={styles.recommendationInfo}>
                          <span style={styles.recommendationTime}>
                            {rec.time} on {rec.day}s
                          </span>
                          <span style={styles.recommendationScore}>
                            {rec.engagement_score}% engagement
                          </span>
                        </div>
                        <div style={styles.recommendationReason}>
                          {rec.reason}
                        </div>
                        <button
                          style={styles.applyRecommendationButton}
                          onClick={() => applyRecommendedTime(rec)}
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recurring Settings */}
          {scheduleType === 'recurring' && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Recurring Settings</h3>
              
              <div style={styles.recurringContainer}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Frequency</label>
                  <select
                    value={recurringSettings.frequency}
                    onChange={(e) => setRecurringSettings(prev => ({
                      ...prev,
                      frequency: e.target.value
                    }))}
                    style={styles.select}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom Interval</option>
                  </select>
                </div>

                {recurringSettings.frequency === 'custom' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Every</label>
                    <div style={styles.intervalContainer}>
                      <input
                        type="number"
                        min="1"
                        value={recurringSettings.interval}
                        onChange={(e) => setRecurringSettings(prev => ({
                          ...prev,
                          interval: parseInt(e.target.value)
                        }))}
                        style={styles.numberInput}
                      />
                      <span style={styles.intervalLabel}>days</span>
                    </div>
                  </div>
                )}

                {recurringSettings.frequency === 'weekly' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Days of Week</label>
                    <div style={styles.daysOfWeek}>
                      {daysOfWeek.map(day => (
                        <label key={day.value} style={styles.dayOfWeek}>
                          <input
                            type="checkbox"
                            checked={recurringSettings.daysOfWeek.includes(day.value)}
                            onChange={() => handleDayOfWeekToggle(day.value)}
                            style={styles.checkbox}
                          />
                          <span style={styles.dayLabel}>{day.label.slice(0, 3)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>End Date (Optional)</label>
                    <input
                      type="date"
                      value={recurringSettings.endDate}
                      onChange={(e) => setRecurringSettings(prev => ({
                        ...prev,
                        endDate: e.target.value
                      }))}
                      style={styles.input}
                      min={scheduledDate}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Max Sends (Optional)</label>
                    <input
                      type="number"
                      min="1"
                      value={recurringSettings.maxSends || ''}
                      onChange={(e) => setRecurringSettings(prev => ({
                        ...prev,
                        maxSends: e.target.value ? parseInt(e.target.value) : null
                      }))}
                      style={styles.input}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>
              </div>

              {/* Preview upcoming send times */}
              {previewTimes.length > 0 && (
                <div style={styles.previewSection}>
                  <h4 style={styles.previewTitle}>Next 5 Send Times:</h4>
                  <div style={styles.previewTimes}>
                    {previewTimes.map((preview, index) => (
                      <div key={index} style={styles.previewTime}>
                        <FiCalendar style={styles.previewIcon} />
                        <span>{preview.formatted}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div style={styles.errorsSection}>
              <div style={styles.errorsHeader}>
                <FiAlertTriangle style={styles.errorIcon} />
                <span>Please fix these issues:</span>
              </div>
              <ul style={styles.errorsList}>
                {validationErrors.map((error, index) => (
                  <li key={index} style={styles.errorItem}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Schedule Summary */}
          {scheduleType !== 'send_now' && scheduledDate && scheduledTime && (
            <div style={styles.summarySection}>
              <h3 style={styles.summaryTitle}>Schedule Summary</h3>
              <div style={styles.summaryContent}>
                <div style={styles.summaryItem}>
                  <FiCalendar style={styles.summaryIcon} />
                  <span>
                    {scheduleType === 'send_later' ? 'Will send on: ' : 'First send on: '}
                    {formatScheduleDateTime(new Date(scheduledDate), scheduledTime, timezone)}
                  </span>
                </div>
                {scheduleType === 'recurring' && (
                  <div style={styles.summaryItem}>
                    <FiRefreshCw style={styles.summaryIcon} />
                    <span>
                      Recurring {recurringSettings.frequency}
                      {recurringSettings.frequency === 'weekly' && recurringSettings.daysOfWeek.length > 0 && 
                        ` on ${recurringSettings.daysOfWeek.join(', ')}`
                      }
                    </span>
                  </div>
                )}
                {optimizeSendTime && (
                  <div style={styles.summaryItem}>
                    <FiSettings style={styles.summaryIcon} />
                    <span>Send time optimization enabled</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={styles.footer}>
          <button
            style={styles.cancelButton}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            style={styles.scheduleButton}
            onClick={handleSchedule}
            disabled={loading || validationErrors.length > 0}
          >
            {loading ? (
              <>
                <FiRefreshCw style={{ ...styles.buttonIcon, animation: 'spin 1s linear infinite' }} />
                Scheduling...
              </>
            ) : (
              <>
                {scheduleType === 'send_now' ? <FiSend /> : <FiClock />}
                {scheduleType === 'send_now' ? 'Send Now' : 
                 scheduleType === 'send_later' ? 'Schedule Campaign' : 
                 'Setup Recurring Campaign'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    borderBottom: '1px solid #f0f0f0',
    backgroundColor: '#fafafa',
    borderRadius: '12px 12px 0 0',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  campaignName: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic',
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '5px',
  },
  content: {
    padding: '30px',
  },
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '15px',
  },
  scheduleTypes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  scheduleType: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  radio: {
    width: '18px',
    height: '18px',
  },
  scheduleTypeContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  scheduleTypeIcon: {
    fontSize: '20px',
    color: 'teal',
  },
  scheduleTypeTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '2px',
  },
  scheduleTypeDescription: {
    fontSize: '14px',
    color: '#666',
  },
  dateTimeContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  labelIcon: {
    fontSize: '16px',
    color: 'teal',
  },
  input: {
    padding: '12px',
    fontSize: '14px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    boxSizing: 'border-box',
  },
  select: {
    padding: '12px',
    fontSize: '14px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  numberInput: {
    padding: '12px',
    fontSize: '14px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    width: '80px',
  },
  optimizationSection: {
    backgroundColor: '#f8f8f8',
    padding: '15px',
    borderRadius: '6px',
    marginTop: '15px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#333',
    cursor: 'pointer',
    marginBottom: '15px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
  },
  recommendations: {
    marginTop: '15px',
  },
  recommendationsTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px',
  },
  recommendation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginBottom: '8px',
  },
  recommendationInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  recommendationTime: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  recommendationScore: {
    fontSize: '12px',
    color: 'teal',
    fontWeight: 'bold',
  },
  recommendationReason: {
    fontSize: '12px',
    color: '#666',
    flex: 1,
    textAlign: 'center',
  },
  applyRecommendationButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  recurringContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  intervalContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  intervalLabel: {
    fontSize: '14px',
    color: '#666',
  },
  daysOfWeek: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  dayOfWeek: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    minWidth: '60px',
  },
  dayLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#333',
  },
  previewSection: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f0f8f8',
    borderRadius: '6px',
  },
  previewTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px',
  },
  previewTimes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  previewTime: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#555',
  },
  previewIcon: {
    fontSize: '12px',
    color: 'teal',
  },
  errorsSection: {
    backgroundColor: '#ffebee',
    border: '1px solid #f44336',
    borderRadius: '6px',
    padding: '15px',
    marginBottom: '20px',
  },
  errorsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: '10px',
  },
  errorIcon: {
    fontSize: '16px',
  },
  errorsList: {
    margin: 0,
    paddingLeft: '20px',
  },
  errorItem: {
    fontSize: '13px',
    color: '#c62828',
    marginBottom: '4px',
  },
  summarySection: {
    backgroundColor: '#e8f5e8',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px',
  },
  summaryTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px',
  },
  summaryContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  summaryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#555',
  },
  summaryIcon: {
    fontSize: '14px',
    color: 'teal',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '20px 30px',
    borderTop: '1px solid #f0f0f0',
    backgroundColor: '#fafafa',
  },
  cancelButton: {
    backgroundColor: 'white',
    color: '#666',
    border: '2px solid #ddd',
    borderRadius: '6px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  scheduleButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  buttonIcon: {
    fontSize: '16px',
  },
};

export default CampaignScheduler;