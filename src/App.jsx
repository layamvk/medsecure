import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import ProtectedRoute from './layout/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import PrivacyBudget from './pages/PrivacyBudget';
import History from './pages/History';
import Login from './pages/Login';
import NurseDashboard from './pages/NurseDashboard';
import NursePatients from './pages/NursePatients';
import AdminUsers from './pages/AdminUsers';
import AdminAudit from './pages/AdminAudit';
import AdminRisk from './pages/AdminRisk';
import AdminSettings from './pages/AdminSettings';
import ReceptionistDashboard from './pages/ReceptionistDashboard';
import PatientDashboard from './pages/PatientDashboard';
import PatientRecords from './pages/PatientRecords';
import PatientTransparency from './pages/PatientTransparency';
import ReceptionistAppointments from './pages/ReceptionistAppointments';
import { AuthProvider, useAuth } from './context/AuthContext';

function DashboardRedirect() {
  const { getDashboardPath } = useAuth();
  return <Navigate to={getDashboardPath()} replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<AppLayout />}>
            {/* Default Route handles redirection based on role */}
            <Route index element={<DashboardRedirect />} />

            {/* Doctor Routes */}
            <Route path="doctor" element={<ProtectedRoute allowedRoles={['Doctor']}><Dashboard /></ProtectedRoute>} />
            <Route path="doctor/patients" element={<ProtectedRoute allowedRoles={['Doctor']}><Patients /></ProtectedRoute>} />
            <Route path="doctor/patients/:id" element={<ProtectedRoute allowedRoles={['Doctor']}><PatientDetail /></ProtectedRoute>} />
            <Route path="doctor/privacy" element={<ProtectedRoute allowedRoles={['Doctor']}><PrivacyBudget /></ProtectedRoute>} />
            <Route path="doctor/history" element={<ProtectedRoute allowedRoles={['Doctor']}><History /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="admin" element={<ProtectedRoute allowedRoles={['Admin']}><AdminPanel /></ProtectedRoute>} />
            <Route path="admin/users" element={<ProtectedRoute allowedRoles={['Admin']}><AdminUsers /></ProtectedRoute>} />
            <Route path="admin/audit" element={<ProtectedRoute allowedRoles={['Admin']}><AdminAudit /></ProtectedRoute>} />
            <Route path="admin/risk" element={<ProtectedRoute allowedRoles={['Admin']}><AdminRisk /></ProtectedRoute>} />
            <Route path="admin/settings" element={<ProtectedRoute allowedRoles={['Admin']}><AdminSettings /></ProtectedRoute>} />

            {/* Other Role Dashboards */}
            <Route path="nurse" element={<ProtectedRoute allowedRoles={['Nurse']}><NurseDashboard /></ProtectedRoute>} />
            <Route path="nurse/patients" element={<ProtectedRoute allowedRoles={['Nurse']}><NursePatients /></ProtectedRoute>} />
            <Route path="nurse/privacy" element={<ProtectedRoute allowedRoles={['Nurse']}><PrivacyBudget /></ProtectedRoute>} />
            <Route path="receptionist" element={<ProtectedRoute allowedRoles={['Receptionist']}><ReceptionistDashboard /></ProtectedRoute>} />
            <Route path="receptionist/appointments" element={<ProtectedRoute allowedRoles={['Receptionist']}><ReceptionistAppointments /></ProtectedRoute>} />
            <Route path="patient" element={<ProtectedRoute allowedRoles={['Patient']}><PatientDashboard /></ProtectedRoute>} />
            <Route path="patient/transparency" element={<ProtectedRoute allowedRoles={['Patient']}><PatientTransparency /></ProtectedRoute>} />
                      <Route path="patient/records" element={<ProtectedRoute allowedRoles={['Patient']}><PatientRecords /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
