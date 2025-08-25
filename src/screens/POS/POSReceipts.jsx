// src/screens/POS/POSReceipts.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusinessContext } from '../../contexts/BusinessContext';

const POSReceipts = () => {
  const { selectedBusinessId } = useBusinessContext();

  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    if (selectedBusinessId) fetchReceipts();
  }, [selectedBusinessId]);

  const fetchReceipts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('pos_receipts')
        .select('*')
        .eq('business_id', selectedBusinessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (err) {
      setError('Error fetching receipts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const viewReceipt = (receipt) => {
    setSelectedReceipt(receipt);
  };

  const closeReceiptModal = () => {
    setSelectedReceipt(null);
  };

  if (loading) return <div style={styles.loading}>Loading receipts...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>POS Receipts</h2>
        <p>View and manage historical receipts</p>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.content}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.th}>Receipt #</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Total</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {receipts.length === 0 && (
              <tr>
                <td colSpan="5" style={styles.emptyCell}>
                  No receipts found.
                </td>
              </tr>
            )}
            {receipts.map((receipt, index) => (
              <tr key={receipt.id} style={{
                ...styles.row,
                backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white'
              }}>
                <td style={styles.td}>
                  {receipt.sale_id ? `SALE-${receipt.sale_id.slice(-8)}` : receipt.id.slice(-8)}
                </td>
                <td style={styles.td}>
                  {new Date(receipt.created_at).toLocaleString()}
                </td>
                <td style={styles.td}>
                  ${parseFloat(receipt.total).toFixed(2)}
                </td>
                <td style={styles.td}>
                  {receipt.receipt_type || 'Standard'}
                </td>
                <td style={styles.td}>
                  <button 
                    style={styles.viewButton} 
                    onClick={() => viewReceipt(receipt)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Receipt Details Modal */}
      {selectedReceipt && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Receipt Details</h3>
              <button 
                style={styles.closeButton} 
                onClick={closeReceiptModal}
              >
                ×
              </button>
            </div>
            
            <div style={styles.receiptDetails}>
              <div style={styles.detailRow}>
                <strong>Receipt ID:</strong> {selectedReceipt.id}
              </div>
              <div style={styles.detailRow}>
                <strong>Date:</strong> {new Date(selectedReceipt.created_at).toLocaleString()}
              </div>
              <div style={styles.detailRow}>
                <strong>Total:</strong> ${parseFloat(selectedReceipt.total).toFixed(2)}
              </div>
              <div style={styles.detailRow}>
                <strong>Type:</strong> {selectedReceipt.receipt_type || 'Standard'}
              </div>
              {selectedReceipt.email_sent_to && (
                <div style={styles.detailRow}>
                  <strong>Email Sent To:</strong> {selectedReceipt.email_sent_to}
                </div>
              )}
            </div>

            <div style={styles.itemsSection}>
              <h4>Items</h4>
              <div style={styles.itemsContainer}>
                {selectedReceipt.items && selectedReceipt.items.length > 0 ? (
                  <table style={styles.itemsTable}>
                    <thead>
                      <tr>
                        <th style={styles.itemTh}>Item</th>
                        <th style={styles.itemTh}>Qty</th>
                        <th style={styles.itemTh}>Price</th>
                        <th style={styles.itemTh}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReceipt.items.map((item, index) => (
                        <tr key={index}>
                          <td style={styles.itemTd}>{item.name}</td>
                          <td style={styles.itemTd}>{item.quantity}</td>
                          <td style={styles.itemTd}>${item.price?.toFixed(2)}</td>
                          <td style={styles.itemTd}>
                            ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={styles.noItems}>No item details available</div>
                )}
              </div>
            </div>

            <div style={styles.modalActions}>
              <button 
                style={styles.closeModalButton} 
                onClick={closeReceiptModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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
    borderRadius: '6px',
    marginBottom: '20px'
  },
  content: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    overflow: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  headerRow: {
    backgroundColor: '#008080',
    color: 'white'
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold',
    borderBottom: '2px solid #006666'
  },
  row: {
    transition: 'background-color 0.2s ease'
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #e5e7eb'
  },
  emptyCell: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic'
  },
  viewButton: {
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    fontSize: '18px',
    color: '#6b7280'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: '#fff',
    padding: '30px',
    borderRadius: '8px',
    maxWidth: '800px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #008080'
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280'
  },
  receiptDetails: {
    marginBottom: '25px'
  },
  detailRow: {
    padding: '8px 0',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '14px'
  },
  itemsSection: {
    marginBottom: '25px'
  },
  itemsContainer: {
    marginTop: '15px'
  },
  itemsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  itemTh: {
    backgroundColor: '#f8f9fa',
    padding: '10px',
    textAlign: 'left',
    fontWeight: 'bold',
    borderBottom: '1px solid #dee2e6'
  },
  itemTd: {
    padding: '8px 10px',
    borderBottom: '1px solid #f1f3f4'
  },
  noItems: {
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic',
    padding: '20px'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '20px'
  },
  closeModalButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  }
};

export default POSReceipts;