// components/HR/EmployeeSearchFilter.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebounce } from '../../hooks/useDebounce';

const EmployeeSearchFilter = ({ 
  employees = [], 
  onFilteredResults, 
  userContext,
  className = '',
  style = {},
  showAdvancedFilters = true,
  defaultFilters = {}
}) => {
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState(defaultFilters.searchTerm || '');
  const [statusFilter, setStatusFilter] = useState(defaultFilters.status || 'all');
  const [departmentFilter, setDepartmentFilter] = useState(defaultFilters.department || 'all');
  const [positionFilter, setPositionFilter] = useState(defaultFilters.position || 'all');
  const [managerFilter, setManagerFilter] = useState(defaultFilters.manager || 'all');
  const [roleFilter, setRoleFilter] = useState(defaultFilters.role || 'all');
  const [hireYearFilter, setHireYearFilter] = useState(defaultFilters.hireYear || 'all');
  const [wageRangeFilter, setWageRangeFilter] = useState(defaultFilters.wageRange || 'all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortBy, setSortBy] = useState(defaultFilters.sortBy || 'name');
  const [sortOrder, setSortOrder] = useState(defaultFilters.sortOrder || 'asc');

  // Debounce search term to avoid excessive filtering
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Extract unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const departments = [...new Set(employees
      .map(emp => emp.department)
      .filter(Boolean)
    )].sort();
    
    const positions = [...new Set(employees
      .map(emp => emp.position)
      .filter(Boolean)
    )].sort();
    
    const managers = [...new Set(employees
      .filter(emp => emp.manager)
      .map(emp => ({
        id: emp.manager.id,
        name: emp.manager.first_name && emp.manager.last_name 
          ? `${emp.manager.first_name} ${emp.manager.last_name}`
          : emp.manager.full_name || 'Unknown Manager',
        employee_number: emp.manager.employee_number
      }))
    )];
    
    const uniqueManagers = managers.reduce((acc, current) => {
      const exists = acc.find(mgr => mgr.id === current.id);
      if (!exists) acc.push(current);
      return acc;
    }, []).sort((a, b) => a.name.localeCompare(b.name));
    
    const roles = [...new Set(employees
      .map(emp => emp.business_users?.[0]?.role || emp.role || 'employee')
      .filter(Boolean)
    )].sort();
    
    const hireYears = [...new Set(employees
      .map(emp => {
        const hireDate = emp.hire_date || emp.start_date;
        return hireDate ? new Date(hireDate).getFullYear() : null;
      })
      .filter(Boolean)
    )].sort((a, b) => b - a);
    
    const statuses = [...new Set(employees
      .map(emp => emp.employment_status || emp.status || 'active')
      .filter(Boolean)
    )].sort();

    return {
      departments,
      positions,
      managers: uniqueManagers,
      roles,
      hireYears,
      statuses
    };
  }, [employees]);

  // Main filtering logic
  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = employees.filter(emp => {
      // Text search across multiple fields
      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase();
        const searchFields = [
          emp.first_name,
          emp.last_name,
          emp.full_name,
          emp.email,
          emp.phone,
          emp.employee_number,
          emp.position,
          emp.department,
          emp.business_phone,
          emp.manager?.first_name,
          emp.manager?.last_name,
          emp.manager?.full_name
        ].filter(Boolean);
        
        const matchesSearch = searchFields.some(field => 
          field.toLowerCase().includes(searchLower)
        );
        
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const empStatus = emp.employment_status || emp.status || 'active';
        if (empStatus !== statusFilter) return false;
      }

      // Department filter
      if (departmentFilter !== 'all') {
        if (emp.department !== departmentFilter) return false;
      }

      // Position filter
      if (positionFilter !== 'all') {
        if (emp.position !== positionFilter) return false;
      }

      // Manager filter
      if (managerFilter !== 'all') {
        if (emp.manager?.id !== managerFilter) return false;
      }

      // Role filter
      if (roleFilter !== 'all') {
        const empRole = emp.business_users?.[0]?.role || emp.role || 'employee';
        if (empRole !== roleFilter) return false;
      }

      // Hire year filter
      if (hireYearFilter !== 'all') {
        const hireDate = emp.hire_date || emp.start_date;
        if (!hireDate) return false;
        const hireYear = new Date(hireDate).getFullYear();
        if (hireYear !== parseInt(hireYearFilter)) return false;
      }

      // Wage range filter
      if (wageRangeFilter !== 'all' && emp.wage) {
        const wage = parseFloat(emp.wage);
        switch (wageRangeFilter) {
          case 'under-20':
            if (wage >= 20) return false;
            break;
          case '20-30':
            if (wage < 20 || wage >= 30) return false;
            break;
          case '30-40':
            if (wage < 30 || wage >= 40) return false;
            break;
          case '40-50':
            if (wage < 40 || wage >= 50) return false;
            break;
          case 'over-50':
            if (wage < 50) return false;
            break;
        }
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = (a.first_name && a.last_name) 
            ? `${a.first_name} ${a.last_name}` 
            : a.full_name || '';
          bValue = (b.first_name && b.last_name) 
            ? `${b.first_name} ${b.last_name}` 
            : b.full_name || '';
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'position':
          aValue = a.position || '';
          bValue = b.position || '';
          break;
        case 'department':
          aValue = a.department || '';
          bValue = b.department || '';
          break;
        case 'hire_date':
          aValue = new Date(a.hire_date || a.start_date || 0);
          bValue = new Date(b.hire_date || b.start_date || 0);
          break;
        case 'status':
          aValue = a.employment_status || a.status || 'active';
          bValue = b.employment_status || b.status || 'active';
          break;
        case 'wage':
          aValue = parseFloat(a.wage || 0);
          bValue = parseFloat(b.wage || 0);
          break;
        case 'employee_number':
          aValue = a.employee_number || '';
          bValue = b.employee_number || '';
          break;
        default:
          aValue = a.created_at || '';
          bValue = b.created_at || '';
      }

      if (sortBy === 'hire_date' || sortBy === 'wage') {
        // Numeric/date sorting
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      } else {
        // String sorting
        const comparison = aValue.toString().localeCompare(bValue.toString());
        return sortOrder === 'asc' ? comparison : -comparison;
      }
    });

    return filtered;
  }, [
    employees,
    debouncedSearchTerm,
    statusFilter,
    departmentFilter,
    positionFilter,
    managerFilter,
    roleFilter,
    hireYearFilter,
    wageRangeFilter,
    sortBy,
    sortOrder
  ]);

  // Notify parent of filtered results
  useEffect(() => {
    if (onFilteredResults) {
      onFilteredResults(filteredAndSortedEmployees);
    }
  }, [filteredAndSortedEmployees, onFilteredResults]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setPositionFilter('all');
    setManagerFilter('all');
    setRoleFilter('all');
    setHireYearFilter('all');
    setWageRangeFilter('all');
    setSortBy('name');
    setSortOrder('asc');
  }, []);

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (statusFilter !== 'all') count++;
    if (departmentFilter !== 'all') count++;
    if (positionFilter !== 'all') count++;
    if (managerFilter !== 'all') count++;
    if (roleFilter !== 'all') count++;
    if (hireYearFilter !== 'all') count++;
    if (wageRangeFilter !== 'all') count++;
    return count;
  }, [
    searchTerm,
    statusFilter,
    departmentFilter,
    positionFilter,
    managerFilter,
    roleFilter,
    hireYearFilter,
    wageRangeFilter
  ]);

  // Quick filter buttons
  const quickFilters = [
    { label: 'Active Only', filter: () => setStatusFilter('active') },
    { label: 'Recent Hires', filter: () => setHireYearFilter(new Date().getFullYear().toString()) },
    { label: 'No Manager', filter: () => setManagerFilter('none') },
    { label: 'Managers', filter: () => setRoleFilter('manager') }
  ];

  return (
    <div className={`employee-search-filter ${className}`} style={style}>
      {/* Search Bar */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6b7280',
              fontSize: '18px'
            }}>
              🔍
            </div>
            <input
              type="text"
              placeholder="Search employees by name, email, position, department, phone, or employee #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#14B8A6';
                e.target.style.boxShadow = '0 0 0 3px rgba(20, 184, 166, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              padding: '12px 16px',
              backgroundColor: showAdvanced ? '#14B8A6' : 'white',
              border: `1px solid ${showAdvanced ? '#14B8A6' : '#d1d5db'}`,
              color: showAdvanced ? 'white' : '#374151',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>

        {/* Quick Filters */}
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {quickFilters.map((quick, index) => (
            <button
              key={index}
              onClick={quick.filter}
              style={{
                padding: '6px 12px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                color: '#374151',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#f0fdfa';
                e.target.style.borderColor = '#14B8A6';
                e.target.style.color = '#0F766E';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#f9fafb';
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.color = '#374151';
              }}
            >
              {quick.label}
            </button>
          ))}
          
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              style={{
                padding: '6px 12px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Clear All ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvanced && showAdvancedFilters && (
          <div style={{
            borderTop: '1px solid #e5e7eb',
            paddingTop: '16px',
            marginTop: '16px'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '16px'
            }}>
              {/* Status Filter */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="all">All Statuses ({employees.length})</option>
                  {filterOptions.statuses.map(status => {
                    const count = employees.filter(emp => 
                      (emp.employment_status || emp.status || 'active') === status
                    ).length;
                    return (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Department Filter */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Department
                </label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="all">All Departments</option>
                  {filterOptions.departments.map(dept => {
                    const count = employees.filter(emp => emp.department === dept).length;
                    return (
                      <option key={dept} value={dept}>
                        {dept} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Position Filter */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Position
                </label>
                <select
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="all">All Positions</option>
                  {filterOptions.positions.map(pos => {
                    const count = employees.filter(emp => emp.position === pos).length;
                    return (
                      <option key={pos} value={pos}>
                        {pos} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Manager Filter */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Manager
                </label>
                <select
                  value={managerFilter}
                  onChange={(e) => setManagerFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="all">All Managers</option>
                  <option value="none">No Manager</option>
                  {filterOptions.managers.map(mgr => {
                    const count = employees.filter(emp => emp.manager?.id === mgr.id).length;
                    return (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.name} {mgr.employee_number && `(#${mgr.employee_number})`} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Role Filter */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Role
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="all">All Roles</option>
                  {filterOptions.roles.map(role => {
                    const count = employees.filter(emp => 
                      (emp.business_users?.[0]?.role || emp.role || 'employee') === role
                    ).length;
                    return (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Hire Year Filter */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Hire Year
                </label>
                <select
                  value={hireYearFilter}
                  onChange={(e) => setHireYearFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="all">All Years</option>
                  {filterOptions.hireYears.map(year => {
                    const count = employees.filter(emp => {
                      const hireDate = emp.hire_date || emp.start_date;
                      return hireDate && new Date(hireDate).getFullYear() === year;
                    }).length;
                    return (
                      <option key={year} value={year}>
                        {year} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Wage Range Filter */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Wage Range
                </label>
                <select
                  value={wageRangeFilter}
                  onChange={(e) => setWageRangeFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="all">All Wages</option>
                  <option value="under-20">Under $20/hr</option>
                  <option value="20-30">$20-30/hr</option>
                  <option value="30-40">$30-40/hr</option>
                  <option value="40-50">$40-50/hr</option>
                  <option value="over-50">Over $50/hr</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="name">Name</option>
                  <option value="email">Email</option>
                  <option value="position">Position</option>
                  <option value="department">Department</option>
                  <option value="hire_date">Hire Date</option>
                  <option value="status">Status</option>
                  <option value="wage">Wage</option>
                  <option value="employee_number">Employee #</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Sort Order
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="asc">Ascending (A-Z, 0-9)</option>
                  <option value="desc">Descending (Z-A, 9-0)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '12px 16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <div>
          <span style={{ fontSize: '14px', color: '#374151' }}>
            Showing <strong>{filteredAndSortedEmployees.length}</strong> of <strong>{employees.length}</strong> employees
          </span>
          {activeFilterCount > 0 && (
            <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
              ({activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied)
            </span>
          )}
        </div>
        
        {filteredAndSortedEmployees.length > 0 && (
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Sorted by {sortBy} ({sortOrder === 'asc' ? 'ascending' : 'descending'})
          </div>
        )}
      </div>
    </div>
  );
};

// Custom hook for debouncing search input
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default EmployeeSearchFilter;