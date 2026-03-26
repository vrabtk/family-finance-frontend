import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/auth.store';
import Header from './components/layout/Header';
import Toast from './components/shared/Toast';
import Spinner from './components/shared/Spinner';

import LoginPage      from './pages/auth/LoginPage';
import SignupPage     from './pages/auth/SignupPage';
import ExpensesPage   from './pages/expenses/ExpensesPage';
import LoansPage      from './pages/loans/LoansPage';
import InvestmentsPage from './pages/investments/InvestmentsPage';
import InsurancePage  from './pages/insurance/InsurancePage';
import BanksPage      from './pages/banks/BanksPage';
import OverviewPage   from './pages/overview/OverviewPage';
import AnalyticsPage  from './pages/analytics/AnalyticsPage';
import SettingsPage   from './pages/Settings';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100dvh'}}>
      <Spinner size={36} />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function AppLayout({ children }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Toast />
    </>
  );
}

export default function App() {
  const { init } = useAuthStore();
  useEffect(() => { init(); }, [init]);

  return (
    <BrowserRouter>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(20px); opacity:0; } to { transform: translateY(0); opacity:1; } }
        * { box-sizing: border-box; }
      `}</style>
      <Routes>
        <Route path="/login"  element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/" element={<Navigate to="/expenses" replace />} />
        <Route path="/expenses"   element={<ProtectedRoute><AppLayout><ExpensesPage /></AppLayout></ProtectedRoute>} />
        <Route path="/loans"      element={<ProtectedRoute><AppLayout><LoansPage /></AppLayout></ProtectedRoute>} />
        <Route path="/investments"element={<ProtectedRoute><AppLayout><InvestmentsPage /></AppLayout></ProtectedRoute>} />
        <Route path="/insurance"  element={<ProtectedRoute><AppLayout><InsurancePage /></AppLayout></ProtectedRoute>} />
        <Route path="/banks"      element={<ProtectedRoute><AppLayout><BanksPage /></AppLayout></ProtectedRoute>} />
        <Route path="/overview"   element={<ProtectedRoute><AppLayout><OverviewPage /></AppLayout></ProtectedRoute>} />
        <Route path="/analytics"  element={<ProtectedRoute><AppLayout><AnalyticsPage /></AppLayout></ProtectedRoute>} />
        <Route path="/settings"   element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/expenses" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
