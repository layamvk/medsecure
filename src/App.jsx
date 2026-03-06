import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// Layouts
import MainLayout from './layouts/MainLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import QueryInbox from './pages/QueryInbox';
import AIAssistant from './pages/AIAssistant';
import AppointmentBooking from './pages/AppointmentBooking';
import XRayAnalysis from './pages/XRayAnalysis';

// Deep Patient UI Protocol Routes
import NewQuery from './pages/patient/NewQuery';
import QueryHistory from './pages/patient/QueryHistory';
import QueryDetail from './pages/patient/QueryDetail';

// Hospital Staff Routes
import StaffQueryInbox from './pages/staff/QueryInbox';
import StaffQueryDetail from './pages/staff/QueryDetail';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes (Wrapped in MainLayout with Sidebar) */}
          <Route element={<MainLayout />}>
            {/* Default Routing */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/queries" element={<QueryInbox />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/xray-analysis" element={<XRayAnalysis />} />
            <Route path="/appointments" element={<AppointmentBooking />} />

            {/* Phase 3 - Patient Interface Routes */}
            <Route path="/patient" element={<Navigate to="/dashboard" replace />} />
            <Route path="/patient/new-query" element={<NewQuery />} />
            <Route path="/patient/queries" element={<QueryHistory />} />
            <Route path="/patient/queries/:id" element={<QueryDetail />} />

            {/* Phase 4 - Staff Interface Routes */}
            <Route path="/staff/queries" element={<StaffQueryInbox />} />
            <Route path="/staff/queries/:id" element={<StaffQueryDetail />} />

            {/* Role dashboard aliases */}
            <Route path="/doctor" element={<Navigate to="/dashboard" replace />} />
            <Route path="/nurse" element={<Navigate to="/dashboard" replace />} />
            <Route path="/receptionist" element={<Navigate to="/dashboard" replace />} />
            <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
