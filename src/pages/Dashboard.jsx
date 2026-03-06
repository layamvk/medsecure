import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Users, MessageSquare, Clock, AlertTriangle, 
    Sparkles, Activity, Calendar, TrendingUp,
    ArrowRight, Bell, Brain, Shield
} from 'lucide-react';
import api from '../api/axiosConfig';

// Fallback data used when backend is unreachable
const fallbackStats = {
    totalPatients: 0,
    activeQueries: 0,
    pendingReview: 0,
    urgentAlerts: 0
};

const fallbackActivity = [
    { id: 1, type: 'query', message: 'System ready — waiting for patient queries', time: new Date().toISOString(), urgent: false },
    { id: 2, type: 'ai', message: 'AI + ML pipeline active', time: new Date().toISOString(), urgent: false },
];

const quickActions = [
    { label: 'View Patient Queries', path: '/staff/queries', icon: MessageSquare, color: 'bg-blue-500' },
    { label: 'AI Assistant', path: '/ai-assistant', icon: Sparkles, color: 'bg-violet-500' },
    { label: 'Appointments', path: '/appointments', icon: Calendar, color: 'bg-emerald-500' },
];

export default function Dashboard() {
    const [stats, setStats] = useState(fallbackStats);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const [statsRes, activityRes] = await Promise.all([
                    api.get('/dashboard/stats').catch(() => null),
                    api.get('/dashboard/activity').catch(() => null)
                ]);

                // Stats
                if (statsRes?.data?.stats) {
                    setStats(statsRes.data.stats);
                } else {
                    // Fallback: try individual endpoints
                    const [queriesRes, patientsRes] = await Promise.all([
                        api.get('/queries').catch(() => ({ data: [] })),
                        api.get('/patients').catch(() => ({ data: [] }))
                    ]);
                    const queries = Array.isArray(queriesRes.data) ? queriesRes.data : [];
                    const patients = Array.isArray(patientsRes.data) ? patientsRes.data : [];
                    setStats({
                        totalPatients: patients.length,
                        activeQueries: queries.filter(q => q.status !== 'closed').length,
                        pendingReview: queries.filter(q => q.status === 'open' || q.status === 'triaged').length,
                        urgentAlerts: queries.filter(q => q.priority === 'critical').length
                    });
                }

                // Activity
                if (activityRes?.data?.activities?.length > 0) {
                    setActivity(activityRes.data.activities);
                } else {
                    setActivity(fallbackActivity);
                }
            } catch {
                setStats(fallbackStats);
                setActivity(fallbackActivity);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, []);

    const statCards = [
        { label: 'Total Patients', value: stats.totalPatients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: null },
        { label: 'Active Queries', value: stats.activeQueries, icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-50', trend: null },
        { label: 'Pending Review', value: stats.pendingReview, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', trend: null },
        { label: 'Urgent Alerts', value: stats.urgentAlerts, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', trend: null },
    ];

    const getActivityIcon = (type) => {
        switch (type) {
            case 'query': return MessageSquare;
            case 'ai': return Sparkles;
            case 'response': return Activity;
            case 'appointment': return Calendar;
            case 'auth': return Shield;
            default: return Bell;
        }
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return '';
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 py-8 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome to MedSecure</h1>
                    <p className="text-slate-500 mt-1">AI-powered healthcare communication platform</p>
                </motion.div>

                {/* Stats Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                >
                    {statCards.map((stat, idx) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 + idx * 0.05 }}
                            whileHover={{ scale: 1.02, boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}
                            className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 p-6 shadow-lg cursor-pointer"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`${stat.bg} p-3 rounded-2xl`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                                {stat.value > 0 && (
                                    <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600">
                                        <TrendingUp className="w-3 h-3 inline mr-1" />
                                        Live
                                    </span>
                                )}
                            </div>
                            <div>
                                <p className={`text-3xl font-bold ${stat.color}`}>
                                    {loading ? (
                                        <span className="inline-block w-16 h-8 bg-slate-200 rounded-lg animate-pulse"></span>
                                    ) : (
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.5 }}
                                        >
                                            {stat.value.toLocaleString()}
                                        </motion.span>
                                    )}
                                </p>
                                <p className="text-sm font-medium text-slate-500 mt-1">{stat.label}</p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="lg:col-span-1"
                    >
                        <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
                        <div className="space-y-3">
                            {quickActions.map((action, idx) => (
                                <motion.div
                                    key={action.label}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + idx * 0.1 }}
                                    whileHover={{ scale: 1.02 }}
                                >
                                    <Link
                                        to={action.path}
                                        className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-xl rounded-2xl border border-white/40 shadow-sm hover:shadow-lg transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`${action.color} p-2.5 rounded-xl text-white`}>
                                                <action.icon className="w-5 h-5" />
                                            </div>
                                            <span className="font-medium text-slate-700">{action.label}</span>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                                    </Link>
                                </motion.div>
                            ))}
                        </div>

                        {/* AI Assistant Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="mt-6"
                        >
                            <div className="bg-gradient-to-br from-violet-500 to-blue-600 rounded-3xl p-6 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">AI Response Assistant</h3>
                                    <p className="text-white/80 text-sm mb-4">Generate intelligent draft responses for patient queries with our ML-powered assistant.</p>
                                    <Link
                                        to="/staff/queries"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors"
                                    >
                                        Get Started
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Activity Feed */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="lg:col-span-2"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
                            <Link to="/staff/queries" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                                View All
                            </Link>
                        </div>
                        <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 shadow-lg overflow-hidden">
                            <div className="divide-y divide-slate-100">
                                {activity.map((item, idx) => {
                                    const Icon = getActivityIcon(item.type);
                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 + idx * 0.05 }}
                                            className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors"
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                item.urgent ? 'bg-red-100' : 'bg-slate-100'
                                            }`}>
                                                <Icon className={`w-5 h-5 ${item.urgent ? 'text-red-600' : 'text-slate-500'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${item.urgent ? 'font-semibold text-red-700' : 'text-slate-700'}`}>
                                                    {item.message}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-0.5">{typeof item.time === 'string' && item.time.includes('T') ? formatTimeAgo(item.time) : item.time}</p>
                                            </div>
                                            {item.urgent && (
                                                <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-600 rounded-lg">
                                                    Urgent
                                                </span>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
