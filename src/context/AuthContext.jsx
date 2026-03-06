import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axiosConfig';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Map lowercase backend role → Title-case frontend role
const toDisplayRole = (backendRole) => {
    const map = { admin: 'Admin', doctor: 'Doctor', nurse: 'Nurse', receptionist: 'Receptionist', patient: 'Patient' };
    return map[backendRole] || 'Doctor';
};

// Map frontend role → dashboard path
const rolePath = (displayRole) => {
    const map = { Admin: '/admin', Doctor: '/doctor', Nurse: '/nurse', Receptionist: '/receptionist', Patient: '/patient' };
    return map[displayRole] || '/';
};

// Static display names / avatars used when backend doesn't have real names yet
const defaultUserInfo = (displayRole) => {
    const map = {
        Admin:        { name: 'System Administrator', avatar: 'SA' },
        Doctor:       { name: 'Dr. Sarah Jenkins',    avatar: 'SJ' },
        Nurse:        { name: 'Nurse Maria Rodriguez', avatar: 'MR' },
        Receptionist: { name: 'Lisa Chen',             avatar: 'LC' },
        Patient:      { name: 'John Patterson',        avatar: 'JP' },
    };
    return map[displayRole] || { name: displayRole, avatar: '?' };
};

export const AuthProvider = ({ children }) => {
    // `role` is the *currently viewed* role (admin can switch this to preview other dashboards)
    const [role, setRole] = useState('Doctor');
    // `isAdmin` tracks whether the authenticated user is actually an admin
    const [isAdmin, setIsAdmin] = useState(false);

    const [user, setUser] = useState(defaultUserInfo('Doctor'));
    const [privacyBudget, setPrivacyBudget] = useState({ current: 34, max: 50 });

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [deviceTrusted, setDeviceTrusted] = useState(false);
    const [sessionTime, setSessionTime] = useState(14 * 60 + 32);
    const [accessToken, setAccessToken] = useState(null);

    // When admin simulates a different role, keep user name accurate
    useEffect(() => {
        if (!isAuthenticated) return;
        if (isAdmin) return; // admin's user info stays fixed; only the role label changes
        setUser(prev => ({ ...prev })); // keep existing
    }, [role]);

    const establishSession = (token, userData) => {
        setAccessToken(token);
        api.defaults.headers.common['Authorization'] = 'Bearer ' + token;
        setIsAuthenticated(true);
        if (userData) {
            const displayRole = toDisplayRole(userData.role);
            const adminFlag = userData.role === 'admin';
            setRole(displayRole);
            setIsAdmin(adminFlag);
            const fullName = [userData.first_name, userData.last_name].filter(Boolean).join(' ');
            const avatar = (userData.first_name?.[0] || '') + (userData.last_name?.[0] || '');
            setUser({ name: fullName || displayRole, email: userData.email, avatar: avatar || displayRole[0] });
        }
    };

    const login = async (email, password) => {
        // 1. Obtain tokens
        const tokenResp = await api.post('auth/token/', { email, password });
        const token = tokenResp.data.access;
        setAccessToken(token);
        api.defaults.headers.common['Authorization'] = 'Bearer ' + token;

        // 2. Use user info embedded in login response (added by CookieTokenObtainPairView)
        const userData = tokenResp.data.user;
        establishSession(token, userData);

        // 3. Return dashboard path so LoginForm can navigate immediately (avoids async state timing)
        const displayRole = toDisplayRole(userData?.role);
        return { dashboardPath: rolePath(displayRole) };
    };

    const refreshToken = async () => {
        try {
            const resp = await api.post('auth/token/refresh/');
            const token = resp.data.access;
            setAccessToken(token);
            api.defaults.headers.common['Authorization'] = 'Bearer ' + token;
            return token;
        } catch (e) {
            setIsAuthenticated(false);
            setAccessToken(null);
            throw e;
        }
    };

    const logout = async () => {
        try { await api.post('users/logout/'); } catch (_) {}
        setIsAuthenticated(false);
        setAccessToken(null);
        setUser(null);
        setIsAdmin(false);
        setRole('Doctor');
        delete api.defaults.headers.common['Authorization'];
    };

    // Static RBAC permissions map
    const permissions = {
        Admin:        { allowed: ['System configuration', 'User management', 'Global audit logs', 'Emergency overrides'], denied: ['Direct patient care'] },
        Doctor:       { allowed: ['View assigned patients', 'Edit diagnosis', 'Prescribe medication', 'Access clinical history'], denied: ['Delete patient records', 'Access admin panel'] },
        Nurse:        { allowed: ['View assigned patients', 'Update vitals', 'Administer medication'], denied: ['Edit diagnosis', 'Access high-sensitivity filters'] },
        Receptionist: { allowed: ['View appointments', 'Manage scheduling', 'Process billing'], denied: ['Access clinical records', 'Modify treatment plans'] },
        Patient:      { allowed: ['View own records', 'Request appointments', 'View access logs for self'], denied: ['View other patients', 'Modify clinical data'] },
    };

    const getDashboardPath = () => rolePath(role);

    return (
        <AuthContext.Provider value={{
            role, setRole,
            isAdmin,
            user, setUser,
            privacyBudget, setPrivacyBudget,
            isAuthenticated, setIsAuthenticated,
            deviceTrusted, setDeviceTrusted,
            sessionTime, setSessionTime,
            accessToken,
            activePermissions: permissions[role] || permissions.Doctor,
            getDashboardPath,
            login,
            logout,
            refreshToken,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
