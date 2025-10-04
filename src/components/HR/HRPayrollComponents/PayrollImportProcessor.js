// components/HR/HRPayrollComponents/PayrollImportProcessor.js
// Backend processor for Excel payroll import with CRA compliance

import { supabase } from '../../../supabaseClient';
import { SecurityWrapper } from '../../../Security';
import { useSecurityContext } from '../../../Security';
import { usePOSAuth } from '../../../hooks/usePOSAuth';
import { useCanadianTaxCalculations } from '../../../hooks/useCanadianTaxCalculations';
import { hashValue } from '../../../helpers/crypto';

/**
 * PayrollImportProcessor - Handles the actual database operations for importing Excel payroll data
 * Integrates with existing Tavari payroll system and maintains CRA compliance
 */
export class PayrollImportProcessor {
  constructor(businessId, authUser, logSecurityEvent, recordAction) {
    this.businessId = businessId;
    this.authUser = authUser;
    this.logSecurityEvent = logSecurityEvent;
    this.recordAction = recordAction;
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Main import function - processes the parsed Excel data
   */
  async processImport(parsedData, importOptions) {
    const results = {
      employeesCreated: 0,
      employeesUpdated: 0,
      payrollRunsCreated: 0,
      entriesImported: 0,
      entriesSkipped: 0,
      errors: [],
      warnings: [],
      employeeMapping: {},
      payrollRunMapping: {}
    };

    try {
      // Step 1: Process employees first
      console.log('Processing employees...');
      const employeeResults = await this.processEmployees(parsedData, importOptions);
      results.employeesCreated = employeeResults.created;
      results.employeesUpdated = employeeResults.updated;
      results.employeeMapping = employeeResults.mapping;
      results.errors.push(...employeeResults.errors);
      results.warnings.push(...employeeResults.warnings);

      // Step 2: Create payroll runs for each month
      console.log('Creating payroll runs...');
      const payrollRunResults = await this.createPayrollRuns(parsedData, importOptions);
      results.payrollRunsCreated = payrollRunResults.created;
      results.payrollRunMapping = payrollRunResults.mapping;
      results.errors.push(...payrollRunResults.errors);

      // Step 3: Import payroll entries
      console.log('Importing payroll entries...');
      const entriesResults = await this.importPayrollEntries(
        parsedData, 
        importOptions, 
        results.employeeMapping, 
        results.payrollRunMapping
      );
      results.entriesImported = entriesResults.imported;
      results.entriesSkipped = entriesResults.skipped;
      results.errors.push(...entriesResults.errors);
      results.warnings.push(...entriesResults.warnings);

      // Log completion
      await this.logSecurityEvent('payroll_import_completed', {
        business_id: this.businessId,
        employees_created: results.employeesCreated,
        entries_imported: results.entriesImported,
        payroll_runs_created: results.payrollRunsCreated,
        import_options: importOptions
      }, 'high');

      return results;

    } catch (error) {
      console.error('Import processing error:', error);
      results.errors.push(`Import failed: ${error.message}`);
      
      await this.logSecurityEvent('payroll_import_failed', {
        business_id: this.businessId,
        error: error.message,
        partial_results: results
      }, 'high');

      return results;
    }
  }

  /**
   * Process employees - create missing employees or update existing ones
   */
  async processEmployees(parsedData, importOptions) {
    const results = {
      created: 0,
      updated: 0,
      mapping: {},
      errors: [],
      warnings: []
    };

    // Collect all unique employee names from all sheets
    const allEmployeeNames = new Set();
    Object.values(parsedData).forEach(sheet => {
      sheet.structure.uniqueEmployees.forEach(name => {
        allEmployeeNames.add(name.trim());
      });
    });

    // Check which employees already exist
    const { data: existingEmployees, error: fetchError } = await supabase
      .from('users')
      .select('id, first_name, last_name, full_name, email')
      .in('full_name', Array.from(allEmployeeNames));

    if (fetchError) {
      results.errors.push(`Error fetching existing employees: ${fetchError.message}`);
      return results;
    }

    // Create mapping of existing employees
    const existingMapping = {};
    existingEmployees.forEach(emp => {
      existingMapping[emp.full_name] = emp.id;
      results.mapping[emp.full_name] = emp.id;
    });

    // Process missing employees
    if (importOptions.createEmployees) {
      for (const employeeName of allEmployeeNames) {
        if (!existingMapping[employeeName]) {
          try {
            const newEmployeeId = await this.createEmployee(employeeName, importOptions);
            if (newEmployeeId) {
              results.mapping[employeeName] = newEmployeeId;
              results.created++;
              results.warnings.push(`Created employee: ${employeeName}`);
            }
          } catch (error) {
            results.errors.push(`Failed to create employee ${employeeName}: ${error.message}`);
          }
        }
      }
    } else {
      // Add warnings for missing employees
      Array.from(allEmployeeNames).forEach(name => {
        if (!existingMapping[name]) {
          results.warnings.push(`Employee not found and creation disabled: ${name}`);
        }
      });
    }

    return results;
  }

  /**
   * Create a new employee record
   */
  async createEmployee(fullName, importOptions) {
    // Parse name - basic first/last name split
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || 'Unknown';
    
    // Generate email from name
    const emailBase = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z.]/g, '');
    const email = `${emailBase}@${this.businessId}.tavari-imported.com`;
    
