import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, role, isAdmin, getDashboardPath } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Admin can access every route (they use the switcher to preview any dashboard)
    if (isAdmin) return children;

    if (!allowedRoles.includes(role)) {
        return <Navigate to={getDashboardPath()} state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;

