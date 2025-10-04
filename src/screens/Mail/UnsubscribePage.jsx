import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const UnsubscribePage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setMessage('No unsubscribe token provided.');
      return;
    }
    handleUnsubscribe();
  }, [token]);

  const parseToken = (tokenString) => {
    try {
      const decoded = atob(tokenString);
      const [contactId, businessId] = decoded.split(':');
      return { contactId, businessId };
    } catch (error) {
      return null;
    }
  };

  const handleUnsubscribe = async () => {
    try {
      const tokenData = parseToken(token);
      
      if (!tokenData?.contactId || !tokenData?.businessId) {
        setStatus('invalid');
        setMessage('Invalid unsubscribe token.');
        return;
      }

      const { data: contact, error: contactError } = await supabase
        .from('mail_contacts')
        .select('email, subscribed')
        .eq('id', tokenData.contactId)
        .eq('business_id', tokenData.businessId)
        .single();

      if (contactError || !contact) {
        setStatus('invalid');
        setMessage('Contact not found.');
        return;
      }

      setEmail(contact.email);

      if (!contact.subscribed) {
        setStatus('success');
        setMessage('This email is already unsubscribed.');
        return;
      }

      const { error: updateError } = await supabase
        .from('mail_contacts')
        .update({ 
          subscribed: false,
          unsubscribed_at: new Date().toISOString()
        })
        .eq('id', tokenData.contactId);

      if (updateError) {
        setStatus('error');
        setMessage('Failed to unsubscribe. Please contact support.');
        return;
      }

      setStatus('success');
      setMessage('Successfully unsubscribed from our mailing list.');

    } catch (error) {
      setStatus('error');
      setMessage('An error occurred. Please contact support.');
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    fontFamily: 'Arial, sans-serif',
    padding: '20px'
  };

  const cardStyle = {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    maxWidth: '400px',
    textAlign: 'center'
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#333'
  };

  const messageStyle = {
    fontSize: '16px',
    lineHeight: '1.5',
    color: '#666',
    marginBottom: '20px'
  };

  const emailStyle = {
    fontSize: '14px',
    color: '#888',
    fontStyle: 'italic'
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>
          {status === 'loading' && 'Processing...'}
          {status === 'success' && 'Unsubscribed'}
          {status === 'error' && 'Error'}
          {status === 'invalid' && 'Invalid Request'}
        </h1>
        
        <p style={messageStyle}>
          {message}
        </p>

        {email && (
          <p style={emailStyle}>
            Email: {email}
          </p>
        )}

        {status !== 'loading' && (
          <p style={{...emailStyle, marginTop: '30px'}}>
            If you have questions, please contact our support team.
          </p>
        )}
      </div>
    </div>
  );
};

export default UnsubscribePage;