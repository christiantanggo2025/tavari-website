// src/screens/POS/POSStationsScreen.jsx
// Steps 109-110: Complete station management with printer assignment
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import { logAction } from '../../helpers/posAudit';

const POSStationsScreen = () => {
  const { business } = useBusiness();
  const businessId = business?.id;

  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New station form
  const [newStationName, setNewStationName] = useState('');
  const [newStationDescription, setNewStationDescription] = useState('');
  const [newStationPrinters, setNewStationPrinters] = useState([]);

  // Edit station form
  const [editStationId, setEditStationId] = useState(null);
  const [editStationName, setEditStationName] = useState('');
  const [editStationDescription, setEditStationDescription] = useState('');
  const [editStationPrinters, setEditStationPrinters] = useState([]);
  const [editStationActive, setEditStationActive] = useState(true);

  // Available printers (this would normally come from a printer discovery service)
  const [availablePrinters, setAvailablePrinters] = useState([
    { id: 'kitchen-thermal-1', name: 'Kitchen Thermal Printer #1', type: 'thermal', status: 'online' },
    { id: 'kitchen-thermal-2', name: 'Kitchen Thermal Printer #2', type: 'thermal', status: 'offline' },
    { id: 'bar-receipt-1', name: 'Bar Receipt Printer', type: 'receipt', status: 'online' },
    { id: 'expo-display-1', name: 'Expo Display Printer', type: 'display', status: 'online' },
    { id: 'manager-office-1', name: 'Manager Office Printer', type: 'standard', status: 'online' }
  ]);

  useEffect(() => {
    if (businessId) {
      fetchStations();
      // In a real implementation, you would also fetch available printers from the system
      // discoverPrinters();
    }
  }, [businessId]);

  const fetchStations = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('pos_stations')
        .select('*')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setStations(data || []);

      await logAction({
        action: 'pos_stations_loaded',
        context: 'POSStationsScreen',
        metadata: { station_count: data?.length || 0 }
      });

    } catch (err) {
      setError('Error fetching stations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addStation = async () => {
    if (!newStationName.trim()) {
      setError('Station name is required');
      return;
    }

    setError(null);
    try {
      const maxSortOrder = stations.length > 0 ? Math.max(...stations.map(s => s.sort_order || 0)) : 0;

      const { error } = await supabase.from('pos_stations').insert([{
        business_id: businessId,
        name: newStationName.trim(),
        description: newStationDescription.trim() || null,
        printer_ids: newStationPrinters.length > 0 ? newStationPrinters : null,
        is_active: true,
        sort_order: maxSortOrder + 1,
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;

      await logAction({
        action: 'pos_station_created',
        context: 'POSStationsScreen',
        metadata: {
          station_name: newStationName.trim(),
          printers_assigned: newStationPrinters.length
        }
      });

      // Reset form
      setNewStationName('');
      setNewStationDescription('');
      setNewStationPrinters([]);

      fetchStations();
    } catch (err) {
      setError('Error adding station: ' + err.message);
    }
  };

  const startEditStation = (station) => {
    setEditStationId(station.id);
    setEditStationName(station.name);
    setEditStationDescription(station.description || '');
    setEditStationPrinters(Array.isArray(station.printer_ids) ? station.printer_ids : []);
    setEditStationActive(station.is_active !== false);
  };

  const cancelEdit = () => {
    setEditStationId(null);
    setEditStationName('');
    setEditStationDescription('');
    setEditStationPrinters([]);
    setEditStationActive(true);
  };

  const saveEditStation = async () => {
    if (!editStationName.trim()) {
      setError('Station name is required');
      return;
    }

    setError(null);
    try {
      const { error } = await supabase
        .from('pos_stations')
        .update({
          name: editStationName.trim(),
          description: editStationDescription.trim() || null,
          printer_ids: editStationPrinters.length > 0 ? editStationPrinters : null,
          is_active: editStationActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', editStationId);

      if (error) throw error;

      await logAction({
        action: 'pos_station_updated',
        context: 'POSStationsScreen',
        metadata: {
          station_id: editStationId,
          station_name: editStationName.trim(),
          printers_assigned: editStationPrinters.length,
          is_active: editStationActive
        }
      });

      cancelEdit();
      fetchStations();
    } catch (err) {
      setError('Error updating station: ' + err.message);
    }
  };

  const deleteStation = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete station "${name}"? This action cannot be undone.`)) return;

    setError(null);
    try {
      const { error } = await supabase.from('pos_stations').delete().eq('id', id);
      if (error) throw error;

      await logAction({
        action: 'pos_station_deleted',
        context: 'POSStationsScreen',
        metadata: { station_id: id, station_name: name }
      });

      fetchStations();
    } catch (err) {
      setError('Error deleting station: ' + err.message);
    }
  };

  const moveStation = async (id, direction) => {
    setError(null);
    try {
      const index = stations.findIndex(s => s.id === id);
      if (index === -1) return;

      const swapIndex = index + direction;
      if (swapIndex < 0 || swapIndex >= stations.length) return;

      const stationA = stations[index];
      const stationB = stations[swapIndex];

      const updates = [
        { id: stationA.id, sort_order: stationB.sort_order || 0 },
        { id: stationB.id, sort_order: stationA.sort_order || 0 }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('pos_stations')
          .update({ 
            sort_order: update.sort_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);
        if (error) throw error;
      }

      await logAction({
        action: 'pos_station_reordered',
        context: 'POSStationsScreen',
        metadata: {
          station_a: stationA.name,
          station_b: stationB.name,
          direction: direction > 0 ? 'down' : 'up'
        }
      });

      fetchStations();
    } catch (err) {
      setError('Error moving station: ' + err.message);
    }
  };

  const toggleStationStatus = async (id, currentStatus, name) => {
    const newStatus = !currentStatus;
    
    try {
      const { error } = await supabase
        .from('pos_stations')
        .update({ 
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await logAction({
        action: 'pos_station_status_changed',
        context: 'POSStationsScreen',
        metadata: {
          station_id: id,
          station_name: name,
          old_status: currentStatus,
          new_status: newStatus
        }
      });

      fetchStations();
    } catch (err) {
      console.error('Error toggling station status:', err);
      setError('Error updating station status: ' + err.message);
    }
  };

  const handlePrinterToggle = (printerId, isNew = true) => {
    const printersArray = isNew ? newStationPrinters : editStationPrinters;
    const setPrintersArray = isNew ? setNewStationPrinters : setEditStationPrinters;
    
    if (printersArray.includes(printerId)) {
      setPrintersArray(printersArray.filter(id => id !== printerId));
    } else {
      setPrintersArray([...printersArray, printerId]);
    }
  };

  const testPrinterConnection = async (printerId) => {
    const printer = availablePrinters.find(p => p.id === printerId);
    if (!printer) return;

    // Simulate printer test
    setError(null);
    try {
      // In a real implementation, this would send a test print job
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert(`✅ Test print sent to ${printer.name}\n\nThis would normally send a test receipt to verify the connection.`);
      
      await logAction({
        action: 'pos_printer_test',
        context: 'POSStationsScreen',
        metadata: {
          printer_id: printerId,
          printer_name: printer.name
        }
      });

    } catch (err) {
      setError('Error testing printer: ' + err.message);
    }
  };

  const getPrinterNames = (printerIds) => {
    if (!Array.isArray(printerIds) || printerIds.length === 0) return 'No printers assigned';
    
    return printerIds
      .map(id => {
        const printer = availablePrinters.find(p => p.id === id);
        return printer ? printer.name : `Unknown Printer (${id})`;
      })
      .join(', ');
  };

  const getPrinterStatus = (printerId) => {
    const printer = availablePrinters.find(p => p.id === printerId);
    return printer ? printer.status : 'unknown';
  };

  if (!businessId) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Please select a business to manage stations.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading stations...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>POS Station Management</h2>
        <p>Configure order routing stations and assign printers for kitchen, bar, and other areas</p>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Add New Station Form */}
      <div style={styles.addSection}>
        <h3 style={styles.sectionTitle}>Add New Station</h3>
        <div style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Station Name *</label>
              <input
                type="text"
                placeholder="e.g., Kitchen, Bar, Grill, Prep"
                value={newStationName}
                onChange={(e) => setNewStationName(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <input
                type="text"
                placeholder="Optional description"
                value={newStationDescription}
                onChange={(e) => setNewStationDescription(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          {/* Printer Assignment */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Assign Printers</label>
            <div style={styles.printersGrid}>
              {availablePrinters.map(printer => (
                <div key={printer.id} style={styles.printerCard}>
                  <div style={styles.printerInfo}>
                    <label style={styles.printerCheckbox}>
                      <input
                        type="checkbox"
                        checked={newStationPrinters.includes(printer.id)}
                        onChange={() => handlePrinterToggle(printer.id, true)}
                      />
                      <span style={styles.printerName}>{printer.name}</span>
                    </label>
                    <div style={styles.printerMeta}>
                      <span style={styles.printerType}>{printer.type}</span>
                      <span style={{
                        ...styles.printerStatus,
                        color: printer.status === 'online' ? '#059669' : '#dc2626'
                      }}>
                        {printer.status}
                      </span>
                    </div>
                  </div>
                  <button
                    style={styles.testButton}
                    onClick={() => testPrinterConnection(printer.id)}
                    disabled={printer.status !== 'online'}
                    title="Test printer connection"
                  >
                    🖨️ Test
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={addStation} 
            style={styles.addButton}
            disabled={!newStationName.trim()}
          >
            Add Station
          </button>
        </div>
      </div>

      {/* Stations Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Assigned Printers</th>
              <th style={styles.th}>Order</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stations.length === 0 && (
              <tr>
                <td colSpan="6" style={styles.emptyCell}>
                  No stations found. Create your first station above.
                </td>
              </tr>
            )}
            {stations.map((station, i) => (
              <tr key={station.id} style={{
                ...styles.row,
                backgroundColor: i % 2 === 0 ? '#f9f9f9' : 'white',
                opacity: station.is_active === false ? 0.6 : 1
              }}>
                <td style={styles.td}>
                  <div
                    style={{
                      ...styles.statusIndicator,
                      backgroundColor: station.is_active !== false ? '#059669' : '#dc2626'
                    }}
                    title={station.is_active !== false ? 'Active' : 'Inactive'}
                  />
                </td>
                
                <td style={styles.td}>
                  {editStationId === station.id ? (
                    <input
                      type="text"
                      value={editStationName}
                      onChange={(e) => setEditStationName(e.target.value)}
                      style={styles.input}
                    />
                  ) : (
                    <div style={styles.stationName}>
                      {station.name}
                      {station.is_active === false && (
                        <span style={styles.inactiveLabel}> (Inactive)</span>
                      )}
                    </div>
                  )}
                </td>
                
                <td style={styles.td}>
                  {editStationId === station.id ? (
                    <input
                      type="text"
                      value={editStationDescription}
                      onChange={(e) => setEditStationDescription(e.target.value)}
                      style={styles.input}
                      placeholder="Optional description"
                    />
                  ) : (
                    station.description || '—'
                  )}
                </td>
                
                <td style={styles.td}>
                  {editStationId === station.id ? (
                    <div style={styles.editPrintersSection}>
                      <div style={styles.editPrintersGrid}>
                        {availablePrinters.map(printer => (
                          <label key={printer.id} style={styles.editPrinterCheckbox}>
                            <input
                              type="checkbox"
                              checked={editStationPrinters.includes(printer.id)}
                              onChange={() => handlePrinterToggle(printer.id, false)}
                            />
                            <span style={styles.editPrinterName}>{printer.name}</span>
                            <span style={{
                              ...styles.editPrinterStatus,
                              color: printer.status === 'online' ? '#059669' : '#dc2626'
                            }}>
                              ({printer.status})
                            </span>
                          </label>
                        ))}
                      </div>
                      <div style={styles.statusToggle}>
                        <label style={styles.statusCheckbox}>
                          <input
                            type="checkbox"
                            checked={editStationActive}
                            onChange={(e) => setEditStationActive(e.target.checked)}
                          />
                          Active Station
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.printersDisplay}>
                      <div style={styles.printersList}>
                        {getPrinterNames(station.printer_ids)}
                      </div>
                      {Array.isArray(station.printer_ids) && station.printer_ids.length > 0 && (
                        <div style={styles.printersStatus}>
                          {station.printer_ids.map(printerId => {
                            const status = getPrinterStatus(printerId);
                            return (
                              <span
                                key={printerId}
                                style={{
                                  ...styles.statusBadge,
                                  backgroundColor: status === 'online' ? '#d1fae5' : '#fee2e2',
                                  color: status === 'online' ? '#059669' : '#dc2626'
                                }}
                              >
                                {status}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                
                <td style={styles.td}>
                  <div style={styles.orderControls}>
                    <button
                      onClick={() => moveStation(station.id, -1)}
                      disabled={i === 0}
                      style={styles.orderButton}
                      title="Move Up"
                    >
                      ↑
                    </button>
                    <span style={styles.orderNumber}>{i + 1}</span>
                    <button
                      onClick={() => moveStation(station.id, 1)}
                      disabled={i === stations.length - 1}
                      style={styles.orderButton}
                      title="Move Down"
                    >
                      ↓
                    </button>
                  </div>
                </td>
                
                <td style={styles.td}>
                  {editStationId === station.id ? (
                    <div style={styles.editActions}>
                      <button 
                        onClick={saveEditStation} 
                        style={styles.saveButton}
                        disabled={!editStationName.trim()}
                      >
                        Save
                      </button>
                      <button onClick={cancelEdit} style={styles.cancelButton}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={styles.actions}>
                      <button 
                        onClick={() => startEditStation(station)} 
                        style={styles.editButton}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleStationStatus(station.id, station.is_active !== false, station.name)}
                        style={{
                          ...styles.toggleButton,
                          backgroundColor: station.is_active !== false ? '#f59e0b' : '#059669'
                        }}
                      >
                        {station.is_active !== false ? 'Disable' : 'Enable'}
                      </button>
                      <button 
                        onClick={() => deleteStation(station.id, station.name)} 
                        style={styles.deleteButton}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info Panel */}
      <div style={styles.infoPanel}>
        <h3 style={styles.infoTitle}>Station & Printer Management</h3>
        <div style={styles.infoGrid}>
          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>🏠</div>
            <div style={styles.infoContent}>
              <div style={styles.infoLabel}>Stations</div>
              <div style={styles.infoText}>
                Define areas where orders are prepared (Kitchen, Bar, Grill). Each station can route to multiple printers.
              </div>
            </div>
          </div>
          
          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>🖨️</div>
            <div style={styles.infoContent}>
              <div style={styles.infoLabel}>Printers</div>
              <div style={styles.infoText}>
                Assign thermal printers, receipt printers, or displays to stations. Test connections to ensure reliability.
              </div>
            </div>
          </div>
          
          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>🔄</div>
            <div style={styles.infoContent}>
              <div style={styles.infoLabel}>Order Routing</div>
              <div style={styles.infoText}>
                When items are ordered, they automatically print to their assigned station's printers for preparation.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontWeight: 'bold'
  },
  error: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    fontSize: '18px',
    color: '#dc2626'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    fontSize: '18px',
    color: '#6b7280'
  },
  addSection: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '30px',
    border: '2px solid #008080'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '2px solid #008080'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '8px'
  },
  input: {
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px'
  },
  printersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '12px',
    marginTop: '8px'
  },
  printerCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#f9fafb'
  },
  printerInfo: {
    flex: 1
  },
  printerCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    cursor: 'pointer'
  },
  printerName: {
    flex: 1
  },
  printerMeta: {
    display: 'flex',
    gap: '12px',
    marginTop: '4px',
    fontSize: '12px'
  },
  printerType: {
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  printerStatus: {
    fontWeight: 'bold'
  },
  testButton: {
    padding: '6px 10px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  addButton: {
    padding: '15px 20px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    alignSelf: 'flex-start'
  },
  tableContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'auto',
    border: '1px solid #e5e7eb',
    marginBottom: '20px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  headerRow: {
    backgroundColor: '#008080',
    color: 'white',
    position: 'sticky',
    top: 0
  },
  th: {
    padding: '15px 12px',
    textAlign: 'left',
    fontWeight: 'bold',
    borderBottom: '2px solid #006666'
  },
  row: {
    transition: 'background-color 0.2s ease'
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'top'
  },
  emptyCell: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic'
  },
  statusIndicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    display: 'inline-block'
  },
  stationName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },
  inactiveLabel: {
    fontSize: '12px',
    color: '#dc2626',
    fontWeight: 'normal'
  },
  printersDisplay: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  printersList: {
    fontSize: '14px',
    color: '#374151'
  },
  printersStatus: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap'
  },
  statusBadge: {
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold'
  },
  editPrintersSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  editPrintersGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  editPrinterCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  editPrinterName: {
    flex: 1
  },
  editPrinterStatus: {
    fontSize: '10px'
  },
  statusToggle: {
    paddingTop: '8px',
    borderTop: '1px solid #e5e7eb'
  },
  statusCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  orderControls: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  orderButton: {
    width: '24px',
    height: '24px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  orderNumber: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: 'bold'
  },
  actions: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  editActions: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  editButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  toggleButton: {
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  saveButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  infoPanel: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #e5e7eb'
  },
  infoTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '15px',
    textAlign: 'center'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px'
  },
  infoCard: {
    display: 'flex',
    gap: '12px',
    padding: '15px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  infoIcon: {
    fontSize: '24px',
    minWidth: '32px'
  },
  infoContent: {
    flex: 1
  },
  infoLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '4px'
  },
  infoText: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.4'
  }
};

export default POSStationsScreen;