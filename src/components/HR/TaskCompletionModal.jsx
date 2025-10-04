import React, { useState, useRef } from 'react';
import { Camera, FileText, Check, X } from 'lucide-react';

const TaskCompletionModal = ({ 
  isOpen, 
  onClose, 
  task, 
  onComplete,
  loading = false 
}) => {
  const [verificationMethod, setVerificationMethod] = useState('none');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const handlePhotoCapture = (event) => {
    const file = event.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      setSignatureData(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const handleSubmit = async () => {
    const completionData = {
      verification_method: verificationMethod,
      verification_notes: verificationNotes,
      verification_photo_url: photoFile ? URL.createObjectURL(photoFile) : null,
      verification_signature_data: signatureData
    };

    await onComplete(completionData);
  };

  const getRequiredVerificationMethod = () => {
    if (task?.requires_photo && task?.requires_signature) return 'both';
    if (task?.requires_photo) return 'photo';
    if (task?.requires_signature) return 'signature';
    return 'none';
  };

  const requiredMethod = getRequiredVerificationMethod();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Complete Task</h2>
            <p className="text-sm text-gray-600 mt-1">{task?.task_title}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Task Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Task Description</h3>
            <p className="text-gray-700">{task?.task_description}</p>
            {task?.verification_instructions && (
              <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400">
                <p className="text-sm text-blue-800">
                  <strong>Verification Instructions:</strong> {task.verification_instructions}
                </p>
              </div>
            )}
          </div>

          {/* Verification Requirements */}
          {requiredMethod !== 'none' && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Verification Required</h3>
              
              {/* Photo Verification */}
              {(requiredMethod === 'photo' || requiredMethod === 'both') && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Photo Evidence Required
                  </label>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <Camera size={20} />
                      <span>Take Photo</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="camera"
                      onChange={handlePhotoCapture}
                      className="hidden"
                    />
                  </div>
                  {photoPreview && (
                    <div className="mt-3">
                      <img 
                        src={photoPreview} 
                        alt="Verification photo" 
                        className="max-w-xs max-h-48 rounded-lg border"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Signature Verification */}
              {(requiredMethod === 'signature' || requiredMethod === 'both') && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Digital Signature Required
                  </label>
                  <div className="border border-gray-300 rounded-lg p-4">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={150}
                      className="border border-gray-200 rounded cursor-crosshair w-full"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      style={{ touchAction: 'none' }}
                    />
                    <div className="mt-2 flex justify-between">
                      <p className="text-sm text-gray-600">Sign above to verify task completion</p>
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Optional Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Completion Notes (Optional)
            </label>
            <textarea
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Add any notes about completing this task..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (requiredMethod === 'photo' && !photoFile) || (requiredMethod === 'signature' && !signatureData) || (requiredMethod === 'both' && (!photoFile || !signatureData))}
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Completing...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Complete Task</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCompletionModal;