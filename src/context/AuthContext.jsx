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
        localStorage.setItem('authToken', token);
        api.defaults.headers.common['Authorization'] = 'Bearer ' + token;
        setIsAuthenticated(true);
        if (userData) {
            const displayRole = toDisplayRole(userData.role);
            const adminFlag = userData.role === 'admin';
            setRole(displayRole);
            setIsAdmin(adminFlag);
            const fullName = [userData.firstName, userData.lastName].filter(Boolean).join(' ');
            const avatar = (userData.firstName?.[0] || '') + (userData.lastName?.[0] || '');
            setUser({ 
                name: fullName || userData.username || displayRole, 
                email: userData.email, 
                avatar: avatar || displayRole[0] 
            });
        }
    };

    const login = async (email, password) => {
        try {
            // 1. Call Node.js login endpoint
            const response = await api.post('auth/login', { email, password });
            
            // 2. Extract token and user data from Node.js response format
            const token = response.data?.token || response.token;
            const userData = response.data?.user || response.user;
            
            if (!token || !userData) {
                throw new Error('Invalid response from server');
            }
            
            // 3. Establish session
            establishSession(token, userData);

            // 4. Return dashboard path
            const displayRole = toDisplayRole(userData?.role);
            return { dashboardPath: rolePath(displayRole) };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const refreshToken = async () => {
        try {
            const resp = await api.post('auth/refresh');
            const token = resp.data?.token || resp.token;
            if (token) {
                setAccessToken(token);
                localStorage.setItem('authToken', token);
                api.defaults.headers.common['Authorization'] = 'Bearer ' + token;
            }
            return token;
        } catch (e) {
            setIsAuthenticated(false);
            setAccessToken(null);
            localStorage.removeItem('authToken');
            throw e;
        }
    };

    const logout = async () => {
        try { 
            await api.post('auth/logout'); 
        } catch (_) {}
        setIsAuthenticated(false);
        setAccessToken(null);
        localStorage.removeItem('authToken');
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
