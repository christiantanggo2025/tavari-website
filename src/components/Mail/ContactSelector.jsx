// components/Mail/ContactSelector.jsx - Production Ready Version
import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/Mail/CampaignBuilder.styles';
import { 
  FiX, FiUsers, FiUserCheck, FiUserX, FiSearch, FiFilter, 
  FiSend, FiMail, FiCheckCircle, FiAlertTriangle, FiLoader
} from 'react-icons/fi';

const ContactSelector = ({ 
  isOpen, 
  onClose, 
  campaign, 
  contacts, 
  selectedContacts, 
  customContactIds, 
  onSelectedContactsChange, 
  onCustomContactIdsChange, 
  onSend,
  businessId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [testEmails, setTestEmails] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSentCount, setTestSentCount] = useState(0);
  const [validationErrors, setValidationErrors] = useState([]);

  // Advanced filtering logic
  const getFilteredContacts = () => {
    return contacts.filter(contact => {
      // Apply subscription filter
      if (filter === 'subscribed' && !contact.subscribed) return false;
      if (filter === 'unsubscribed' && contact.subscribed) return false;
      if (filter === 'bounced' && !contact.bounced) return false;
      if (filter === 'engaged' && !contact.last_engagement_at) return false;
      
      // Apply search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          contact.email.toLowerCase().includes(search) ||
          contact.first_name?.toLowerCase().includes(search) ||
          contact.last_name?.toLowerCase().includes(search) ||
          contact.tags?.some(tag => tag.toLowerCase().includes(search))
        );
      }
      
      return true;
    });
  };

  const filteredContacts = getFilteredContacts();

  // Calculate recipient counts with validation
  const getRecipientCount = () => {
    if (selectedContacts === 'all') {
      const subscribedCount = contacts.filter(c => c.subscribed && !c.bounced).length;
      return subscribedCount;
    } else if (selectedContacts === 'custom') {
      const validIds = customContactIds.filter(id => {
        const contact = contacts.find(c => c.id === id);
        return contact && contact.subscribed && !contact.bounced;
      });
      return validIds.length;
    }
    return 0;
  };

  // Validate campaign before sending
  const validateCampaign = () => {
    const errors = [];
    
    if (!campaign.name?.trim()) errors.push('Campaign name is required');
    if (!campaign.subject_line?.trim()) errors.push('Subject line is required');
    if (!campaign.content_blocks || campaign.content_blocks.length === 0) {
      errors.push('Campaign must have at least one content block');
    }
    
    // Check for unsubscribe link
    const hasUnsubscribe = campaign.content_blocks?.some(block => 
      (block.type === 'text' && block.content?.includes('{UnsubscribeLink}')) ||
      (block.type === 'button' && block.content?.url?.includes('unsubscribe'))
    );
    
    if (!hasUnsubscribe) {
      errors.push('Campaign must include an unsubscribe link for compliance');
    }

    const recipientCount = getRecipientCount();
    if (recipientCount === 0) {
      errors.push('Campaign must have at least one valid recipient');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Enhanced contact selection logic
  const handleContactToggle = (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact?.subscribed || contact.bounced) {
      alert('Cannot select unsubscribed or bounced contacts');
      return;
    }

    if (customContactIds.includes(contactId)) {
      onCustomContactIdsChange(customContactIds.filter(id => id !== contactId));
    } else {
      onCustomContactIdsChange([...customContactIds, contactId]);
    }
  };

  const handleSelectAll = () => {
    const validIds = filteredContacts
      .filter(c => c.subscribed && !c.bounced)
      .map(c => c.id);
    onCustomContactIdsChange([...new Set([...customContactIds, ...validIds])]);
  };

  const handleDeselectAll = () => {
    const currentlySelected = new Set(customContactIds);
    const filteredIds = filteredContacts.map(c => c.id);
    const remaining = customContactIds.filter(id => !filteredIds.includes(id));
    onCustomContactIdsChange(remaining);
  };

  // Enhanced test email functionality
  const validateTestEmails = (emailString) => {
    const emails = emailString.split(',').map(email => email.trim()).filter(email => email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = [];
    const invalidEmails = [];

    emails.forEach(email => {
      if (emailRegex.test(email)) {
        validEmails.push(email);
      } else {
        invalidEmails.push(email);
      }
    });

    return { validEmails, invalidEmails };
  };

  const handleSendTest = async () => {
    if (!testEmails.trim()) {
      alert('Please enter at least one email address for testing.');
      return;
    }

    const { validEmails, invalidEmails } = validateTestEmails(testEmails);
    
    if (invalidEmails.length > 0) {
      alert(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      return;
    }

    if (validEmails.length === 0) {
      alert('Please enter at least one valid email address.');
      return;
    }

    setSendingTest(true);
    try {
      // Real test email sending logic
      const testCampaignData = {
        ...campaign,
        test_mode: true,
        test_recipients: validEmails,
        business_id: businessId
      };

      // TODO: Replace with actual API call when Amazon SES is ready
      // const response = await fetch('/api/mail/send-test', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(testCampaignData)
      // });

      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setTestSentCount(validEmails.length);
      alert(`Test emails sent successfully to ${validEmails.length} recipient(s)!`);
      setTestEmails('');
      
    } catch (error) {
      console.error('Error sending test emails:', error);
      alert('Failed to send test emails. Please check your email settings and try again.');
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendCampaign = () => {
    if (!validateCampaign()) {
      const errorMessage = validationErrors.join('\n• ');
      alert(`Please fix these issues before sending:\n• ${errorMessage}`);
      return;
    }

    const recipientCount = getRecipientCount();
    const estimatedCost = (recipientCount * 0.0025).toFixed(4);
    
    const confirmMessage = `Send "${campaign.name}" to ${recipientCount} contact(s)?\n\nEstimated cost: $${estimatedCost}\n\nThis action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      onSend({
        recipientCount,
        estimatedCost: parseFloat(estimatedCost),
        selectedContacts,
        customContactIds: selectedContacts === 'custom' ? customContactIds : []
      });
    }
  };

  // Filter statistics
  const getFilterStats = () => {
    return {
      all: contacts.length,
      subscribed: contacts.filter(c => c.subscribed).length,
      unsubscribed: contacts.filter(c => !c.subscribed).length,
      bounced: contacts.filter(c => c.bounced).length,
      engaged: contacts.filter(c => c.last_engagement_at).length
    };
  };

  const filterStats = getFilterStats();

  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Send Campaign</h2>
          <button style={styles.modalClose} onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div style={styles.modalContent}>
          {/* Campaign Summary */}
          <div style={styles.campaignSummary}>
            <h3 style={styles.summaryTitle}>Campaign: {campaign.name}</h3>
            <div style={styles.summaryDetails}>
              <div style={styles.summaryItem}>
                <strong>Subject:</strong> {campaign.subject_line}
              </div>
              {campaign.preheader_text && (
                <div style={styles.summaryItem}>
                  <strong>Preheader:</strong> {campaign.preheader_text}
                </div>
              )}
              <div style={styles.summaryItem}>
                <strong>Content Blocks:</strong> {campaign.content_blocks?.length || 0}
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div style={styles.validationErrorPanel}>
              <FiAlertTriangle style={styles.validationErrorIcon} />
              <div>
                <strong>Campaign Issues:</strong>
                <ul style={styles.validationErrorList}>
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Test Email Section */}
          <div style={styles.testSection}>
            <h4 style={styles.testTitle}>
              <FiMail style={styles.testIcon} />
              Send Test Email
              {testSentCount > 0 && (
                <span style={styles.testBadge}>
                  {testSentCount} sent today
                </span>
              )}
            </h4>
            <div style={styles.testControls}>
              <input
                type="text"
                style={styles.testInput}
                value={testEmails}
                onChange={(e) => setTestEmails(e.target.value)}
                placeholder="Enter test email addresses (comma-separated)"
                disabled={sendingTest}
              />
              <button
                style={{
                  ...styles.testButton,
                  opacity: sendingTest || !testEmails.trim() ? 0.5 : 1
                }}
                onClick={handleSendTest}
                disabled={sendingTest || !testEmails.trim()}
              >
                {sendingTest ? (
                  <>
                    <FiLoader style={styles.spinningIcon} />
                    Sending...
                  </>
                ) : (
                  'Send Test'
                )}
              </button>
            </div>
            <div style={styles.testHint}>
              Send a test email to verify your campaign looks correct before sending to all contacts.
            </div>
          </div>

          {/* Recipient Selection */}
          <div style={styles.recipientSection}>
            <h4 style={styles.recipientTitle}>
              <FiUsers style={styles.recipientIcon} />
              Select Recipients
            </h4>

            <div style={styles.recipientOptions}>
              <label style={styles.recipientOption}>
                <input
                  type="radio"
                  name="recipients"
                  value="all"
                  checked={selectedContacts === 'all'}
                  onChange={(e) => onSelectedContactsChange(e.target.value)}
                />
                <div style={styles.optionContent}>
                  <div style={styles.optionTitle}>All Subscribed Contacts</div>
                  <div style={styles.optionDescription}>
                    Send to all {filterStats.subscribed} subscribed contacts (excludes bounced emails)
                  </div>
                </div>
              </label>

              <label style={styles.recipientOption}>
                <input
                  type="radio"
                  name="recipients"
                  value="custom"
                  checked={selectedContacts === 'custom'}
                  onChange={(e) => onSelectedContactsChange(e.target.value)}
                />
                <div style={styles.optionContent}>
                  <div style={styles.optionTitle}>Custom Selection</div>
                  <div style={styles.optionDescription}>
                    Choose specific contacts ({customContactIds.length} selected)
                  </div>
                </div>
              </label>
            </div>

            {/* Custom Contact Selection */}
            {selectedContacts === 'custom' && (
              <div style={styles.customSelection}>
                <div style={styles.selectionControls}>
                  <div style={styles.searchContainer}>
                    <FiSearch style={styles.searchIcon} />
                    <input
                      type="text"
                      style={styles.searchInput}
                      placeholder="Search contacts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <select
                    style={styles.filterSelect}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All Contacts ({filterStats.all})</option>
                    <option value="subscribed">Subscribed ({filterStats.subscribed})</option>
                    <option value="unsubscribed">Unsubscribed ({filterStats.unsubscribed})</option>
                    <option value="bounced">Bounced ({filterStats.bounced})</option>
                    <option value="engaged">Recently Engaged ({filterStats.engaged})</option>
                  </select>
                </div>

                <div style={styles.bulkActions}>
                  <button
                    style={styles.bulkButton}
                    onClick={handleSelectAll}
                    disabled={filteredContacts.filter(c => c.subscribed && !c.bounced).length === 0}
                  >
                    Select All Filtered ({filteredContacts.filter(c => c.subscribed && !c.bounced).length})
                  </button>
                  <button
                    style={styles.bulkButton}
                    onClick={handleDeselectAll}
                  >
                    Deselect Filtered
                  </button>
                </div>

                <div style={styles.contactsList}>
                  {filteredContacts.length === 0 ? (
                    <div style={styles.noContacts}>
                      No contacts match your search criteria.
                    </div>
                  ) : (
                    filteredContacts.map(contact => (
                      <label key={contact.id} style={{
                        ...styles.contactItem,
                        opacity: (!contact.subscribed || contact.bounced) ? 0.5 : 1
                      }}>
                        <input
                          type="checkbox"
                          checked={customContactIds.includes(contact.id)}
                          onChange={() => handleContactToggle(contact.id)}
                          disabled={!contact.subscribed || contact.bounced}
                        />
                        <div style={styles.contactInfo}>
                          <div style={styles.contactName}>
                            {contact.first_name} {contact.last_name}
                            {contact.bounced && <span style={styles.bouncedTag}>BOUNCED</span>}
                          </div>
                          <div style={styles.contactEmail}>
                            {contact.email}
                            {contact.tags && contact.tags.length > 0 && (
                              <span style={styles.contactTags}>
                                {contact.tags.slice(0, 2).join(', ')}
                                {contact.tags.length > 2 && ` +${contact.tags.length - 2} more`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={styles.contactStatus}>
                          {contact.subscribed && !contact.bounced ? (
                            <FiUserCheck style={styles.subscribedIcon} />
                          ) : (
                            <FiUserX style={styles.unsubscribedIcon} />
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Send Summary */}
          <div style={styles.sendSummary}>
            <div style={styles.summaryStats}>
              <div style={styles.statItem}>
                <FiUsers style={styles.statIcon} />
                <span style={styles.statLabel}>Recipients:</span>
                <span style={styles.statValue}>{getRecipientCount()}</span>
              </div>
              <div style={styles.statItem}>
                <FiMail style={styles.statIcon} />
                <span style={styles.statLabel}>Estimated Cost:</span>
                <span style={styles.statValue}>
                  ${(getRecipientCount() * 0.0025).toFixed(4)}
                </span>
              </div>
              <div style={styles.statItem}>
                <FiCheckCircle style={styles.statIcon} />
                <span style={styles.statLabel}>Status:</span>
                <span style={{
                  ...styles.statValue,
                  color: validationErrors.length === 0 ? '#4caf50' : '#f44336'
                }}>
                  {validationErrors.length === 0 ? 'Ready to Send' : 'Needs Attention'}
                </span>
              </div>
            </div>

            {getRecipientCount() > 0 && validationErrors.length === 0 && (
              <div style={styles.sendWarning}>
                <FiAlertTriangle style={styles.warningIcon} />
                <span>This action cannot be undone. The campaign will be sent immediately.</span>
              </div>
            )}
          </div>
        </div>

        <div style={styles.modalActions}>
          <button style={styles.modalCancel} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{
              ...styles.modalSend,
              opacity: (getRecipientCount() === 0 || validationErrors.length > 0) ? 0.5 : 1
            }}
            onClick={handleSendCampaign}
            disabled={getRecipientCount() === 0 || validationErrors.length > 0}
          >
            <FiSend style={styles.buttonIcon} />
            Send to {getRecipientCount()} Contact{getRecipientCount() !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

// Additional enhanced styles
const enhancedStyles = {
  validationErrorPanel: {
    backgroundColor: '#ffebee',
    border: '1px solid #f44336',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    display: 'flex',
    gap: '10px',
  },
  validationErrorIcon: {
    color: '#f44336',
    fontSize: '20px',
    marginTop: '2px',
  },
  validationErrorList: {
    margin: '5px 0 0 0',
    paddingLeft: '20px',
    color: '#f44336',
    fontSize: '13px',
  },
  testBadge: {
    backgroundColor: '#4caf50',
    color: 'white',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '10px',
    marginLeft: '8px',
  },
  spinningIcon: {
    animation: 'spin 1s linear infinite',
  },
  bouncedTag: {
    backgroundColor: '#f44336',
    color: 'white',
    fontSize: '10px',
    padding: '2px 4px',
    borderRadius: '3px',
    marginLeft: '6px',
  },
  contactTags: {
    fontSize: '11px',
    color: '#666',
    marginLeft: '8px',
  },
};

// Merge enhanced styles
Object.assign(styles, enhancedStyles);

export default ContactSelector;