import { Outlet, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
    ShieldPlus, LayoutDashboard, Users, FileText,
    Activity, Settings, Eye, Clock, Calendar, MessageSquare, Sparkles,
    LogOut, Menu, X, Bell, ChevronRight, ScanLine
} from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = {
    Admin: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Analytics', path: '/admin-dashboard', icon: Activity },
        { label: 'User Management', path: '/admin/users', icon: Users },
        { label: 'Audit Logs', path: '/admin/audit', icon: FileText },
        { label: 'Risk Monitor', path: '/admin/risk', icon: Activity },
        { label: 'Settings', path: '/admin/settings', icon: Settings },
    ],
    Doctor: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Query Triage', path: '/staff/queries', icon: MessageSquare },
        { label: 'AI Assistant', path: '/ai-assistant', icon: Sparkles },
        { label: 'X-Ray Analysis', path: '/xray-analysis', icon: ScanLine },
        { label: 'Appointments', path: '/appointments', icon: Calendar },
        { label: 'My Patients', path: '/doctor/patients', icon: Users },
    ],
    Nurse: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Query Triage', path: '/staff/queries', icon: MessageSquare },
        { label: 'AI Assistant', path: '/ai-assistant', icon: Sparkles },
        { label: 'X-Ray Analysis', path: '/xray-analysis', icon: ScanLine },
        { label: 'Appointments', path: '/appointments', icon: Calendar },
        { label: 'Patients', path: '/nurse/patients', icon: Users },
    ],
    Receptionist: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Query Triage', path: '/staff/queries', icon: MessageSquare },
        { label: 'Appointments', path: '/appointments', icon: Calendar },
    ],
    Patient: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Submit Query', path: '/patient/new-query', icon: FileText },
        { label: 'My Queries', path: '/patient/queries', icon: MessageSquare },
        { label: 'AI Assistant', path: '/ai-assistant', icon: Sparkles },
        { label: 'X-Ray Analysis', path: '/xray-analysis', icon: ScanLine },
        { label: 'Appointments', path: '/appointments', icon: Calendar },
        { label: 'Transparency', path: '/patient/transparency', icon: ShieldPlus },
    ],
};

const MainLayout = () => {
    const { role, user, logout, isAuthenticated, authChecked } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Show nothing while checking authentication
    if (!authChecked) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/25 mb-4 animate-pulse">
                        <ShieldPlus className="w-9 h-9 text-white" />
                    </div>
                    <p className="text-slate-500 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const handleLogout = async () => {
        try {
            await logout();
        } catch {
            localStorage.removeItem('authToken');
        }
        navigate('/login');
    };

    const navItems = NAV_ITEMS[role] || NAV_ITEMS.Doctor;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 shadow-xl transform transition-transform duration-300 lg:translate-x-0 lg:static lg:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="px-6 py-5 border-b border-slate-200/60">
                        <Link to="/dashboard" className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                                <ShieldPlus className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-slate-900 text-lg tracking-tight">MedSecure</h1>
                                <p className="text-xs text-slate-500">AI Healthcare</p>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-3">{role}</p>
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path || 
                                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                                        isActive
                                            ? 'bg-blue-50 text-blue-700 shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                    {item.label}
                                    {isActive && <ChevronRight className="w-4 h-4 ml-auto text-blue-400" />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile */}
                    <div className="px-4 py-4 border-t border-slate-200/60">
                        <div className="flex items-center gap-3 px-3 py-2">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                                {user?.avatar || role?.[0] || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'User'}</p>
                                <p className="text-xs text-slate-500 truncate">{user?.email || role}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full mt-2 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b border-slate-200/60 px-6 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                            >
                                {sidebarOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="p-2 rounded-xl hover:bg-slate-100 transition-colors relative">
                                <Bell className="w-5 h-5 text-slate-500" />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                            </button>
                            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                                <span className="text-sm font-medium text-slate-700">{role}</span>
                                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1">
                    <Outlet />
                </main>

                {/* Footer */}
                <footer className="bg-white/40 backdrop-blur-sm border-t border-slate-200/60 py-3 text-center text-xs text-slate-400">
                    &copy; {new Date().getFullYear()} MedSecure — AI-Powered Healthcare Platform
                </footer>
            </div>
        </div>
    );
};

export default MainLayout;
