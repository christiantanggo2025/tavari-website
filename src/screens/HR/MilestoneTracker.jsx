// src/screens/HR/MilestoneTracker.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const MilestoneTracker = ({ employeeId, showCelebrations = true }) => {
  const [progress, setProgress] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [newAchievement, setNewAchievement] = useState(null);

  const businessId = localStorage.getItem('currentBusinessId');

  useEffect(() => {
    if (employeeId && businessId) {
      loadMilestoneData();
    }
  }, [employeeId, businessId]);

  const loadMilestoneData = async () => {
    try {
      setLoading(true);
      
      // Load progress data
      const { data: progressData, error: progressError } = await supabase
        .rpc('get_onboarding_progress_with_milestones', {
          p_employee_id: employeeId,
          p_business_id: businessId
        });

      if (progressError) throw progressError;
      setProgress(progressData[0] || null);

      // Load achievements
      const { data: achievementData, error: achievementError } = await supabase
        .rpc('get_employee_milestone_achievements', {
          p_employee_id: employeeId,
          p_business_id: businessId
        });

      if (achievementError) throw achievementError;
      setAchievements(achievementData || []);

      // Check for new achievements to celebrate
      if (showCelebrations) {
        checkForNewAchievements(achievementData || []);
      }
    } catch (error) {
      console.error('Error loading milestone data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkForNewAchievements = (achievements) => {
    const unsentCelebrations = achievements.filter(a => !a.celebration_sent);
    if (unsentCelebrations.length > 0) {
      setNewAchievement(unsentCelebrations[0]);
      setShowCelebrationModal(true);
    }
  };

  const sendCelebration = async (milestoneType) => {
    try {
      const { data, error } = await supabase
        .rpc('send_milestone_celebration', {
          p_employee_id: employeeId,
          p_business_id: businessId,
          p_milestone_type: milestoneType
        });

      if (error) throw error;
      
      // Reload data to reflect celebration sent
      loadMilestoneData();
      setShowCelebrationModal(false);
      setNewAchievement(null);
    } catch (error) {
      console.error('Error sending celebration:', error);
    }
  };

  const getBadgeIcon = (badge) => {
    const badgeIcons = {
      'orientation-complete': '🎓',
      'first-week-champion': '⭐',
      'essentials-master': '💪',
      'quarter-achiever': '🏆',
      'halfway-hero': '🚀',
      'almost-there': '🎯',
      'onboarding-graduate': '🏅'
    };
    return badgeIcons[badge] || '🏆';
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 75) return '#10B981'; // Green
    if (percentage >= 50) return '#F59E0B'; // Yellow
    if (percentage >= 25) return '#3B82F6'; // Blue
    return '#6B7280'; // Gray
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="text-center text-gray-500 py-8">
        No onboarding progress data available
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Progress Overview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Onboarding Progress</h3>
          <span className="text-sm text-gray-500">
            Day {progress.days_since_hire} • {progress.completed_tasks}/{progress.total_tasks} tasks
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${progress.completion_percentage}%`,
              backgroundColor: getProgressColor(progress.completion_percentage)
            }}
          />
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{progress.completion_percentage}% Complete</span>
          <span className="text-teal-600 font-medium">
            Next: {progress.next_milestone}
          </span>
        </div>
      </div>

      {/* Recent Achievements */}
      {progress.recent_achievements && progress.recent_achievements.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Recent Achievements</h4>
          <div className="space-y-2">
            {progress.recent_achievements.map((achievement, index) => (
              <div key={index} className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-2xl mr-3">{getBadgeIcon(achievement.badge)}</span>
                <div>
                  <p className="font-medium text-green-800">{achievement.type.replace('-', ' ').toUpperCase()}</p>
                  <p className="text-sm text-green-600">{achievement.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Achievements */}
      {achievements.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-3">All Achievements</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {achievements.map((achievement, index) => (
              <div key={index} className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-xl mr-3">{getBadgeIcon(achievement.achievement_badge)}</span>
                <div>
                  <p className="font-medium text-gray-800">
                    {achievement.milestone_type.replace('-', ' ').toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(achievement.achieved_at).toLocaleDateString()}
                  </p>
                </div>
                {achievement.celebration_sent && (
                  <span className="ml-auto text-green-500 text-sm">✓ Celebrated</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Celebration Modal */}
      {showCelebrationModal && newAchievement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <div className="text-6xl mb-4">
              {getBadgeIcon(newAchievement.achievement_badge)}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Congratulations!</h3>
            <h4 className="text-lg font-semibold text-teal-600 mb-3">
              {newAchievement.milestone_type.replace('-', ' ').toUpperCase()}
            </h4>
            <p className="text-gray-600 mb-6">{newAchievement.recognition_message}</p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => sendCelebration(newAchievement.milestone_type)}
                className="flex-1 bg-teal-600 text-white py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors"
              >
                Send Celebration
              </button>
              <button
                onClick={() => {
                  setShowCelebrationModal(false);
                  setNewAchievement(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MilestoneTracker;