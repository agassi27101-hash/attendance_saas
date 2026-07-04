import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { ToastProvider, useToast } from './components/Toast';
import { isLoggedIn, deleteToken } from './services/auth';
import { setupAuthInterceptors } from './services/api';

// Page Imports
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { Zones } from './pages/Zones';
import { Attendance } from './pages/Attendance';
import { Payroll } from './pages/Payroll';
import { Settings } from './pages/Settings';

// Map pathnames to Header titles
const getHeaderTitle = (pathname: string): string => {
  switch (pathname) {
    case '/':
      return 'Overview Dashboard';
    case '/employees':
      return 'Employees Directory';
    case '/zones':
      return 'Office Geofences';
    case '/attendance':
      return 'Attendance Logs';
    case '/payroll':
      return 'Payroll Management';
    case '/settings':
      return 'Configuration Settings';
    default:
      return 'Operational Dashboard';
  }
};

// Protected Routes Layout Wrapper
const ProtectedLayout: React.FC = () => {
  const location = useLocation();
  const { showToast } = useToast();
  const [authorized, setAuthorized] = useState(isLoggedIn());

  useEffect(() => {
    // Setup interceptors to handle network exceptions
    setupAuthInterceptors(
      () => {
        // On 401 Unauthorized
        deleteToken();
        setAuthorized(false);
        showToast('Session expired. Please log in again.', 'error');
      },
      (msg) => {
        // On 403 Forbidden
        showToast(msg, 'error');
      }
    );
  }, [showToast]);

  if (!authorized) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-layout">
        <Header title={getHeaderTitle(location.pathname)} />
        <main className="content-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Protected Routes Group */}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/zones" element={<Zones />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <Router>
        <AppContent />
      </Router>
    </ToastProvider>
  );
};

export default App;
