// src/App.jsx
import { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useMusicService } from './hooks/useMusicService';
import { BusinessProvider } from './contexts/BusinessContext';
import Home from './screens/Home';
import Login from './screens/Login';
import Register from './screens/Register';
import Dashboard from './screens/Dashboard';
import Unlock from './screens/Unlock';
import ChangePin from './screens/ChangePin';
import AuditLogViewer from './screens/AuditLogViewer';
import AddUser from './screens/AddUser';
import Locked from './screens/Locked';
import ForgotPassword from "./screens/ForgotPassword";
import DashboardLayout from './layouts/DashboardLayout';
import EmployeeScreen from './screens/EmployeeScreen';
import EmployeeEditor from './screens/EmployeeEditor';
import SettingsScreen from './screens/SettingsScreen';
import NewBusiness from './screens/NewBusiness';
import DesktopMusicDashboard from './screens/Desktop/DesktopMusicDashboard';

// POS screens imports
import POSRegister from './screens/POS/POSRegister';
import POSInventory from './screens/POS/POSInventory';
import POSCategories from './screens/POS/POSCategories';
import POSModifiers from './screens/POS/POSModifiers';
import POSDiscounts from './screens/POS/POSDiscounts';
import POSReceipts from './screens/POS/POSReceipts';
import POSSettings from './screens/POS/POSSettings';
import POSStationsScreen from './screens/POS/POSStationsScreen'; // Added missing import
import POSReportsScreen from './screens/POS/POSReportsScreen'; // Added missing import
import SaleReviewScreen from './screens/POS/SaleReviewScreen';
import PaymentScreen from './screens/POS/PaymentScreen';
import ReceiptScreen from './screens/POS/ReceiptScreen';
import POSLoyaltyScreen from './screens/POS/POSLoyaltyScreen';
import RefundsScreen from './screens/POS/RefundsScreen';
import TabScreen from './screens/POS/TabScreen';

// Tavari Music screens imports
import MusicDashboard from './screens/Music/MusicDashboard';
import MusicUpload from './screens/Music/MusicUpload';
import MusicLibrary from './screens/Music/MusicLibrary';
import MusicAdManager from './screens/Music/MusicAdManager';
import PlaylistManager from './screens/Music/PlaylistManager';
import MusicSchedules from './screens/Music/MusicSchedules';

// New Ad System screens imports
import AdDashboard from './screens/Music/Ads/AdDashboard';
import AdSettings from './screens/Music/Ads/AdSettings';
import RevenueReports from './screens/Music/Ads/RevenueReports';
import PayoutHistory from './screens/Music/Ads/PayoutHistory';

