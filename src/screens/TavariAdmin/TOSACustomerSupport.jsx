// TOSACustomerSupport.jsx
import React, { useState, useEffect } from 'react';
import { FiHeadphones, FiMessageSquare, FiClock, FiUser } from 'react-icons/fi';
import { TavariStyles } from '../../utils/TavariStyles';
import { SecurityWrapper } from '../../Security';
import { useTOSATavariAuth } from '../../hooks/useTOSATavariAuth';
import TOSAHeaderBar from '../../components/TavariAdminComp/TOSAHeaderBar';
import TOSASidebarNav from '../../components/TavariAdminComp/TOSASidebarNav';

const TOSACustomerSupport = () => {
  const [tickets, setTickets] = useState([
    { id: 1, business: 'Coffee Shop Inc.', subject: 'Payment processing issue', status: 'open', priority: 'high', created: '2 hours ago' },
    { id: 2, business: 'Pizza Palace', subject: 'Login problems', status: 'pending', priority: 'medium', created: '4 hours ago' },
    { id: 3, business: 'Retail Store', subject: 'Inventory sync error', status: 'resolved', priority: 'low', created: '1 day ago' }
  ]);

  const auth = useTOSATavariAuth({
    requiredPermissions: ['customer_support'],
    componentName: 'TOSACustomerSupport'
  });

  const styles = {
    container: { display: 'flex', minHeight: '100vh', backgroundColor: TavariStyles.colors.gray50 },
    content: { flex: 1, display: 'flex', flexDirection: 'column', marginLeft: '250px' },
    main: { flex: 1, padding: TavariStyles.spacing.xl, paddingTop: '120px' },
    title: { fontSize: TavariStyles.typography.fontSize['2xl'], fontWeight: TavariStyles.typography.fontWeight.bold, marginBottom: TavariStyles.spacing.xl },
    ticketsGrid: { display: 'grid', gap: TavariStyles.spacing.lg },
    ticketCard: { backgroundColor: TavariStyles.colors.white, padding: TavariStyles.spacing.lg, borderRadius: TavariStyles.borderRadius.lg, boxShadow: TavariStyles.shadows.md }
  };

  if (!auth.isAuthenticated) return <div>Access denied.</div>;

  return (
    <SecurityWrapper componentName="TOSACustomerSupport">
      <div style={styles.container}>
        <TOSASidebarNav />
        <div style={styles.content}>
          <TOSAHeaderBar />
          <main style={styles.main}>
            <h1 style={styles.title}>Customer Support Tickets</h1>
            <div style={styles.ticketsGrid}>
              {tickets.map(ticket => (
                <div key={ticket.id} style={styles.ticketCard}>
                  <h3>{ticket.subject}</h3>
                  <p>Business: {ticket.business}</p>
                  <p>Status: {ticket.status} | Priority: {ticket.priority}</p>
                  <p>Created: {ticket.created}</p>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </SecurityWrapper>
  );
};

export default TOSACustomerSupport;