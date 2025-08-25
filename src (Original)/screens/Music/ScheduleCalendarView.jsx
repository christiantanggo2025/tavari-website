import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { FiPlus, FiCalendar, FiClock, FiAlertTriangle, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import styles from './PlaylistManager.module.css';

const ScheduleCalendarView = ({ schedules, playlists, business, onScheduleUpdate }) => {
  // Debug logging
  console.log('ScheduleCalendarView Props:', {
    schedules: schedules,
    playlists: playlists,
    schedulesLength: schedules?.length,
    playlistsLength: playlists?.length
  });

  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [showCalendarScheduleModal, setShowCalendarScheduleModal] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  });

  // Form states
  const [scheduleForm, setScheduleForm] = useState({
    playlist_id: '',
    schedule_date: null,
    start_time: '',
    end_time: '',
    priority: 1,
    active: true,
    immediate_switch: false,
    loop_playlist: true,
    stop_when_complete: false,
    repeat_type: 'once',
    repeat_until: null
  });

  // Time slots for calendar (24-hour format)
  const timeSlots = [];
  for (let hour = 0; hour < 24; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
  }

  // Generate week dates
  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  // Days of week with actual dates
  const daysOfWeek = [
    { id: 0, name: 'Sunday', short: 'Sun' },
    { id: 1, name: 'Monday', short: 'Mon' },
    { id: 2, name: 'Tuesday', short: 'Tue' },
    { id: 3, name: 'Wednesday', short: 'Wed' },
    { id: 4, name: 'Thursday', short: 'Thu' },
    { id: 5, name: 'Friday', short: 'Fri' },
    { id: 6, name: 'Saturday', short: 'Sat' }
  ];

  // Quick day selections
  const quickDaySelections = [
    { name: 'Weekdays', days: [1, 2, 3, 4, 5] },
    { name: 'Weekend', days: [0, 6] },
    { name: 'All Week', days: [0, 1, 2, 3, 4, 5, 6] }
  ];

  // Navigation functions
  const goToPreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const goToNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    setCurrentWeekStart(weekStart);
  };

  // Check schedule conflicts
  const checkScheduleConflicts = (newSchedule) => {
    const conflicts = [];
    const newStart = new Date(`2000-01-01T${newSchedule.start_time}`);
    const newEnd = new Date(`2000-01-01T${newSchedule.end_time}`);

    // Filter schedules for the same date
    const schedulesOnDate = schedules.filter(s => {
      if (newSchedule.schedule_date) {
        return s.schedule_date === newSchedule.schedule_date;
      }
      return false;
    });
    
    schedulesOnDate.forEach(existing => {
      const existingStart = new Date(`2000-01-01T${existing.start_time}`);
      const existingEnd = new Date(`2000-01-01T${existing.end_time}`);
      
      // Check for time overlap
      if ((newStart < existingEnd && newEnd > existingStart)) {
        conflicts.push(existing);
      }
    });

    return conflicts;
  };

  // Create schedule
  const createSchedule = async (e) => {
    e.preventDefault();
    if (!business?.id || !scheduleForm.playlist_id || !scheduleForm.schedule_date) return;

    try {
      // Check for conflicts
      const conflicts = checkScheduleConflicts(scheduleForm);
      if (conflicts.length > 0) {
        const confirmCreate = confirm(`Warning: This schedule conflicts with ${conflicts.length} existing schedule(s). Continue anyway?`);
        if (!confirmCreate) return;
      }

      // Create schedule for the specific date
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;

      const scheduleInsert = {
        playlist_id: scheduleForm.playlist_id,
        schedule_date: scheduleForm.schedule_date,
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
        priority: scheduleForm.priority,
        active: scheduleForm.active,
        immediate_switch: scheduleForm.immediate_switch,
        loop_playlist: scheduleForm.loop_playlist,
        stop_when_complete: scheduleForm.stop_when_complete,
        repeat_type: scheduleForm.repeat_type,
        repeat_until: scheduleForm.repeat_until,
        business_id: business.id,
        created_by: userId
      };

      const { error } = await supabase
        .from('music_playlist_schedules')
        .insert([scheduleInsert]);

      if (error) throw error;

      await onScheduleUpdate();
      setShowCalendarScheduleModal(false);
      setSelectedTimeSlot(null);
      setScheduleForm({
        playlist_id: '',
        schedule_date: null,
        start_time: '',
        end_time: '',
        priority: 1,
        active: true,
        immediate_switch: false,
        loop_playlist: true,
        stop_when_complete: false,
        repeat_type: 'once',
        repeat_until: null
      });
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Error creating schedule: ' + error.message);
    }
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour12 = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format week range for display
  const formatWeekRange = () => {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(currentWeekStart.getDate() + 6);
    
    return `${formatDate(currentWeekStart)} - ${formatDate(endDate)}, ${currentWeekStart.getFullYear()}`;
  };

  // Handle calendar time slot click
  const handleTimeSlotClick = (dateIndex, time) => {
    const selectedDate = weekDates[dateIndex];
    const dateString = selectedDate.toISOString().split('T')[0];
    
    setSelectedTimeSlot({ dateIndex, time, date: selectedDate });
    setScheduleForm(prev => ({
      ...prev,
      schedule_date: dateString,
      start_time: time,
      end_time: addHourToTime(time)
    }));
    setShowCalendarScheduleModal(true);
  };

  // Add hour to time string
  const addHourToTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const newHour = (parseInt(hours) + 1) % 24;
    return `${newHour.toString().padStart(2, '0')}:${minutes}`;
  };

  // Get schedule for specific date and time
  const getScheduleForTimeSlot = (dateIndex, time) => {
    const selectedDate = weekDates[dateIndex];
    const dateString = selectedDate.toISOString().split('T')[0];
    
    console.log('Looking for schedule:', {
      dateString,
      time,
      totalSchedules: schedules.length,
      schedules: schedules
    });
    
    const matchingSchedule = schedules.find(schedule => {
      console.log('Checking schedule:', {
        scheduleDate: schedule.schedule_date,
        scheduleStart: schedule.start_time,
        scheduleEnd: schedule.end_time,
        repeatType: schedule.repeat_type,
        currentTime: time,
        currentDate: dateString
      });
      
      // Check if this time slot matches this schedule
      const scheduleStart = schedule.start_time;
      const scheduleEnd = schedule.end_time;
      
      // Time comparison - check if current time falls within schedule time range
      const timeInRange = time >= scheduleStart && time < scheduleEnd;
      console.log('Time in range:', timeInRange, `${time} >= ${scheduleStart} && ${time} < ${scheduleEnd}`);
      
      if (!timeInRange) {
        return false;
      }
      
      // Check if this date matches based on repeat type
      const scheduleDate = new Date(schedule.schedule_date + 'T00:00:00');
      const currentDate = new Date(dateString + 'T00:00:00');
      
      switch (schedule.repeat_type) {
        case 'once':
          const isExactDate = schedule.schedule_date === dateString;
          console.log('Once type match:', isExactDate);
          return isExactDate;
          
        case 'daily':
          // Show if current date is on or after schedule date
          if (currentDate < scheduleDate) return false;
          // Check if repeat_until is set and we haven't passed it
          if (schedule.repeat_until) {
            const repeatUntil = new Date(schedule.repeat_until + 'T00:00:00');
            if (currentDate > repeatUntil) return false;
          }
          console.log('Daily type match: true');
          return true;
          
        case 'weekly':
          // Show if current date is on or after schedule date and same day of week
          if (currentDate < scheduleDate) return false;
          if (currentDate.getDay() !== scheduleDate.getDay()) return false;
          // Check if repeat_until is set and we haven't passed it
          if (schedule.repeat_until) {
            const repeatUntil = new Date(schedule.repeat_until + 'T00:00:00');
            if (currentDate > repeatUntil) return false;
          }
          console.log('Weekly type match: true');
          return true;
          
        case 'monthly':
          // Show if current date is on or after schedule date and same day of month
          if (currentDate < scheduleDate) return false;
          if (currentDate.getDate() !== scheduleDate.getDate()) return false;
          // Check if repeat_until is set and we haven't passed it
          if (schedule.repeat_until) {
            const repeatUntil = new Date(schedule.repeat_until + 'T00:00:00');
            if (currentDate > repeatUntil) return false;
          }
          console.log('Monthly type match: true');
          return true;
          
        default:
          const defaultMatch = schedule.schedule_date === dateString;
          console.log('Default type match:', defaultMatch);
          return defaultMatch;
      }
    });

    console.log('Found matching schedule:', matchingSchedule);

    // The schedule already has playlist_name and playlist_color from the parent component
    if (matchingSchedule) {
      console.log('Returning schedule with existing playlist data:', {
        name: matchingSchedule.playlist_name,
        color: matchingSchedule.playlist_color
      });
      return matchingSchedule;
    }

    return null;
  };

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div>
      {/* Calendar Description and Navigation */}
      <div className={styles.playlistCard} style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 className={styles.playlistTitle}>Weekly Schedule Calendar</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={goToPreviousWeek}
              className={`${styles.iconButton} ${styles.primary}`}
              title="Previous Week"
            >
              <FiChevronLeft />
            </button>
            <button
              onClick={goToCurrentWeek}
              className={`${styles.button} ${styles.secondary}`}
              style={{ padding: '8px 16px', fontSize: '0.9rem' }}
            >
              Today
            </button>
            <button
              onClick={goToNextWeek}
              className={`${styles.iconButton} ${styles.primary}`}
              title="Next Week"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className={styles.playlistDescription}>
            Week of {formatWeekRange()}
          </p>
          <p className={styles.playlistDescription}>
            Click on any time slot to create a new schedule for that specific date and time
          </p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={styles.playlistCard} style={{ padding: '0', overflow: 'hidden' }}>
        {/* Calendar Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '120px repeat(7, 1fr)',
          backgroundColor: '#14B8A6',
          borderBottom: '2px solid #0d9488'
        }}>
          <div style={{
            padding: '15px',
            color: 'white',
            fontWeight: 'bold',
            textAlign: 'center',
            borderRight: '1px solid #0d9488'
          }}>
            <FiClock style={{ marginRight: '8px' }} />
            Time
          </div>
          {daysOfWeek.map((day, index) => (
            <div key={day.id} style={{
              padding: '15px',
              color: 'white',
              fontWeight: 'bold',
              textAlign: 'center',
              borderRight: index < 6 ? '1px solid #0d9488' : 'none',
              backgroundColor: isToday(weekDates[index]) ? '#0d9488' : '#14B8A6'
            }}>
              <div>{day.short}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                {formatDate(weekDates[index])}
              </div>
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div style={{
          maxHeight: '500px',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: '120px repeat(7, 1fr)'
        }}>
          {timeSlots.map((time) => (
            <React.Fragment key={time}>
              {/* Time Label */}
              <div style={{
                padding: '15px',
                backgroundColor: '#f0fdfa',
                borderRight: '1px solid #14B8A6',
                borderBottom: '1px solid #e5e7eb',
                fontWeight: 'bold',
                textAlign: 'center',
                color: '#1f2937',
                fontSize: '0.9rem'
              }}>
                {formatTime(time)}
              </div>
              
              {/* Day Columns */}
              {weekDates.map((date, dateIndex) => {
                const schedule = getScheduleForTimeSlot(dateIndex, time);
                const isPastDate = date < new Date().setHours(0, 0, 0, 0);
                
                return (
                  <div
                    key={`${dateIndex}-${time}`}
                    onClick={() => !isPastDate && handleTimeSlotClick(dateIndex, time)}
                    style={{
                      padding: '8px',
                      minHeight: '60px',
                      cursor: isPastDate ? 'not-allowed' : 'pointer',
                      border: '1px solid #e5e7eb',
                      backgroundColor: schedule 
                        ? `${schedule.playlist_color}20` 
                        : isPastDate 
                          ? '#f9fafb' 
                          : isToday(date) 
                            ? '#f0fdfa' 
                            : '#ffffff',
                      borderLeft: schedule ? `4px solid ${schedule.playlist_color}` : '1px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      opacity: isPastDate ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!schedule && !isPastDate) {
                        e.target.style.backgroundColor = '#f0fdfa';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!schedule && !isPastDate) {
                        e.target.style.backgroundColor = isToday(date) ? '#f0fdfa' : '#ffffff';
                      }
                    }}
                    title={
                      schedule 
                        ? `${schedule.playlist_name} (${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)})` 
                        : isPastDate 
                          ? 'Past date' 
                          : `Click to create schedule for ${formatDate(date)}`
                    }
                  >
                    {schedule ? (
                      <div style={{
                        backgroundColor: schedule.playlist_color,
                        color: 'white',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        textAlign: 'center',
                        width: '100%',
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                      }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {schedule.playlist_name}
                        </div>
                        <div style={{ opacity: 0.9, fontSize: '0.7rem', marginTop: '2px' }}>
                          {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                        </div>
                      </div>
                    ) : !isPastDate ? (
                      <FiPlus style={{ color: '#14B8A6', fontSize: '1.2rem' }} />
                    ) : null}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Calendar Legend */}
      <div className={styles.playlistCard} style={{ marginTop: '30px' }}>
        <h3 className={styles.playlistTitle} style={{ marginBottom: '15px' }}>Schedule Legend</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          {playlists.slice(0, 8).map(playlist => (
            <div key={playlist.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                marginRight: '10px',
                backgroundColor: playlist.color_code,
                border: '1px solid #e5e7eb'
              }}></div>
              <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#4b5563' }}>{playlist.name}</span>
            </div>
          ))}
          {playlists.length > 8 && (
            <div style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>
              +{playlists.length - 8} more playlists
            </div>
          )}
        </div>
      </div>

      {/* Create Schedule Modal */}
      {showCalendarScheduleModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                Create Schedule for {selectedTimeSlot && formatDate(selectedTimeSlot.date)}
              </h2>
              <button
                onClick={() => {
                  setShowCalendarScheduleModal(false);
                  setSelectedTimeSlot(null);
                  setScheduleForm({
                    playlist_id: '',
                    schedule_date: null,
                    start_time: '',
                    end_time: '',
                    priority: 1,
                    active: true,
                    immediate_switch: false,
                    loop_playlist: true,
                    stop_when_complete: false,
                    repeat_type: 'once',
                    repeat_until: null
                  });
                }}
                className={styles.closeButton}
              >
                <FiX />
              </button>
            </div>
            <form onSubmit={createSchedule}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Playlist</label>
                <select
                  value={scheduleForm.playlist_id}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, playlist_id: e.target.value }))}
                  className={styles.select}
                  required
                >
                  <option value="">Select a playlist</option>
                  {playlists.map((playlist) => (
                    <option key={playlist.id} value={playlist.id}>
                      {playlist.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Schedule Date</label>
                <input
                  type="date"
                  value={scheduleForm.schedule_date || ''}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, schedule_date: e.target.value }))}
                  className={styles.input}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Start Time</label>
                  <input
                    type="time"
                    value={scheduleForm.start_time}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, start_time: e.target.value }))}
                    className={styles.input}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>End Time</label>
                  <input
                    type="time"
                    value={scheduleForm.end_time}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, end_time: e.target.value }))}
                    className={styles.input}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Priority (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={scheduleForm.priority}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                  className={styles.input}
                />
                <small style={{ color: '#6b7280', fontSize: '0.8rem' }}>Higher numbers = higher priority when schedules overlap</small>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Playback Options</label>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={scheduleForm.loop_playlist}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, loop_playlist: e.target.checked }))}
                      className={styles.checkbox}
                    />
                    Loop playlist (restart when finished)
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={scheduleForm.stop_when_complete}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, stop_when_complete: e.target.checked }))}
                      className={styles.checkbox}
                    />
                    Stop when playlist completes (don't loop)
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={scheduleForm.immediate_switch}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, immediate_switch: e.target.checked }))}
                      className={styles.checkbox}
                    />
                    Switch immediately when schedule starts (interrupt current track)
                  </label>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Repeat Type</label>
                <select
                  value={scheduleForm.repeat_type}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, repeat_type: e.target.value }))}
                  className={styles.select}
                >
                  <option value="once">One Time Only</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {scheduleForm.repeat_type !== 'once' && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Repeat Until</label>
                  <input
                    type="date"
                    value={scheduleForm.repeat_until || ''}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, repeat_until: e.target.value }))}
                    className={styles.input}
                  />
                </div>
              )}

              {/* Conflict warning */}
              {scheduleForm.playlist_id && scheduleForm.schedule_date && scheduleForm.start_time && scheduleForm.end_time && (
                (() => {
                  const conflicts = checkScheduleConflicts(scheduleForm);
                  return conflicts.length > 0 && (
                    <div style={{
                      padding: '15px',
                      backgroundColor: '#fef3c7',
                      border: '2px solid #f59e0b',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <FiAlertTriangle style={{ color: '#d97706', marginRight: '10px', fontSize: '1.2rem' }} />
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#92400e' }}>
                        Warning: This schedule conflicts with {conflicts.length} existing schedule(s)
                      </span>
                    </div>
                  );
                })()
              )}

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCalendarScheduleModal(false);
                    setSelectedTimeSlot(null);
                    setScheduleForm({
                      playlist_id: '',
                      schedule_date: null,
                      start_time: '',
                      end_time: '',
                      priority: 1,
                      active: true,
                      immediate_switch: false,
                      loop_playlist: true,
                      stop_when_complete: false,
                      repeat_type: 'once',
                      repeat_until: null
                    });
                  }}
                  className={`${styles.button} ${styles.secondary}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.button} ${styles.primary}`}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleCalendarView;