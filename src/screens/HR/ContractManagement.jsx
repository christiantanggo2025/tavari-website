import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Filter, Download, Upload, Eye, Edit, Trash2, AlertCircle, X, History, FileEdit, Shield, AlertTriangle, Calendar } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import ContractFileUpload from '../../components/HR/ContractFileUpload';
import ContractAmendmentModal from '../../components/HR/ContractAmendmentModal';
import ContractAmendmentHistory from '../../components/HR/ContractAmendmentHistory';
import ComplianceTrackingModal from '../../components/HR/ComplianceTrackingModal';

const ContractManagement = () => {
  const navigate = useNavigate();
  
  // Authentication state (inline like TabScreen)
  const [authUser, setAuthUser] = useState(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Component state
  const [contracts, setContracts] = useState([]);
  const [contractFiles, setContractFiles] = useState({});
  const [complianceRecords, setComplianceRecords] = useState({});
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showFileModal, setShowFileModal] = useState(false);
  const [error, setError] = useState(null);

  // Amendment state
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  const [showAmendmentHistory, setShowAmendmentHistory] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedContractFile, setSelectedContractFile] = useState(null);

  // Compliance state
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [selectedEmployeeForCompliance, setSelectedEmployeeForCompliance] = useState(null);

  // Authentication and business context setup (copied from TabScreen pattern)
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('ContractManagement: Initializing authentication...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('ContractManagement: Session check result:', { session: !!session, error });

        if (error || !session?.user) {
          console.error('ContractManagement: No valid session, redirecting to login');
          navigate('/login');
          return;
        }

        setAuthUser(session.user);
        console.log('ContractManagement: Authenticated as:', session.user.email);

        const currentBusinessId = localStorage.getItem('currentBusinessId');
        console.log('ContractManagement: Business ID from localStorage:', currentBusinessId);

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
          console.error('ContractManagement: User not authorized for this business:', roleError);
          setAuthError('Not authorized for this business');
          return;
        }

        console.log('ContractManagement: User role verified:', userRole.role);
        setAuthLoading(false);

      } catch (err) {
        console.error('ContractManagement: Authentication error:', err);
        setAuthError(err.message);
        setAuthLoading(false);
      }
    };

    initializeAuth();
  }, [navigate]);

  // Load contracts and related data
  useEffect(() => {
    if (selectedBusinessId) {
      loadContracts();
      loadEmployees();
    }
  }, [selectedBusinessId]);

  const loadComplianceData = async () => {
    if (!selectedBusinessId) return;

    try {
      const { data, error } = await supabase
        .from('compliance_dashboard')
        .select('*')
        .eq('business_id', selectedBusinessId);

      if (error) throw error;

      // Group compliance records by employee
      const complianceGrouped = (data || []).reduce((acc, record) => {
        if (!acc[record.employee_id]) {
          acc[record.employee_id] = [];
        }
        acc[record.employee_id].push(record);
        return acc;
      }, {});

      setComplianceRecords(complianceGrouped);
    } catch (error) {
      console.error('Error loading compliance data:', error);
      setComplianceRecords({});
    }
  };

  const loadContracts = async () => {
    try {
      setLoading(true);
      
      // First, load real employees from business_users relationship
      const { data: employeeData, error: employeeError } = await supabase
        .from('users')
        .select(`
          id, 
          full_name, 
          email,
          first_name,
          last_name,
          position,
          department,
          employment_status,
          hire_date,
          wage,
          business_users!inner(business_id, role)
        `)
        .eq('business_users.business_id', selectedBusinessId)
        .order('full_name');

      if (employeeError) {
        console.error('Error loading employees for contracts:', employeeError);
        setContracts([]);
        return;
      }

      // Create contracts for each real employee
      const realContracts = (employeeData || []).map((user, index) => {
        const firstName = user.first_name || user.full_name?.split(' ')[0] || 'Unknown';
        const lastName = user.last_name || user.full_name?.split(' ').slice(1).join(' ') || '';
        
        return {
          id: `contract_${user.id}`,
          employee_id: user.id,
          title: `${user.business_users[0]?.role === 'owner' ? 'Ownership Agreement' : 'Employment Contract'}`,
          status: user.business_users[0]?.role === 'owner' ? 'signed' : 'pending',
          contract_type: user.business_users[0]?.role === 'owner' ? 'Owner' : 'Employee',
          start_date: user.hire_date || '2024-01-01',
          end_date: null,
          created_at: '2024-01-01T00:00:00Z',
          employee: {
            id: user.id,
            first_name: firstName,
            last_name: lastName,
            employee_number: user.id.slice(0, 8),
            email: user.email,
            position: user.position,
            department: user.department,
            employment_status: user.employment_status,
            hire_date: user.hire_date,
            wage: user.wage
          }
        };
      });

      setContracts(realContracts);

      // Load contract files for all employees
      const employeeIds = realContracts.map(c => c.employee_id);
      if (employeeIds.length > 0) {
        const { data: filesData, error: filesError } = await supabase
          .from('contract_files')
          .select('*')
          .in('employee_id', employeeIds)
          .eq('business_id', selectedBusinessId);

        if (filesError) {
          console.error('Error loading files:', filesError);
        } else {
          // Group files by contract_id (using employee_id to map)
          const filesGrouped = (filesData || []).reduce((acc, file) => {
            const contract = realContracts.find(c => c.employee_id === file.employee_id);
            if (contract) {
              if (!acc[contract.id]) {
                acc[contract.id] = [];
              }
              acc[contract.id].push(file);
            }
            return acc;
          }, {});

          setContractFiles(filesGrouped);
        }
      }

      // Load compliance data
      await loadComplianceData();

    } catch (error) {
      console.error('Error loading contracts:', error);
      setError('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      // Load from users table using business_users relationship (like TabScreen pattern)
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, 
          full_name, 
          email,
          first_name,
          last_name,
          position,
          department,
          employment_status,
          hire_date,
          wage,
          business_users!inner(business_id, role)
        `)
        .eq('business_users.business_id', selectedBusinessId)
        .order('full_name');

      if (error) {
        console.error('Error loading employees:', error);
        setEmployees([]);
      } else {
        // Transform the data to match expected format
        const transformedEmployees = (data || []).map(user => ({
          id: user.id,
          first_name: user.first_name || user.full_name?.split(' ')[0] || 'Unknown',
          last_name: user.last_name || user.full_name?.split(' ').slice(1).join(' ') || '',
          employee_number: user.id.slice(0, 8), // Use first 8 chars of UUID as employee number
          email: user.email,
          position: user.position,
          department: user.department,
          employment_status: user.employment_status,
          hire_date: user.hire_date,
          wage: user.wage,
          role: user.business_users[0]?.role || 'employee'
        }));
        
        setEmployees(transformedEmployees);
        console.log('Loaded employees:', transformedEmployees);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    }
  };

  const handleFileUploadComplete = (contractId, uploadedFiles) => {
    // Update contract files state
    setContractFiles(prev => ({
      ...prev,
      [contractId]: [...(prev[contractId] || []), ...uploadedFiles]
    }));
    
    // Reload contracts to refresh file counts
    loadContracts();
  };

  // Amendment handlers
  const openAmendmentModal = (contract) => {
    const employee = contract.employee;
    const contractFile = contractFiles[contract.id]?.[0]; // Get first contract file
    setSelectedEmployee(employee);
    setSelectedContractFile(contractFile);
    setShowAmendmentModal(true);
  };

  const openAmendmentHistory = (contract) => {
    setSelectedEmployee(contract.employee);
    setShowAmendmentHistory(true);
  };

  const handleAmendmentComplete = () => {
    setShowAmendmentModal(false);
    setSelectedEmployee(null);
    setSelectedContractFile(null);
    // Optionally reload data here
  };

  const handleHistoryClose = () => {
    setShowAmendmentHistory(false);
    setSelectedEmployee(null);
  };

  // Compliance handlers
  const openComplianceModal = (employee) => {
    setSelectedEmployeeForCompliance(employee);
    setShowComplianceModal(true);
  };

  const handleComplianceCreated = () => {
    setShowComplianceModal(false);
    setSelectedEmployeeForCompliance(null);
    loadComplianceData(); // Refresh compliance data
  };

  const getComplianceStatus = (employeeId) => {
    const records = complianceRecords[employeeId] || [];
    
    const criticalCount = records.filter(r => r.priority_level === 'critical').length;
    const overdueCount = records.filter(r => r.compliance_status === 'overdue').length;
    const pendingCount = records.filter(r => r.compliance_status === 'pending').length;
    
    if (criticalCount > 0 || overdueCount > 0) {
      return { status: 'critical', count: criticalCount + overdueCount, color: '#dc2626' };
    } else if (pendingCount > 0) {
      return { status: 'pending', count: pendingCount, color: '#f59e0b' };
    } else if (records.length > 0) {
      return { status: 'compliant', count: records.length, color: '#059669' };
    }
    
    return { status: 'none', count: 0, color: '#6b7280' };
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = !searchTerm || 
      contract.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.employee?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.employee?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.employee?.employee_number?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'signed': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Loading and error states (same pattern as TabScreen)
  if (authLoading) {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
        <h3>Loading Contract Management...</h3>
        <p>Authenticating user and loading business data...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
        <h3>Authentication Error</h3>
        <p>{authError}</p>
        <button 
          style={styles.createButton}
          onClick={() => navigate('/login')}
        >
          Return to Login
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading contracts...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2>Contract Management</h2>
        <p>Manage employment contracts, amendments, and compliance tracking</p>
      </div>

      {/* Error Message */}
      {error && (
        <div style={styles.errorBanner}>
          <AlertCircle size={20} style={{ marginRight: '8px' }} />
          {error}
          <button
            onClick={() => setError(null)}
            style={styles.errorClose}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.searchSection}>
          <div style={styles.searchGroup}>
            <Search size={20} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search contracts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <div style={styles.filterGroup}>
            <Filter size={20} style={styles.filterIcon} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="signed">Signed</option>
              <option value="expired">Expired</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={styles.createButton}
        >
          <Plus size={20} style={{ marginRight: '8px' }} />
          New Contract
        </button>
      </div>

      {/* Contracts Grid */}
      <div style={styles.content}>
        {filteredContracts.length === 0 ? (
          <div style={styles.emptyState}>
            <FileText size={64} style={styles.emptyIcon} />
            <h3 style={styles.emptyTitle}>No contracts found</h3>
            <p style={styles.emptyText}>
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search filters.' 
                : 'Get started by creating your first employment contract.'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                style={styles.createButton}
              >
                Create First Contract
              </button>
            )}
          </div>
        ) : (
          <div style={styles.contractGrid}>
            {filteredContracts.map((contract) => (
              <div key={contract.id} style={styles.contractCard}>
                {/* Contract Header */}
                <div style={styles.contractHeader}>
                  <div style={styles.contractTitle}>
                    {contract.title || 'Employment Contract'}
                  </div>
                  <span style={{
                    ...styles.statusBadge,
                    ...getStatusStyle(contract.status)
                  }}>
                    {contract.status}
                  </span>
                </div>

                {/* Contract Details */}
                <div style={styles.contractBody}>
                  <div style={styles.employeeInfo}>
                    <div style={styles.employeeName}>
                      {contract.employee?.first_name} {contract.employee?.last_name}
                    </div>
                    <div style={styles.employeeNumber}>
                      Employee #: {contract.employee?.employee_number}
                    </div>
                    <div style={styles.contractType}>
                      Type: {contract.contract_type || 'Standard'}
                    </div>
                    {contract.employee?.position && (
                      <div style={styles.contractType}>
                        Position: {contract.employee.position}
                      </div>
                    )}
                    {contract.employee?.wage && (
                      <div style={styles.contractType}>
                        Wage: ${contract.employee.wage}/hour
                      </div>
                    )}
                  </div>

                  <div style={styles.contractDates}>
                    <div style={styles.dateRow}>
                      <span>Start Date:</span>
                      <span>{contract.start_date ? new Date(contract.start_date).toLocaleDateString() : 'Not set'}</span>
                    </div>
                    <div style={styles.dateRow}>
                      <span>End Date:</span>
                      <span>{contract.end_date ? new Date(contract.end_date).toLocaleDateString() : 'Indefinite'}</span>
                    </div>
                  </div>

                  {/* File Count */}
                  <div style={styles.fileInfo}>
                    <FileText size={16} style={{ marginRight: '8px' }} />
                    <span>{contractFiles[contract.id]?.length || 0} attached files</span>
                  </div>

                  {/* Compliance Status */}
                  {(() => {
                    const compliance = getComplianceStatus(contract.employee_id);
                    return (
                      <div style={styles.complianceSection}>
                        <div style={styles.complianceHeader}>
                          <Shield size={16} style={{ color: compliance.color }} />
                          <span style={styles.complianceTitle}>Compliance Status</span>
                        </div>
                        
                        <div style={styles.complianceStatus}>
                          {compliance.status === 'none' ? (
                            <span style={{ color: '#6b7280', fontSize: '14px' }}>No compliance records</span>
                          ) : (
                            <span style={{ color: compliance.color, fontSize: '14px', fontWeight: 'bold' }}>
                              {compliance.count} {compliance.status === 'critical' ? 'Critical/Overdue' : 
                               compliance.status === 'pending' ? 'Pending' : 'Records'}
                            </span>
                          )}
                        </div>

                        {complianceRecords[contract.employee_id] && complianceRecords[contract.employee_id].length > 0 && (
                          <div style={styles.complianceList}>
                            {complianceRecords[contract.employee_id].slice(0, 3).map((record) => (
                              <div key={record.id} style={styles.complianceItem}>
                                <div style={styles.complianceType}>
                                  {record.compliance_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </div>
                                <div style={styles.complianceDate}>
                                  {record.days_until_due !== null && (
                                    <span style={{
                                      color: record.days_until_due < 0 ? '#dc2626' : 
                                            record.days_until_due <= 7 ? '#f59e0b' : '#059669',
                                      fontSize: '12px'
                                    }}>
                                      {record.days_until_due < 0 ? `${Math.abs(record.days_until_due)} days overdue` : 
                                       record.days_until_due === 0 ? 'Due today' :
                                       `${record.days_until_due} days left`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {complianceRecords[contract.employee_id].length > 3 && (
                              <div style={styles.moreCompliance}>
                                +{complianceRecords[contract.employee_id].length - 3} more...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Actions */}
                <div style={styles.contractActions}>
                  <button
                    onClick={() => {
                      setSelectedContract(contract);
                      setShowFileModal(true);
                    }}
                    style={styles.actionButton}
                  >
                    <Upload size={16} />
                    Files
                  </button>
                  <button
                    onClick={() => openAmendmentModal(contract)}
                    style={styles.actionButton}
                    title="Create Amendment"
                  >
                    <FileEdit size={16} />
                    Amend
                  </button>
                  <button
                    onClick={() => openComplianceModal(contract.employee)}
                    style={styles.actionButton}
                    title="Add Compliance Record"
                  >
                    <Shield size={16} />
                    Compliance
                  </button>
                  <button
                    onClick={() => openAmendmentHistory(contract)}
                    style={styles.actionButton}
                    title="View Amendment History"
                  >
                    <History size={16} />
                    History
                  </button>
                  <button
                    onClick={() => {
                      console.log('View/Edit contract:', contract.id);
                    }}
                    style={styles.actionButton}
                  >
                    <Eye size={16} />
                    View
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this contract?')) {
                        console.log('Delete contract:', contract.id);
                      }
                    }}
                    style={styles.deleteButton}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Management Modal */}
      {showFileModal && selectedContract && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>Contract Files</h2>
                <p style={styles.modalSubtitle}>
                  {selectedContract.employee?.first_name} {selectedContract.employee?.last_name} - {selectedContract.title || 'Employment Contract'}
                </p>
              </div>
              <button
                onClick={() => setShowFileModal(false)}
                style={styles.modalClose}
              >
                <X size={24} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <ContractFileUpload
                employeeId={selectedContract.employee_id}
                existingFiles={contractFiles[selectedContract.id] || []}
                onUploadComplete={(files) => handleFileUploadComplete(selectedContract.id, files)}
                allowMultiple={true}
                maxFileSize={10 * 1024 * 1024} // 10MB
                acceptedTypes={['.pdf', '.doc', '.docx', '.txt', '.jpg', '.png']}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Contract Modal - Simplified */}
      {showCreateModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.createModal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Create New Contract</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={styles.modalClose}
              >
                <X size={24} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Employee</label>
                <select style={styles.formSelect}>
                  <option value="">Select employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} (#{emp.employee_number})
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Contract Title</label>
                <input 
                  type="text" 
                  placeholder="Employment Contract"
                  style={styles.formInput}
                />
              </div>
              <div style={styles.formActions}>
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle create - simplified for now
                    setShowCreateModal(false);
                  }}
                  style={styles.createButton}
                >
                  Create Contract
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Amendment Modal */}
      <ContractAmendmentModal
        isOpen={showAmendmentModal}
        onClose={handleAmendmentComplete}
        employee={selectedEmployee}
        originalContract={selectedContractFile}
        businessId={selectedBusinessId}
      />

      {/* Amendment History Modal */}
      <ContractAmendmentHistory
        isOpen={showAmendmentHistory}
        onClose={handleHistoryClose}
        employee={selectedEmployee}
        businessId={selectedBusinessId}
      />

      {/* Compliance Tracking Modal */}
      <ComplianceTrackingModal
        isOpen={showComplianceModal}
        onClose={() => {
          setShowComplianceModal(false);
          setSelectedEmployeeForCompliance(null);
        }}
        employee={selectedEmployeeForCompliance}
        businessId={selectedBusinessId}
        onComplianceCreated={handleComplianceCreated}
      />
    </div>
  );
};

// Helper function for status styling
const getStatusStyle = (status) => {
  switch (status) {
    case 'draft': 
      return { backgroundColor: '#f3f4f6', color: '#374151' };
    case 'pending': 
      return { backgroundColor: '#fef3c7', color: '#d97706' };
    case 'signed': 
      return { backgroundColor: '#d1fae5', color: '#059669' };
    case 'expired': 
      return { backgroundColor: '#fee2e2', color: '#dc2626' };
    case 'terminated': 
      return { backgroundColor: '#fee2e2', color: '#dc2626' };
    default: 
      return { backgroundColor: '#f3f4f6', color: '#374151' };
  }
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f8f9fa',
    padding: '20px',
    paddingTop: '100px',
    boxSizing: 'border-box'
  },
  header: {
    marginBottom: '30px',
    textAlign: 'center'
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    position: 'relative'
  },
  errorClose: {
    position: 'absolute',
    right: '15px',
    background: 'none',
    border: 'none',
    color: '#dc2626',
    cursor: 'pointer'
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    gap: '20px',
    flexWrap: 'wrap'
  },
  searchSection: {
    display: 'flex',
    gap: '15px',
    flex: 1
  },
  searchGroup: {
    position: 'relative',
    flex: 1,
    minWidth: '300px'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#6b7280'
  },
  searchInput: {
    width: '100%',
    paddingLeft: '40px',
    paddingRight: '12px',
    paddingTop: '12px',
    paddingBottom: '12px',
    border: '2px solid #008080',
    borderRadius: '8px',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  filterGroup: {
    position: 'relative',
    minWidth: '150px'
  },
  filterIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#6b7280'
  },
  filterSelect: {
    width: '100%',
    paddingLeft: '40px',
    paddingRight: '12px',
    paddingTop: '12px',
    paddingBottom: '12px',
    border: '2px solid #008080',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  createButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  content: {
    flex: 1,
    overflowY: 'auto'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  },
  emptyIcon: {
    color: '#9ca3af',
    marginBottom: '20px'
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#374151'
  },
  emptyText: {
    fontSize: '16px',
    marginBottom: '30px'
  },
  contractGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '20px',
    paddingBottom: '20px'
  },
  contractCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease'
  },
  contractHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '15px',
    borderBottom: '1px solid #f3f4f6'
  },
  contractTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  contractBody: {
    marginBottom: '20px'
  },
  employeeInfo: {
    marginBottom: '15px'
  },
  employeeName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '4px'
  },
  employeeNumber: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '4px'
  },
  contractType: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '4px'
  },
  contractDates: {
    marginBottom: '15px'
  },
  dateRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    marginBottom: '4px'
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#6b7280',
    padding: '8px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    marginBottom: '15px'
  },
  complianceSection: {
    marginTop: '15px',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  complianceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px'
  },
  complianceTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151'
  },
  complianceStatus: {
    marginBottom: '8px'
  },
  complianceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  complianceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    borderBottom: '1px solid #e5e7eb'
  },
  complianceType: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500'
  },
  complianceDate: {
    fontSize: '12px'
  },
  moreCompliance: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingTop: '4px'
  },
  contractActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr) repeat(3, auto)',
    gap: '8px'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    justifyContent: 'center'
  },
  deleteButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 12px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  },
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
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  createModal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0
  },
  modalSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0'
  },
  modalClose: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px'
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  formGroup: {
    marginBottom: '20px'
  },
  formLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px'
  },
  formInput: {
    width: '100%',
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  formSelect: {
    width: '100%',
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px'
  },
  cancelButton: {
    padding: '12px 20px',
    backgroundColor: 'white',
    color: '#374151',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    fontSize: '18px',
    color: '#6b7280'
  }
};

export default ContractManagement;