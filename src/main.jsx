// Buffer polyfill for browser compatibility
import { Buffer } from 'buffer';
window.Buffer = Buffer;

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import { BusinessProvider } from './contexts/BusinessContext';
import { RoleProvider } from './contexts/RoleContext';
import { ErrorProvider } from './contexts/ErrorContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <BusinessProvider>
          <RoleProvider>
            <ErrorProvider>
              <App />
            </ErrorProvider>
          </RoleProvider>
        </BusinessProvider>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);