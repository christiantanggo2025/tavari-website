// components/Mail/DraftsModal.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { styles } from '../../styles/Mail/CampaignBuilder.styles';
import { FiX, FiFileText, FiEdit3, FiTrash2 } from 'react-icons/fi';

const DraftsModal = ({ isOpen, onClose, businessId, navigate }) => {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDrafts();
    }
  }, [isOpen, businessId]);

  const loadDrafts = async () => {
    if (!businessId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mail_campaigns')
        .select('id, name, subject_line, created_at, updated_at')
        .eq('business_id', businessId)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDraft = async (draftId) => {
    try {
      navigate(`/dashboard/mail/builder/${draftId}`);
      onClose();
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const deleteDraft = async (draftId) => {
    if (!window.confirm('Are you sure you want to delete this draft?')) return;
    
    try {
      const { error } = await supabase
        .from('mail_campaigns')
        .delete()
        .eq('id', draftId)
        .eq('business_id', businessId);

      if (error) throw error;
      
      await loadDrafts();
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Campaign Drafts</h3>
          <button
            style={styles.modalClose}
            onClick={onClose}
          >
            <FiX />
          </button>
        </div>
        <div style={styles.modalContent}>
          {loading ? (
            <div style={styles.loadingState}>Loading drafts...</div>
          ) : drafts.length === 0 ? (
            <div style={styles.emptyDrafts}>
              <FiFileText style={styles.emptyIcon} />
              <p style={styles.emptyText}>No drafts found</p>
              <p style={styles.emptySubtext}>Create a campaign and save it as a draft to see it here.</p>
            </div>
          ) : (
            <div style={styles.draftsList}>
              {drafts.map(draft => (
                <div key={draft.id} style={styles.draftItem}>
                  <div style={styles.draftInfo}>
                    <h4 style={styles.draftName}>{draft.name || 'Untitled Campaign'}</h4>
                    <p style={styles.draftSubject}>{draft.subject_line || 'No subject line'}</p>
                    <p style={styles.draftDate}>
                      Last updated: {new Date(draft.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={styles.draftActions}>
                    <button
                      style={styles.draftEditButton}
                      onClick={() => loadDraft(draft.id)}
                    >
                      <FiEdit3 style={styles.buttonIcon} />
                      Edit
                    </button>
                    <button
                      style={styles.draftDeleteButton}
                      onClick={() => deleteDraft(draft.id)}
                    >
                      <FiTrash2 style={styles.buttonIcon} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={styles.modalActions}>
          <button
            style={styles.modalCancel}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DraftsModal;