// Tavari Mail screens imports
import MailDashboard from './screens/Mail/MailDashboard';
import MailSettings from './screens/Mail/MailSettings';
import BillingManager from './screens/Mail/BillingManager';
import ContactsDashboard from './screens/Mail/ContactsDashboard';
import CampaignList from './screens/Mail/CampaignList';
import ContactsList from './screens/Mail/ContactsList';
import CampaignBuilder from './screens/Mail/CampaignBuilder';
import ContactDetails from './screens/Mail/ContactDetails';
import SendLogsScreen from './screens/Mail/SendLogsScreen';
import PerformanceMonitoringScreen from './screens/Mail/PerformanceMonitoringScreen';
import CampaignDetails from './screens/Mail/CampaignDetails';
import CampaignSender from './screens/Mail/CampaignSender';
import UnsubscribePage from './screens/Mail/UnsubscribePage';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const previousUserId = useRef(null);
  const inactivityTimer = useRef(null);
  const navigate = useNavigate();
  const [isDesktopApp, setIsDesktopApp] = useState(false);

  // 🎵 Initialize Global Music Service - This enables automatic music playback!
  useMusicService();

  // 📊 Initialize Google AdSense
  useEffect(() => {
    const loadAdSense = () => {
      // Check if AdSense is already loaded
      if (window.adsbygoogle) {
        return;
      }

      // Create and append AdSense script
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2944855421239833';
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        console.log('📊 Google AdSense loaded successfully');
      };
      
      script.onerror = () => {
        console.warn('⚠️ Failed to load Google AdSense');
      };

      document.head.appendChild(script);
    };

    // Only load AdSense in production and web environment (not desktop app)
    if (!isDesktopApp && process.env.NODE_ENV === 'production') {
      loadAdSense();
    }
  }, [isDesktopApp]);

  // Detect if running in Electron
  useEffect(() => {
    setIsDesktopApp(!!window.electronAPI);
    
    // Log desktop app detection
    if (window.electronAPI) {
      console.log('🖥️ Desktop app detected - enhanced features enabled');
    }
  }, []);

  const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(async () => {
        console.log('Inactivity timeout — logging and redirecting');

        const currentUser = await supabase.auth.getUser();
        if (currentUser?.data?.user?.id) {
          await supabase.from('audit_logs').insert({
            user_id: currentUser.data.user.id,
            event_type: 'timeout_logout',
            details: {
              reason: 'inactivity',
              time: new Date().toISOString(),
            },
          });
        }

        navigate('/unlock');
      }, INACTIVITY_LIMIT);
    };

    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer(); // Start initial timer

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      clearTimeout(inactivityTimer.current);
    };
  }, [navigate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      
      // Log session changes for music service
      if (session) {
        console.log('🔐 User logged in - music service will initialize');
      } else {
        console.log('🔐 User logged out - music service will stop');
        // Music service will handle cleanup automatically
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div style={loadingStyles.container}>
        <div style={loadingStyles.spinner}></div>
        <div style={loadingStyles.text}>Loading Tavari System...</div>
        {isDesktopApp && (
          <div style={loadingStyles.desktopNote}>Desktop Mode</div>
        )}
      </div>
    );
  }

  return (
    <BusinessProvider>
      <Routes>
        {/* PUBLIC ROUTES (No authentication required) */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/unsubscribe" element={<UnsubscribePage />} />
        
        {/* PROTECTED DASHBOARD ROUTES */}
        <Route
          path="/dashboard"
          element={session ? <DashboardLayout /> : <Navigate to="/login" />}
        >
          {/* Main Dashboard */}
          <Route path="home" element={<Dashboard />} />
          
          {/* User Management */}
          <Route path="change-pin" element={<ChangePin />} />
          <Route path="audit-logs" element={<AuditLogViewer />} />
          <Route path="add-user" element={<AddUser />} />
          <Route path="employees" element={<EmployeeScreen />} />
          <Route path="employee/:id" element={<EmployeeEditor />} />
          <Route path="settings" element={<SettingsScreen />} />

          {/* POS System Routes */}
          <Route path="pos/register" element={<POSRegister />} />
          <Route path="pos/inventory" element={<POSInventory />} />
          <Route path="pos/categories" element={<POSCategories />} />
          <Route path="pos/modifiers" element={<POSModifiers />} />
          <Route path="pos/discounts" element={<POSDiscounts />} />
          <Route path="pos/receipts" element={<POSReceipts />} />
          <Route path="pos/settings" element={<POSSettings />} />
          <Route path="pos/stations" element={<POSStationsScreen />} />
          <Route path="pos/reports" element={<POSReportsScreen />} />
          <Route path="pos/sale-review" element={<SaleReviewScreen />} />
          <Route path="pos/payment" element={<PaymentScreen />} />
          <Route path="pos/receipt" element={<ReceiptScreen />} />
          <Route path="pos/loyalty" element={<POSLoyaltyScreen />} />
          <Route path="pos/refunds" element={<RefundsScreen />} />
          <Route path="pos/tabs" element={<TabScreen />} />

          {/* Music System Routes */}
          <Route path="music/dashboard" element={<MusicDashboard />} />
          <Route path="music/upload" element={<MusicUpload />} />
          <Route path="music/library" element={<MusicLibrary />} />
          <Route path="music/ads" element={<MusicAdManager />} />
          <Route path="music/playlists" element={<PlaylistManager />} />
          <Route path="music/schedules" element={<MusicSchedules />} />
          
          {/* New Ad System Routes */}
          <Route path="music/ads/dashboard" element={<AdDashboard />} />
          <Route path="music/ads/settings" element={<AdSettings />} />
          <Route path="music/ads/revenue" element={<RevenueReports />} />
          <Route path="music/ads/payouts" element={<PayoutHistory />} />
          
          {/* Desktop-Specific Music Route */}
          {isDesktopApp && (
            <Route path="music/desktop" element={<DesktopMusicDashboard />} />
          )}

          {/* Tavari Mail System Routes */}
          <Route path="mail/dashboard" element={<MailDashboard />} />
          <Route path="mail/campaigns" element={<CampaignList />} />
          <Route path="mail/contacts" element={<ContactsList />} />
          <Route path="mail/contacts/edit/:id" element={<ContactDetails />} />
          <Route path="mail/builder" element={<CampaignBuilder />} />
          <Route path="mail/builder/:campaignId" element={<CampaignBuilder />} />
          <Route path="mail/templates" element={<CampaignList />} />
          <Route path="mail/compliance" element={<ContactsDashboard />} />
          <Route path="mail/billing" element={<BillingManager />} />
          <Route path="mail/settings" element={<MailSettings />} />
          <Route path="mail/sender/:campaignId" element={<CampaignSender />} />
          <Route path="mail/campaigns/:campaignId" element={<CampaignDetails />} />
          <Route path="mail/logs" element={<SendLogsScreen />} />
          <Route path="mail/performance" element={<PerformanceMonitoringScreen />} />
        </Route>

        {/* AUTHENTICATION & UTILITY ROUTES */}
        <Route 
          path="/unlock" 
          element={session ? <Unlock session={session} /> : <Navigate to="/login" />} 
        />
        <Route path="/locked" element={<Locked />} />
        <Route path="/dashboard/new-business" element={<NewBusiness />} />
        
        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BusinessProvider>
  );
}

// Loading screen styles
const loadingStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e9ecef',
    borderTop: '4px solid #20c997',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  text: {
    fontSize: '18px',
    color: '#333',
    fontWeight: '500',
    marginBottom: '10px',
  },
  desktopNote: {
    fontSize: '14px',
    color: '#20c997',
    fontWeight: 'bold',
    padding: '4px 12px',
    backgroundColor: '#e8f8f5',
    borderRadius: '12px',
  },
};

// Add spinner animation CSS if not already present
if (!document.querySelector('#app-loading-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'app-loading-styles';
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default App;