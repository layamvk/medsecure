import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    ShieldPlus, LayoutDashboard, Users, FileText,
    Activity, Settings, Eye, Clock, Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = {
    Admin: [
        { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { label: 'User Management', path: '/admin/users', icon: Users },
        { label: 'Audit Logs', path: '/admin/audit', icon: FileText },
        { label: 'Risk Monitor', path: '/admin/risk', icon: Activity },
        { label: 'Settings', path: '/admin/settings', icon: Settings },
    ],
    Doctor: [
        { label: 'Dashboard', path: '/doctor', icon: LayoutDashboard },
        { label: 'My Patients', path: '/doctor/patients', icon: Users },
        { label: 'Privacy Budget', path: '/doctor/privacy', icon: Eye },
        { label: 'Access History', path: '/doctor/history', icon: Clock },
    ],
    Nurse: [
        { label: 'Dashboard', path: '/nurse', icon: LayoutDashboard },
        { label: 'Assigned Patients', path: '/nurse/patients', icon: Users },
        { label: 'Privacy Budget', path: '/nurse/privacy', icon: Eye },
    ],
    Receptionist: [
        { label: 'Dashboard', path: '/receptionist', icon: LayoutDashboard },
        { label: 'Appointments', path: '/receptionist/appointments', icon: Calendar },
    ],
    Patient: [
        { label: 'Dashboard', path: '/patient', icon: LayoutDashboard },
        { label: 'My Records', path: '/patient/records', icon: FileText },
        { label: 'Privacy & Transparency', path: '/patient/transparency', icon: ShieldPlus },
    ],
};

const Sidebar = () => {
    const { role } = useAuth();
    const navItems = NAV_ITEMS[role] || [];

    return (
        <aside className="glass-sidebar w-64 flex-shrink-0 p-4 flex flex-col">
            <div className="text-center py-4 mb-4">
                <h1 className="text-2xl font-bold text-white tracking-wider">MedSecure</h1>
            </div>
            <nav className="flex flex-col space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                                isActive
                                    ? 'bg-accent-blue/80 text-white shadow-lg'
                                    : 'text-text-secondary hover:bg-white/5 hover:text-white'
                            }`
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
