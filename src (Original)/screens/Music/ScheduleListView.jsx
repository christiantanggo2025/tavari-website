import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { FiPlus, FiEdit, FiTrash, FiClock, FiCalendar, FiAlertTriangle, FiX, FiMusic } from 'react-icons/fi';
import styles from './PlaylistManager.module.css';

const ScheduleListView = ({ schedules, playlists, business, onScheduleUpdate }) => {
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const [showEditSchedule, setShowEditSchedule] = useState(null);

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

  // Check schedule conflicts
  const checkScheduleConflicts = (newSchedule, excludeId = null) => {
    const conflicts = [];
    const newStart = new Date(`2000-01-01T${newSchedule.start_time}`);
    const newEnd = new Date(`2000-01-01T${newSchedule.end_time}`);

    // Filter schedules for the same date
    const schedulesOnDate = schedules.filter(s => {
      if (s.id === excludeId) return false;
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
      setShowCreateSchedule(false);
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

  // Edit schedule
  const editSchedule = async (e) => {
    e.preventDefault();
    if (!business?.id || !scheduleForm.playlist_id || !scheduleForm.schedule_date) return;

    try {
      // Check for conflicts (excluding current schedule)
      const conflicts = checkScheduleConflicts(scheduleForm, showEditSchedule.id);

      if (conflicts.length > 0) {
        const confirmUpdate = confirm(`Warning: This schedule conflicts with ${conflicts.length} existing schedule(s). Continue anyway?`);
        if (!confirmUpdate) return;
      }

      const { error } = await supabase
        .from('music_playlist_schedules')
        .update({
          playlist_id: scheduleForm.playlist_id,
          schedule_date: scheduleForm.schedule_date,
          start_time: scheduleForm.start_time,
          end_time: scheduleForm.end_time,
          priority: scheduleForm.priority,
          active: scheduleForm.active,
          repeat_type: scheduleForm.repeat_type,
          repeat_until: scheduleForm.repeat_until
        })
        .eq('id', showEditSchedule.id);

      if (error) throw error;

      await onScheduleUpdate();
      setShowEditSchedule(null);
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
      console.error('Error updating schedule:', error);
      alert('Error updating schedule: ' + error.message);
    }
  };

  // Open edit modal with schedule data
  const openEditSchedule = (schedule) => {
    setScheduleForm({
      playlist_id: schedule.playlist_id,
      schedule_date: schedule.schedule_date,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      priority: schedule.priority,
      active: schedule.active,
      immediate_switch: schedule.immediate_switch || false,
      loop_playlist: schedule.loop_playlist || true,
      stop_when_complete: schedule.stop_when_complete || false,
      repeat_type: schedule.repeat_type || 'once',
      repeat_until: schedule.repeat_until
    });
    setShowEditSchedule(schedule);
  };

  // Delete schedule
  const deleteSchedule = async (scheduleId) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const { error } = await supabase
        .from('music_playlist_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
      await onScheduleUpdate();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Error deleting schedule: ' + error.message);
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
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Format short date for display
  const formatShortDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get repeat type display
  const getRepeatTypeDisplay = (repeatType) => {
    switch (repeatType) {
      case 'once': return 'One Time';
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return 'One Time';
    }
  };

  // Sort schedules by date and time
  const sortedSchedules = [...schedules].sort((a, b) => {
    // First sort by date
    if (a.schedule_date !== b.schedule_date) {
      return new Date(a.schedule_date) - new Date(b.schedule_date);
    }
    // Then sort by start time
    return a.start_time.localeCompare(b.start_time);
  });

  return (
    <div>
      {/* Action Buttons - Tavari 3x Grid Standard */}
      <div className={styles.actionGrid}>
        <button
          onClick={() => setShowCreateSchedule(true)}
          className={styles.actionButton}
        >
          <FiPlus className={styles.actionIcon} />
          Create Schedule
        </button>
        <button disabled className={styles.actionButton}>
          <FiClock className={styles.actionIcon} />
          Bulk Edit
        </button>
        <button disabled className={styles.actionButton}>
          <FiCalendar className={styles.actionIcon} />
          Import Schedule
        </button>
      </div>

      {/* Schedules List */}
      {sortedSchedules.length > 0 ? (
        <div className={styles.playlistGrid}>
          {sortedSchedules.map((schedule) => (
            <div key={schedule.id} className={styles.playlistCard}>
              <div className={styles.playlistHeader}>
                <div className={styles.playlistInfo}>
                  <div
                    className={styles.colorIndicator}
                    style={{ backgroundColor: schedule.playlist_color }}
                  />
                  <div>
                    <h3 className={styles.playlistTitle}>{schedule.playlist_name}</h3>
                    <div className={styles.playlistMeta}>
                      <FiCalendar style={{ marginRight: '5px' }} />
                      {formatShortDate(schedule.schedule_date)} • 
                      {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                      {schedule.repeat_type !== 'once' && (
                        <span style={{ marginLeft: '8px', color: '#14B8A6' }}>• {getRepeatTypeDisplay(schedule.repeat_type)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.playlistActions}>
                  <button
                    onClick={() => openEditSchedule(schedule)}
                    className={`${styles.iconButton} ${styles.primary}`}
                    title="Edit Schedule"
                  >
                    <FiEdit />
                  </button>
                  <button
                    onClick={() => deleteSchedule(schedule.id)}
                    className={`${styles.iconButton} ${styles.danger}`}
                    title="Delete Schedule"
                  >
                    <FiTrash />
                  </button>
                </div>
              </div>
              
              <div className={styles.playlistDescription}>
                Scheduled for: {formatDate(schedule.schedule_date)}
              </div>
              
              <div className={styles.playlistDate}>
                Status: <span style={{
                  color: schedule.active ? '#14B8A6' : '#6b7280',
                  fontWeight: 'bold'
                }}>
                  {schedule.active ? 'Active' : 'Inactive'}
                </span>
                {schedule.priority > 1 && (
                  <span style={{ marginLeft: '15px' }}>Priority: {schedule.priority}</span>
                )}
                {schedule.repeat_until && (
                  <span style={{ marginLeft: '15px' }}>Until: {formatShortDate(schedule.repeat_until)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <FiCalendar className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No schedules yet</h3>
          <p className={styles.emptyDescription}>Create your first schedule to automate playlist playback for specific dates</p>
          <button onClick={() => setShowCreateSchedule(true)} className={styles.primaryButton}>
            Create Schedule
          </button>
        </div>
      )}

      {/* Create Schedule Modal */}
      {showCreateSchedule && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Create New Schedule</h2>
              <button
                onClick={() => {
                  setShowCreateSchedule(false);
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
                    setShowCreateSchedule(false);
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

      {/* Edit Schedule Modal */}
      {showEditSchedule && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Schedule</h2>
              <button
                onClick={() => {
                  setShowEditSchedule(null);
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
            <form onSubmit={editSchedule}>
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

              {/* Conflict warning */}
              {scheduleForm.playlist_id && scheduleForm.schedule_date && scheduleForm.start_time && scheduleForm.end_time && (
                (() => {
                  const conflicts = checkScheduleConflicts(scheduleForm, showEditSchedule.id);
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
                    setShowEditSchedule(null);
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
                  Update Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleListView;