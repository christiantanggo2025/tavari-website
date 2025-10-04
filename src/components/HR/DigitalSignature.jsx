import React, { useRef, useState, useEffect } from 'react';
import { AlertCircle, Check, X, RotateCcw, Download, Eye, EyeOff } from 'lucide-react';

const DigitalSignature = ({
  documentType = 'contract', // 'contract', 'policy', 'writeup', 'onboarding'
  documentId,
  businessId,
  userId,
  signerName,
  signerEmail,
  onSignatureComplete,
  onCancel,
  requireWitness = false,
  isReadOnly = false,
  existingSignature = null,
  className = ''
}) => {
  const canvasRef = useRef(null);
  const witnessCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isWitnessDrawing, setIsWitnessDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [witnessSignatureData, setWitnessSignatureData] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [showWitnessSignature, setShowWitnessSignature] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState('signature'); // 'signature', 'witness', 'complete'

  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set canvas size
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      // Set drawing properties
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Clear canvas with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // If there's an existing signature, display it
      if (existingSignature && isReadOnly) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = existingSignature;
      }
    }
  }, [existingSignature, isReadOnly]);

  // Initialize witness canvas
  useEffect(() => {
    if (witnessCanvasRef.current && requireWitness) {
      const canvas = witnessCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [requireWitness]);

  const getCanvasCoordinates = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Main signature canvas handlers
  const startDrawing = (e) => {
    if (isReadOnly) return;
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoordinates(e, canvas);
    
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e) => {
    if (!isDrawing || isReadOnly) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoordinates(e, canvas);
    
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isReadOnly) return;
    
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureData(dataUrl);
    setIsValid(true);
  };

  // Witness signature canvas handlers
  const startWitnessDrawing = (e) => {
    setIsWitnessDrawing(true);
    const canvas = witnessCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoordinates(e, canvas);
    
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const drawWitness = (e) => {
    if (!isWitnessDrawing) return;
    
    const canvas = witnessCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoordinates(e, canvas);
    
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopWitnessDrawing = () => {
    setIsWitnessDrawing(false);
    const canvas = witnessCanvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    setWitnessSignatureData(dataUrl);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setSignatureData('');
    setIsValid(false);
  };

  const clearWitnessSignature = () => {
    const canvas = witnessCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setWitnessSignatureData('');
  };

  const downloadSignature = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `signature_${documentType}_${new Date().getTime()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleSave = async () => {
    if (!signatureData || !signerName) {
      setError('Please provide a signature and signer name');
      return;
    }

    if (requireWitness && (!witnessName || !witnessSignatureData)) {
      setError('Witness signature and name are required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // Here you would call your API to store the signature
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const signatureRecord = {
        businessId,
        userId,
        documentType,
        documentId,
        signatureData,
        signerFullName: signerName,
        signerEmail,
        witnessName: requireWitness ? witnessName : null,
        witnessSignatureData: requireWitness ? witnessSignatureData : null,
        signedAt: new Date().toISOString(),
        ipAddress: 'client-ip', // Would be captured server-side
        metadata: {
          canvasWidth: canvasRef.current.width,
          canvasHeight: canvasRef.current.height,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        }
      };

      onSignatureComplete?.(signatureRecord);
      setCurrentStep('complete');
    } catch (err) {
      setError('Failed to save signature. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const proceedToWitness = () => {
    if (!signatureData) {
      setError('Please provide your signature first');
      return;
    }
    setCurrentStep('witness');
    setShowWitnessSignature(true);
  };

  if (isReadOnly && existingSignature) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Digital Signature</h3>
          <div className="flex items-center text-green-600">
            <Check className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Signed</span>
          </div>
        </div>
        
        <div className="border-2 border-gray-200 rounded-lg">
          <canvas
            ref={canvasRef}
            className="w-full h-32 rounded-lg"
            style={{ touchAction: 'none' }}
          />
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Signed by:</strong> {signerName}</p>
          {signerEmail && <p><strong>Email:</strong> {signerEmail}</p>}
          <p><strong>Document Type:</strong> {documentType}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {currentStep === 'signature' && 'Digital Signature Required'}
          {currentStep === 'witness' && 'Witness Signature Required'}
          {currentStep === 'complete' && 'Signature Complete'}
        </h3>
        
        <div className="flex items-center space-x-2">
          {currentStep === 'complete' ? (
            <div className="flex items-center text-green-600">
              <Check className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Complete</span>
            </div>
          ) : (
            <div className="flex items-center text-amber-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Pending</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {currentStep === 'signature' && (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name of Signer
            </label>
            <input
              type="text"
              value={signerName}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Please sign below
            </label>
            <div className="border-2 border-gray-300 rounded-lg bg-white relative">
              <canvas
                ref={canvasRef}
                className="w-full h-32 rounded-lg cursor-crosshair"
                style={{ touchAction: 'none' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={(e) => {
                  e.preventDefault();
                  const touch = e.touches[0];
                  const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                  });
                  startDrawing(mouseEvent);
                }}
                onTouchMove={(e) => {
                  e.preventDefault();
                  const touch = e.touches[0];
                  const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                  });
                  draw(mouseEvent);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stopDrawing();
                }}
              />
              {!signatureData && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-gray-400 text-sm">Sign here</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <button
                onClick={clearSignature}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 flex items-center"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Clear
              </button>
              
              {signatureData && (
                <button
                  onClick={downloadSignature}
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 flex items-center"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </button>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              
              {requireWitness ? (
                <button
                  onClick={proceedToWitness}
                  disabled={!isValid}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Continue to Witness
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={!isValid || isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Complete Signature'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {currentStep === 'witness' && (
        <div>
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-sm text-green-700">Primary signature completed</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Witness Full Name
            </label>
            <input
              type="text"
              value={witnessName}
              onChange={(e) => setWitnessName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
              placeholder="Enter witness full name"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Witness Signature
            </label>
            <div className="border-2 border-gray-300 rounded-lg bg-white relative">
              <canvas
                ref={witnessCanvasRef}
                className="w-full h-32 rounded-lg cursor-crosshair"
                style={{ touchAction: 'none' }}
                onMouseDown={startWitnessDrawing}
                onMouseMove={drawWitness}
                onMouseUp={stopWitnessDrawing}
                onMouseLeave={stopWitnessDrawing}
              />
              {!witnessSignatureData && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-gray-400 text-sm">Witness signature here</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <button
                onClick={clearWitnessSignature}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 flex items-center"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Clear Witness
              </button>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentStep('signature')}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Back
              </button>
              
              <button
                onClick={handleSave}
                disabled={!witnessName || !witnessSignatureData || isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Complete Signature'}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentStep === 'complete' && (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Signature Complete</h4>
          <p className="text-sm text-gray-600 mb-4">
            The {documentType} has been successfully signed and saved.
          </p>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"
          >
            Close
          </button>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <p>• This signature is legally binding and will be stored securely</p>
          <p>• Timestamp, IP address, and device information will be recorded</p>
          <p>• The signature cannot be modified after completion</p>
        </div>
      </div>
    </div>
  );
};

export default DigitalSignature;