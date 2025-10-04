import React, { useState, useEffect } from 'react';
import { Check, X, Camera, FileText, User, Calendar, Clock } from 'lucide-react';

const VerificationApprovalModal = ({ 
  isOpen, 
  onClose, 
  completionDetails,
  onApprove,
  onReject,
  loading = false 
}) => {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApprovalNotes('');
      setRejectionReason('');
      setShowRejectionForm(false);
    }
  }, [isOpen]);

  const handleApprove = async () => {
    await onApprove({
      approved: true,
      approval_notes: approvalNotes
    });
  };

  const handleReject = async () => {
    await onReject({
      approved: false,
      rejection_reason: rejectionReason,
      approval_notes: approvalNotes
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (!isOpen || !completionDetails) return null;

  const { completion, task, employee, completed_by } = completionDetails;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Task Verification Review</h2>
            <p className="text-sm text-gray-600 mt-1">
              Review and approve task completion
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Task Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Task Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Task:</span>
                <p className="text-gray-900 mt-1">{task?.task_title}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Description:</span>
                <p className="text-gray-900 mt-1">{task?.task_description}</p>
              </div>
            </div>
            {task?.verification_instructions && (
              <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400">
                <p className="text-sm text-blue-800">
                  <strong>Verification Instructions:</strong> {task.verification_instructions}
                </p>
              </div>
            )}
          </div>

          {/* Employee & Completion Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <User size={16} className="mr-2" />
                Employee Information
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Employee:</span>
                  <p className="text-gray-900">{employee?.name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Employee ID:</span>
                  <p className="text-gray-900">{employee?.employee_number || 'N/A'}</p>
                </div>
                {completed_by?.id !== employee?.id && (
                  <div>
                    <span className="font-medium text-gray-700">Completed by:</span>
                    <p className="text-gray-900">{completed_by?.name}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <Clock size={16} className="mr-2" />
                Completion Details
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Completed:</span>
                  <p className="text-gray-900">{formatDate(completion?.completed_at)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {completion?.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Verification Method:</span>
                  <p className="text-gray-900 capitalize">{completion?.verification_method || 'None'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Evidence */}
          {(completion?.verification_photo_url || completion?.verification_signature_data) && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Verification Evidence</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Photo Evidence */}
                {completion?.verification_photo_url && (
                  <div className="bg-white border border-gray-200 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                      <Camera size={16} className="mr-2" />
                      Photo Evidence
                    </h4>
                    <img 
                      src={completion.verification_photo_url} 
                      alt="Task completion photo" 
                      className="w-full max-h-64 object-contain rounded-lg border border-gray-200"
                    />
                  </div>
                )}

                {/* Digital Signature */}
                {completion?.verification_signature_data && (
                  <div className="bg-white border border-gray-200 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                      <FileText size={16} className="mr-2" />
                      Digital Signature
                    </h4>
                    <img 
                      src={completion.verification_signature_data} 
                      alt="Digital signature" 
                      className="w-full max-h-32 object-contain rounded-lg border border-gray-200 bg-white"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Completion Notes */}
          {completion?.verification_notes && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Completion Notes</h3>
              <p className="text-gray-700">{completion.verification_notes}</p>
            </div>
          )}

          {/* Rejection Form */}
          {showRejectionForm && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg space-y-4">
              <h3 className="font-medium text-red-900">Reject Task Completion</h3>
              <div>
                <label className="block text-sm font-medium text-red-700 mb-2">
                  Reason for Rejection *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full border border-red-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Explain why this task completion is being rejected..."
                  required
                />
              </div>
            </div>
          )}

          {/* Manager Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Manager Notes (Optional)
            </label>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Add any notes about this verification decision..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <div className="flex space-x-3">
            {!showRejectionForm ? (
              <>
                <button
                  onClick={() => setShowRejectionForm(true)}
                  disabled={loading}
                  className="px-4 py-2 text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <X size={16} />
                  <span>Reject</span>
                </button>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Check size={16} />
                  )}
                  <span>Approve</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowRejectionForm(false)}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel Rejection
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading || !rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <X size={16} />
                  )}
                  <span>Confirm Rejection</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationApprovalModal;