import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/common/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';
import Spinner from './components/common/Spinner';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import FlagsPage from './pages/FlagsPage';
import UsersPage from './pages/UsersPage';
import AuditPage from './pages/AuditPage';

const AUTH_PATHS = ['/login', '/register'];

const Shell = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const isAuth = AUTH_PATHS.includes(location.pathname);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </div>
    );
  }

  if (isAuth || !user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-wrap">
        <div className="page-body">
          <Routes>
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/flags"     element={<ProtectedRoute><FlagsPage /></ProtectedRoute>} />
            <Route path="/users"     element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
            <Route path="/audit"     element={<ProtectedRoute><AuditPage /></ProtectedRoute>} />
            <Route path="*"          element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Shell />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1a2e',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