    // Generate temporary password
    const tempPassword = `TempPass${Math.random().toString(36).substring(2, 10)}!`;
    const hashedPassword = await hashValue(tempPassword);
    const hashedPin = await hashValue('0000'); // Default PIN

    try {
      // Create Supabase Auth user
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: email,
        password: tempPassword,
      });

      if (signupError) {
        throw signupError;
      }

      const user = authData?.user;
      if (!user) {
        throw new Error('Auth user creation failed');
      }

      // Create users table record
      const { error: insertError } = await supabase.from('users').insert({
        id: user.id,
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        email: email,
        hashed_password: hashedPassword,
        pin: hashedPin,
        claim_code: importOptions.defaultClaimCode || 1,
        employment_status: 'active',
        status: 'active',
        roles: ['employee'],
        // Flag as imported
        import_source: 'excel_payroll_import',
        import_date: new Date().toISOString()
      });

      if (insertError) {
        throw insertError;
      }

      // Link to business
      const { error: businessUserError } = await supabase.from('business_users').insert({
        user_id: user.id,
        business_id: this.businessId,
        role: 'employee'
      });

      if (businessUserError) {
        throw businessUserError;
      }

      // Add user role
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: user.id,
        business_id: this.businessId,
        role: 'employee',
        active: true,
        custom_permissions: {}
      });

      if (roleError) {
        throw roleError;
      }

      // Log employee creation
      await this.logSecurityEvent('employee_created_via_import', {
        employee_id: user.id,
        employee_name: fullName,
        employee_email: email,
        claim_code: importOptions.defaultClaimCode || 1,
        business_id: this.businessId,
        created_by: this.authUser.id
      }, 'medium');

      console.log(`Created employee: ${fullName} (${email}) with ID: ${user.id}`);
      return user.id;

    } catch (error) {
      console.error(`Error creating employee ${fullName}:`, error);
      throw error;
    }
  }

  /**
   * Create payroll runs for each month in the imported data
   */
  async createPayrollRuns(parsedData, importOptions) {
    const results = {
      created: 0,
      mapping: {},
      errors: []
    };

    if (!importOptions.createPayrollRuns) {
      return results;
    }

    // Create payroll run for each sheet (month)
    for (const [sheetName, sheetData] of Object.entries(parsedData)) {
      try {
        const dateRange = sheetData.structure.dateRange;
        if (!dateRange.start || !dateRange.end) {
          results.errors.push(`No valid date range found for sheet: ${sheetName}`);
          continue;
        }

        // Check if payroll run already exists for this period
        const { data: existingRuns, error: checkError } = await supabase
          .from('hrpayroll_runs')
          .select('id')
          .eq('business_id', this.businessId)
          .gte('pay_period_start', dateRange.start.toISOString().split('T')[0])
          .lte('pay_period_end', dateRange.end.toISOString().split('T')[0]);

        if (checkError) {
          results.errors.push(`Error checking existing payroll runs for ${sheetName}: ${checkError.message}`);
          continue;
        }

        if (existingRuns.length > 0) {
          // Use existing payroll run
          results.mapping[sheetName] = existingRuns[0].id;
          console.log(`Using existing payroll run for ${sheetName}: ${existingRuns[0].id}`);
          continue;
        }

        // Create new payroll run
        const { data: newRun, error: createError } = await supabase
          .from('hrpayroll_runs')
          .insert({
            business_id: this.businessId,
            pay_period_start: dateRange.start.toISOString().split('T')[0],
            pay_period_end: dateRange.end.toISOString().split('T')[0],
            pay_date: dateRange.end.toISOString().split('T')[0], // Use end date as pay date
            status: 'finalized', // Mark as finalized since it's historical data
            created_by: this.authUser.id,
            import_source: 'excel_import',
            import_sheet_name: sheetName
          })
          .select()
          .single();

        if (createError) {
          results.errors.push(`Error creating payroll run for ${sheetName}: ${createError.message}`);
          continue;
        }

        results.mapping[sheetName] = newRun.id;
        results.created++;
        console.log(`Created payroll run for ${sheetName}: ${newRun.id}`);

      } catch (error) {
        results.errors.push(`Error processing payroll run for ${sheetName}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Import individual payroll entries
   */
  async importPayrollEntries(parsedData, importOptions, employeeMapping, payrollRunMapping) {
    const results = {
      imported: 0,
      skipped: 0,
      errors: [],
      warnings: []
    };

    // Process each sheet
    for (const [sheetName, sheetData] of Object.entries(parsedData)) {
      const payrollRunId = payrollRunMapping[sheetName];
      if (!payrollRunId) {
        results.errors.push(`No payroll run found for sheet: ${sheetName}`);
        continue;
      }

      console.log(`Processing ${sheetData.entries.length} entries for ${sheetName}`);

      // Check for existing entries if skip option is enabled
      let existingEntries = [];
      if (importOptions.skipExistingEntries) {
        const { data: existing, error: existingError } = await supabase
          .from('hrpayroll_entries')
          .select('user_id, payroll_run_id')
          .eq('payroll_run_id', payrollRunId);

        if (existingError) {
          results.errors.push(`Error checking existing entries for ${sheetName}: ${existingError.message}`);
          continue;
        }

        existingEntries = existing || [];
      }

      // Process entries in batches
      const batchSize = 50;
      const entries = sheetData.entries;
      
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        const entriesToInsert = [];

        for (const entry of batch) {
          const employeeId = employeeMapping[entry.employee];
          if (!employeeId) {
            results.warnings.push(`Employee not found for entry: ${entry.employee} on ${entry.date.toLocaleDateString()}`);
            continue;
          }

          // Check if entry already exists
          if (importOptions.skipExistingEntries) {
            const existsAlready = existingEntries.some(existing => 
              existing.user_id === employeeId && existing.payroll_run_id === payrollRunId
            );
            if (existsAlready) {
              results.skipped++;
              continue;
            }
          }

          // Validate and possibly recalculate taxes if option is enabled
          let finalEntry = { ...entry };
          if (importOptions.validateTaxCalculations) {
            try {
              // This would integrate with your CRA tax calculation system
              // finalEntry = await this.validateTaxCalculations(entry, employeeId);
              results.warnings.push(`Tax validation not implemented for ${entry.employee}`);
            } catch (error) {
              results.warnings.push(`Tax validation failed for ${entry.employee}: ${error.message}`);
            }
          }

          // Prepare entry for database
          entriesToInsert.push({
            payroll_run_id: payrollRunId,
            user_id: employeeId,
            pay_date: finalEntry.date.toISOString().split('T')[0],
            
            // Basic pay (we don't have hours breakdown, so estimate)
            regular_hours: 0, // Would need to be calculated from gross/wage
            overtime_hours: 0,
            lieu_hours: 0,
            
            // Pay amounts
            gross_pay: finalEntry.gross,
            vacation_pay: 0, // Calculate as 4% of gross if not separate
            
            // Deductions
            federal_tax: finalEntry.federal,
            provincial_tax: finalEntry.provincial,
            cpp_deduction: finalEntry.cpp,
            ei_deduction: finalEntry.ei,
            additional_tax: finalEntry.additionalTax || 0,
            
            // Net pay
            net_pay: finalEntry.netPay,
            
            // Import metadata
            import_source: 'excel_import',
            import_sheet_name: sheetName,
            import_date: new Date().toISOString(),
            
            // Premiums (empty for now)
            premiums: {},
            
            created_at: new Date().toISOString()
          });
        }

        // Insert batch
        if (entriesToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('hrpayroll_entries')
            .insert(entriesToInsert);

          if (insertError) {
            results.errors.push(`Error inserting batch for ${sheetName}: ${insertError.message}`);
          } else {
            results.imported += entriesToInsert.length;
            console.log(`Imported batch of ${entriesToInsert.length} entries for ${sheetName}`);
          }
        }
      }
    }

    return results;
  }

  /**
   * Validate and recalculate tax amounts using CRA compliant calculations
   * This would integrate with your useCanadianTaxCalculations hook
   */
  async validateTaxCalculations(entry, employeeId) {
    // This is where you would:
    // 1. Get employee's claim code from database
    // 2. Use your CRA tax calculation system to recalculate
    // 3. Compare with imported amounts
    // 4. Return corrected amounts if needed
    
    // For now, return original entry
    return entry;
  }

  /**
   * Helper function to parse various date formats from Excel
   */
  parseExcelDate(value) {
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    if (typeof value === 'number') {
      // Excel serial date
      return new Date((value - 25569) * 86400 * 1000);
    }
    return new Date();
  }

  /**
   * Clean up any failed imports
   */
  async cleanupFailedImport(importId) {
    // This would remove any partially imported data if the import fails
    console.log(`Cleaning up failed import: ${importId}`);
  }
}

/**
 * Helper function to validate Excel file structure
 */
export function validateExcelStructure(workbook) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    sheetsFound: 0,
    estimatedEntries: 0
  };

  try {
    // Check if workbook has sheets
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      validation.isValid = false;
      validation.errors.push('No sheets found in Excel file');
      return validation;
    }

    // Analyze each sheet
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        validation.warnings.push(`Sheet "${sheetName}" is empty`);
        return;
      }

      // Convert to array to analyze structure
      const data = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      if (data.length < 3) {
        validation.warnings.push(`Sheet "${sheetName}" has insufficient data`);
        return;
      }

      // Look for payroll-like headers
      const hasPayrollHeaders = data.slice(0, 3).some(row => 
        row.some(cell => 
          typeof cell === 'string' && 
          /^(employee|gross|fed|prov|cpp|ei|pay|date)$/i.test(cell.trim())
        )
      );

      if (hasPayrollHeaders) {
        validation.sheetsFound++;
        validation.estimatedEntries += Math.max(0, data.length - 3); // Rough estimate
      } else {
        validation.warnings.push(`Sheet "${sheetName}" doesn't appear to contain payroll data`);
      }
    });

    if (validation.sheetsFound === 0) {
      validation.isValid = false;
      validation.errors.push('No payroll sheets detected in file');
    }

  } catch (error) {
    validation.isValid = false;
    validation.errors.push(`Error analyzing Excel file: ${error.message}`);
  }

  return validation;
}

export default PayrollImportProcessor;