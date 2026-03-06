import React from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PrivacyProgress from '../components/PrivacyProgress';
import SessionTimer from '../components/security/SessionTimer';
import DeviceTrustIndicator from '../components/auth/DeviceTrustIndicator';
import RoleBadge from '../components/security/RoleBadge';

const ALL_ROLES = ['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Patient'];

const rolePathMap = {
    Admin: '/admin',
    Doctor: '/doctor',
    Nurse: '/nurse',
    Receptionist: '/receptionist',
    Patient: '/patient',
};

const Topbar = () => {
    const { role, user, privacyBudget, setRole, logout, isAdmin } = useAuth();
    const navigate = useNavigate();

    const handleRoleSwitch = (newRole) => {
        setRole(newRole);
        navigate(rolePathMap[newRole] || '/');
    };

    return (
        <header className="glass-header h-16 px-6 flex items-center justify-between z-10 shrink-0">

            {/* Left Section */}
            <div className="flex items-center gap-4">
                {/* Dashboard Switcher — Admin only */}
                {isAdmin && (
                    <div className="hidden md:flex items-center gap-2">
                        <span className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">View Dashboard</span>
                        <select
                            className="bg-white/5 border border-white/10 text-text-primary text-xs rounded-md px-2 py-1.5 outline-none font-medium cursor-pointer focus:ring-2 focus:ring-accent-blue"
                            value={role}
                            onChange={(e) => handleRoleSwitch(e.target.value)}
                        >
                            {ALL_ROLES.map(r => (
                                <option key={r} value={r} className="bg-primary">{r}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-6">
                <DeviceTrustIndicator />
                <RoleBadge role={role} />
                <div className="w-48">
                    <PrivacyProgress budget={privacyBudget} />
                </div>
                <SessionTimer />
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-sm font-semibold text-text-primary">{user?.name || 'Guest User'}</p>
                        <p className="text-xs text-text-secondary">{user?.email || 'no-session'}</p>
                    </div>
                    <button onClick={logout} className="p-2 rounded-full text-text-secondary hover:bg-white/5 hover:text-white transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Topbar;

