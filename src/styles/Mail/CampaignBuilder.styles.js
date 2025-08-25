// styles/Mail/CampaignBuilder.styles.js

export const styles = {
  // Main Container
  container: {
    padding: '50px 20px 20px 20px',
    maxWidth: '1800px',
    margin: '0 auto',
    backgroundColor: '#f8f8f8',
    minHeight: '100vh',
  },
  
  // Header Styles
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
    flex: 1,
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  
  // Button Styles
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'teal',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '10px',
  },
  primaryButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  secondaryButton: {
    backgroundColor: 'white',
    color: 'teal',
    border: '2px solid teal',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  buttonIcon: {
    fontSize: '14px',
  },
  
  // Message Styles
  message: {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontWeight: 'bold',
    whiteSpace: 'pre-line',
  },
  
  // Layout Styles
  content: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr', // Give editor 2/3, preview 1/3
    gap: '30px',
    alignItems: 'flex-start',
    '@media (max-width: 1024px)': {
      gridTemplateColumns: '1fr',
      gap: '20px',
    },
  },
  contentMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    alignItems: 'stretch',
  },
  editorPanel: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
    padding: '20px',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  previewPanel: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #ddd',
    padding: '15px', // Reduced padding
    position: 'sticky',
    top: '20px',
    maxHeight: '60vh', // Reduced from 80vh to 60vh
    overflow: 'auto',
  },
  
  // Section Styles
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '15px',
    borderBottom: '2px solid #f0f0f0',
    paddingBottom: '10px',
  },
  
  // Form Styles
  formGroup: {
    marginBottom: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    boxSizing: 'border-box',
  },
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    backgroundColor: 'white',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  
  // Block Styles
  blockLibrary: {
    marginBottom: '30px',
  },
  blockTypes: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '10px',
  },
  blockTypeButton: {
    backgroundColor: 'white',
    border: '2px solid #ddd',
    borderRadius: '8px',
    padding: '12px 8px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
    minHeight: '80px',
  },
  blockTypeIcon: {
    fontSize: '20px',
    color: 'teal',
  },
  blockTypeLabel: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  
  // Content Block Styles
  contentBlocks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  contentBlock: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fafafa',
    transition: 'all 0.2s ease',
  },
  activeBlock: {
    borderColor: 'teal',
    boxShadow: '0 0 0 2px rgba(0, 128, 128, 0.1)',
  },
  dragOverBlock: {
    borderColor: 'teal',
    borderStyle: 'dashed',
  },
  blockHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 15px',
    backgroundColor: '#f0f0f0',
    borderBottom: '1px solid #ddd',
    borderRadius: '8px 8px 0 0',
  },
  blockInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dragHandle: {
    fontSize: '14px',
    color: '#999',
    cursor: 'grab',
  },
  blockType: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
  },
  blockActions: {
    display: 'flex',
    gap: '5px',
  },
  blockActionButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  blockContent: {
    padding: '15px',
  },
  
  // Alignment Buttons
  alignmentButtons: {
    display: 'flex',
    gap: '2px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  alignmentButton: {
    backgroundColor: 'white',
    border: 'none',
    padding: '6px 8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#666',
    borderRight: '1px solid #ddd',
  },
  activeAlignment: {
    backgroundColor: 'teal',
    color: 'white',
  },
  
  // Dynamic Fields
  dynamicFields: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  dynamicFieldsLabel: {
    fontSize: '12px',
    color: '#666',
    fontWeight: 'bold',
  },
  dynamicFieldButton: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    border: 'none',
    borderRadius: '12px',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    textTransform: 'capitalize',
  },
  
  // Test Button
  testButtonContainer: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#f8f8f8',
    borderRadius: '6px',
    border: '1px solid #ddd',
  },
  testButton: {
    backgroundColor: 'white',
    color: 'teal',
    border: '2px solid teal',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  
  // Image Styles
  imagePreviewContainer: {
    padding: '15px',
    backgroundColor: '#f8f8f8',
    borderRadius: '6px',
    border: '1px solid #ddd',
  },
  linkIndicator: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Social Styles
  socialEditor: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  socialSettings: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginTop: '15px',
  },
  
  // Columns Styles
  columnsEditor: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  columnsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  columnEditor: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  columnLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  columnTextarea: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  
  // Preview Styles
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  previewToggle: {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#f0f0f0',
    borderRadius: '6px',
    padding: '4px',
  },
  toggleButton: {
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#666',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  activeToggle: {
    backgroundColor: 'white',
    color: '#333',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  previewContainer: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    padding: '15px', // Reduced padding
    display: 'flex',
    justifyContent: 'center',
  },
  desktopPreview: {
    maxWidth: '400px', // Reduced from 600px
    margin: '0 auto',
  },
  mobilePreview: {
    maxWidth: '250px', // Reduced from 320px
    margin: '0 auto',
  },
  emailPreview: {
    backgroundColor: 'white',
    borderRadius: '4px',
    overflow: 'hidden',
    width: '100%',
    maxWidth: '400px', // Reduced max width
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transform: 'scale(0.8)', // Scale down the entire preview
    transformOrigin: 'top center',
    marginBottom: '-20%', // Compensate for scale spacing
  },
  emailHeader: {
    padding: '10px 15px', // Reduced padding
    backgroundColor: '#f8f8f8',
    borderBottom: '1px solid #ddd',
  },
  emailSubject: {
    fontSize: '14px', // Reduced font size
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '3px', // Reduced margin
  },
  emailFrom: {
    fontSize: '12px', // Reduced font size
    color: '#666',
    marginBottom: '3px', // Reduced margin
  },
  emailPreheader: {
    fontSize: '10px', // Reduced font size
    color: '#999',
  },
  emailBody: {
    padding: '15px', // Reduced padding
  },
  emailFooter: {
    padding: '15px', // Reduced padding
    backgroundColor: '#f8f8f8',
    borderTop: '1px solid #ddd',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '12px',
    color: '#666',
    margin: '5px 0',
  },
  footerLink: {
    color: '#666',
    textDecoration: 'underline',
    margin: '0 5px',
  },
  previewEmpty: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: '40px 20px',
  },
  
  // Empty States
  emptyContent: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#666',
    border: '2px dashed #ddd',
    borderRadius: '8px',
  },
  emptyIcon: {
    fontSize: '32px',
    color: '#ccc',
    marginBottom: '10px',
  },
  emptyText: {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 5px 0',
  },
  emptySubtext: {
    fontSize: '14px',
    margin: 0,
  },
  
  // Placeholder Styles
  previewImagePlaceholder: {
    backgroundColor: '#f0f0f0',
    border: '2px dashed #ccc',
    padding: '40px',
    textAlign: 'center',
    color: '#666',
    marginBottom: '15px',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSocialPlaceholder: {
    backgroundColor: '#f0f0f0',
    border: '2px dashed #ccc',
    padding: '40px',
    textAlign: 'center',
    color: '#666',
    marginBottom: '15px',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderBlock: {
    padding: '20px',
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
  },
  
  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #f0f0f0',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  modalClose: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#666',
  },
  modalContent: {
    padding: '20px',
  },
  modalText: {
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  recipientOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  contactSelector: {
    marginTop: '15px',
  },
  selectorNote: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '10px',
  },
  contactList: {
    maxHeight: '200px',
    overflow: 'auto',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '10px',
  },
  contactCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    borderRadius: '4px',
  },
  contactEmail: {
    fontSize: '12px',
    color: '#666',
    marginLeft: 'auto',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    padding: '20px',
    borderTop: '1px solid #f0f0f0',
  },
  modalCancel: {
    backgroundColor: 'white',
    color: '#666',
    border: '2px solid #ddd',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  modalSend: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  
  // Text Editor Styles
  textEditor: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
    minHeight: '100px',
  },
  headingEditor: {
    width: '100%',
    padding: '10px',
    fontSize: '18px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxSizing: 'border-box',
    fontWeight: 'bold',
  },
  headingControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '10px',
    gap: '10px',
  },
  headingLevelSelect: {
    padding: '6px 10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: 'white',
  },
  buttonEditor: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  imageEditor: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  dividerEditor: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  spacerEditor: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  
  // Utility Styles
  colorInput: {
    width: '40px',
    height: '30px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  rangeInput: {
    flex: 1,
  },
  rangeValue: {
    fontSize: '12px',
    color: '#666',
    minWidth: '30px',
  },
  textControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '10px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  
  // Draft Modal Styles
  loadingState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#666',
    fontSize: '16px',
  },
  emptyDrafts: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#666',
  },
  draftsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    maxHeight: '400px',
    overflow: 'auto',
  },
  draftItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fafafa',
  },
  draftInfo: {
    flex: 1,
  },
  draftName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 5px 0',
  },
  draftSubject: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 5px 0',
  },
  draftDate: {
    fontSize: '12px',
    color: '#999',
    margin: 0,
  },
  draftActions: {
    display: 'flex',
    gap: '8px',
    marginLeft: '15px',
  },
  draftEditButton: {
    backgroundColor: 'teal',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  draftDeleteButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
};