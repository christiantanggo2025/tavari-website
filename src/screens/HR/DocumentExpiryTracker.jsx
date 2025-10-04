import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Calendar, AlertTriangle, CheckCircle, Clock, DollarSign, FileText, User, Bell } from 'lucide-react';

const DocumentExpiryTracker = () => {
  const [authUser, setAuthUser] = useState(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  
  const [expiringDocuments, setExpiringDocuments] = useState([]);
  const [wagePremiumRules, setWagePremiumRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDaysAhead, setSelectedDaysAhead] = useState(30);
  const [showPremiumCalculator, setShowPremiumCalculator] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [premiumCalculation, setPremiumCalculation] = useState(null);

  // Authentication logic following TabScreen pattern
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setAuthError('Please log in to access HR features');
          setAuthLoading(false);
          return;
        }

        setAuthUser(user);
        
        // Get user's businesses
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('business_id, role')
          .eq('user_id', user.id)
          .eq('active', true);

        if (rolesError) throw rolesError;
        
        if (!userRoles || userRoles.length === 0) {
          setAuthError('No business access found');
          setAuthLoading(false);
          return;
        }

        // For now, use the first business
        setSelectedBusinessId(userRoles[0].business_id);
        setAuthLoading(false);
      } catch (error) {
        console.error('Auth error:', error);
        setAuthError('Authentication failed');
        setAuthLoading(false);
      }
    };

    initAuth();
  }, []);

  // Load expiring documents
  useEffect(() => {
    if (!selectedBusinessId) return;
    
    loadExpiringDocuments();
    loadWagePremiumRules();
  }, [selectedBusinessId, selectedDaysAhead]);

  const loadExpiringDocuments = async () => {
    if (!selectedBusinessId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_expiring_documents', {
        p_business_id: selectedBusinessId,
        p_days_ahead: selectedDaysAhead
      });

      if (error) throw error;
      setExpiringDocuments(data || []);
    } catch (error) {
      console.error('Error loading expiring documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWagePremiumRules = async () => {
    if (!selectedBusinessId) return;

    try {
      const { data, error } = await supabase
        .from('wage_premium_rules')
        .select('*')
        .eq('business_id', selectedBusinessId)
        .eq('is_active', true);

      if (error) throw error;
      setWagePremiumRules(data || []);
    } catch (error) {
      console.error('Error loading wage premium rules:', error);
    }
  };

  const calculateEmployeePremiums = async (employeeId) => {
    if (!selectedBusinessId || !employeeId) return;

    try {
      const { data, error } = await supabase.rpc('calculate_employee_wage_premiums', {
        p_employee_id: employeeId,
        p_business_id: selectedBusinessId
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setPremiumCalculation(data[0]);
        setSelectedEmployee(employeeId);
        setShowPremiumCalculator(true);
      }
    } catch (error) {
      console.error('Error calculating premiums:', error);
    }
  };

  const sendExpiryNotifications = async () => {
    try {
      const { data, error } = await supabase.rpc('send_document_expiry_notifications');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const result = data[0];
        alert(`Sent ${result.notifications_sent} expiry notifications`);
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      alert('Failed to send notifications');
    }
  };

  const getExpiryStatusBadge = (status) => {
    const statusConfig = {
      'expired': { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle, text: 'Expired' },
      'expiring_soon': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, text: 'Expiring Soon' },
      'expiring_later': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Calendar, text: 'Expiring Later' },
      'valid': { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, text: 'Valid' }
    };

    const config = statusConfig[status] || statusConfig['valid'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount || 0);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (authError || !authUser || !selectedBusinessId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">{authError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingTop: '60px' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Document Expiry Tracker</h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor certification and license expiration dates with automatic wage premium calculations
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div>
                <label htmlFor="daysAhead" className="block text-sm font-medium text-gray-700">
                  Show documents expiring within:
                </label>
                <select
                  id="daysAhead"
                  value={selectedDaysAhead}
                  onChange={(e) => setSelectedDaysAhead(parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                >
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
            </div>
            
            <button
              onClick={sendExpiryNotifications}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              <Bell className="w-4 h-4 mr-2" />
              Send Notifications
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Expired Documents</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {expiringDocuments.filter(doc => doc.expiry_status === 'expired').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Expiring Soon</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {expiringDocuments.filter(doc => doc.expiry_status === 'expiring_soon').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">With Wage Premium</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {expiringDocuments.filter(doc => doc.has_wage_premium).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expiring Documents Table */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Documents Requiring Attention
            </h3>
          </div>
          
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600 mx-auto"></div>
            </div>
          ) : expiringDocuments.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              No documents expiring within {selectedDaysAhead} days
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expiry Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wage Premium
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expiringDocuments.map((doc) => (
                    <tr key={doc.document_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="h-4 w-4 text-gray-500" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{doc.employee_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{doc.file_name}</div>
                        <div className="text-sm text-gray-500 capitalize">
                          {doc.document_category.replace(/_/g, ' ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(doc.expiry_date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {doc.days_until_expiry >= 0 
                            ? `${doc.days_until_expiry} days remaining`
                            : `${Math.abs(doc.days_until_expiry)} days overdue`
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getExpiryStatusBadge(doc.expiry_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {doc.has_wage_premium ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <DollarSign className="w-3 h-3 mr-1" />
                            Has Premium
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">No Premium</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => calculateEmployeePremiums(doc.employee_id)}
                          className="text-teal-600 hover:text-teal-900 mr-3"
                        >
                          View Premiums
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Premium Calculator Modal */}
        {showPremiumCalculator && premiumCalculation && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Wage Premium Calculation
                      </h3>
                      
                      <div className="mt-4">
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">Base Wage:</span>
                            <span className="text-sm text-gray-900">{formatCurrency(premiumCalculation.base_wage)}/hour</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">Total Premiums:</span>
                            <span className="text-sm text-gray-900">{formatCurrency(premiumCalculation.total_premiums)}/hour</span>
                          </div>
                          <div className="border-t border-gray-200 pt-3">
                            <div className="flex justify-between">
                              <span className="text-base font-semibold text-gray-900">Final Wage:</span>
                              <span className="text-base font-semibold text-teal-600">{formatCurrency(premiumCalculation.final_wage)}/hour</span>
                            </div>
                          </div>
                        </div>

                        {premiumCalculation.premium_details && premiumCalculation.premium_details.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Premium Details:</h4>
                            <div className="space-y-2">
                              {premiumCalculation.premium_details.map((detail, index) => (
                                <div key={index} className="text-xs bg-blue-50 rounded p-2">
                                  <div className="font-medium capitalize">{detail.category.replace(/_/g, ' ')}</div>
                                  <div className="text-gray-600">
                                    {detail.type === 'fixed_amount' ? `+${formatCurrency(detail.value)}/hour` : 
                                     detail.type === 'percentage' ? `+${detail.value}% of base` :
                                     `Set to ${formatCurrency(detail.value)}/hour`}
                                  </div>
                                  <div className="text-gray-500">Expires: {new Date(detail.expiry_date).toLocaleDateString()}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setShowPremiumCalculator(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentExpiryTracker;