import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getQueries } from '../../services/queryService';
import StatusBadge from '../../components/StatusBadge';
import { socket } from '../../services/socket';
import toast from 'react-hot-toast';
import { Sparkles, Clock, AlertTriangle, CheckCircle, Filter, Search } from 'lucide-react';

// Mock data for demo purposes when API returns empty
const mockQueries = [
    {
        _id: 'mock-1',
        patientId: { name: 'Sarah Jenkins', email: 'sarah.j@email.com' },
        message: "I've been feeling dizzy since starting the new meds. Is this normal?",
        category: 'medication',
        priority: 'high',
        status: 'open',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        aiSuggestion: "Hi Sarah, dizziness can be a side effect, but we should monitor it. Please rest and record your heart rate. Our team will call you in 30 mins."
    },
    {
        _id: 'mock-2',
        patientId: { name: 'Robert Chen', email: 'robert.chen@email.com' },
        message: "Can I get my lab results from Monday's visit?",
        category: 'general',
        priority: 'normal',
        status: 'triaged',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        aiSuggestion: "Hello Robert, your lab results are ready. Everything looks within the normal range. You can view the full report in the patient portal now."
    },
    {
        _id: 'mock-3',
        patientId: { name: 'Maria Garcia', email: 'maria.g@email.com' },
        message: "I need to reschedule my appointment for next week. Can someone help?",
        category: 'appointment',
        priority: 'low',
        status: 'open',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        aiSuggestion: "Hi Maria, I'd be happy to help you reschedule. We have openings on Tuesday at 2pm or Thursday at 10am. Which works better for you?"
    },
    {
        _id: 'mock-4',
        patientId: { name: 'James Wilson', email: 'james.w@email.com' },
        message: "Experiencing severe chest pain and shortness of breath. Need urgent advice.",
        category: 'symptom',
        priority: 'critical',
        status: 'open',
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        aiSuggestion: "URGENT: James, these symptoms require immediate attention. Please call 911 or go to the nearest emergency room immediately. Do not delay."
    }
];

export default function StaffQueryInbox() {
    const navigate = useNavigate();
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Filters State
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');

    useEffect(() => {
        getQueries()
            .then((res) => {
                const data = res.data && res.data.length > 0 ? res.data : mockQueries;
                setQueries(data);
            })
            .catch(() => {
                // Use mock data on error for demo
                setError(null);
                setQueries(mockQueries);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        socket.on("query:new", (newQuery) => {
            setQueries((prev) => [newQuery, ...prev]);
            toast.success("New patient query received");
        });

        socket.on("query:status", (updatedQuery) => {
            setQueries((prev) =>
                prev.map((q) =>
                    q._id === updatedQuery._id ? updatedQuery : q
                )
            );
        });

        return () => {
            socket.off("query:new");
            socket.off("query:status");
        };
    }, []);

    const formatDate = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getPriorityConfig = (priority) => {
        switch (priority) {
            case 'low': return { color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200', label: 'Low' };
            case 'normal': return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Normal' };
            case 'high': return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'High' };
            case 'critical': return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Critical' };
            default: return { color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200', label: 'Normal' };
        }
    };

    // Derived filtered data
    const filteredQueries = queries.filter(q => {
        if (filterStatus !== 'all' && q.status !== filterStatus) return false;
        if (filterPriority !== 'all' && q.priority !== filterPriority) return false;
        if (filterCategory !== 'all' && q.category !== filterCategory) return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const patientName = (q.patientId?.name || q.patientId?.email || '').toLowerCase();
            const message = (q.message || '').toLowerCase();
            if (!patientName.includes(term) && !message.includes(term)) return false;
        }
        return true;
    });

    const stats = {
        total: queries.length,
        critical: queries.filter(q => q.priority === 'critical').length,
        pending: queries.filter(q => q.status === 'open' || q.status === 'triaged').length,
        resolved: queries.filter(q => q.status === 'closed' || q.status === 'responded').length
    };

    // Card animation variants
    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: (i) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.05,
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94]
            }
        }),
        hover: {
            scale: 1.02,
            boxShadow: '0 20px 50px rgba(0,0,0,0.12)',
            transition: { duration: 0.2 }
        }
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
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Patient Query Triage</h1>
                    <p className="text-slate-500 mt-1">AI-assisted response management system</p>
                </motion.div>

                {/* Stats Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
                >
                    {[
                        { label: 'Total Queries', value: stats.total, icon: Sparkles, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Critical', value: stats.critical, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
                        { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                        { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' }
                    ].map((stat, idx) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 + idx * 0.05 }}
                            className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 p-5 shadow-lg"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                                    <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                                </div>
                                <div className={`${stat.bg} p-3 rounded-2xl`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Filter Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 p-6 mb-6 shadow-lg"
                >
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px] relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search patients or queries..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50/80 border border-slate-200/60 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-2 text-slate-500">
                            <Filter className="w-4 h-4" />
                            <span className="text-sm font-medium">Filters:</span>
                        </div>

                        {/* Status Filter */}
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="px-4 py-2.5 bg-slate-50/80 border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                        >
                            <option value="all">All Status</option>
                            <option value="open">Open</option>
                            <option value="triaged">Triaged</option>
                            <option value="in_progress">In Progress</option>
                            <option value="responded">Responded</option>
                            <option value="closed">Closed</option>
                        </select>

                        {/* Priority Filter */}
                        <select
                            value={filterPriority}
                            onChange={e => setFilterPriority(e.target.value)}
                            className="px-4 py-2.5 bg-slate-50/80 border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                        >
                            <option value="all">All Priority</option>
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>

                        {/* Category Filter */}
                        <select
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                            className="px-4 py-2.5 bg-slate-50/80 border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                        >
                            <option value="all">All Categories</option>
                            <option value="symptom">Symptom</option>
                            <option value="medication">Medication</option>
                            <option value="appointment">Appointment</option>
                            <option value="billing">Billing</option>
                            <option value="general">General</option>
                        </select>
                    </div>
                </motion.div>

                {/* Query Feed */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 p-6 animate-pulse">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-slate-200 rounded-2xl"></div>
                                    <div className="flex-1">
                                        <div className="h-5 bg-slate-200 rounded-lg w-1/4 mb-3"></div>
                                        <div className="h-4 bg-slate-200 rounded-lg w-3/4 mb-2"></div>
                                        <div className="h-4 bg-slate-200 rounded-lg w-1/2"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-red-50/80 backdrop-blur-xl text-red-600 p-6 rounded-3xl border border-red-200/60"
                    >
                        {error}
                    </motion.div>
                ) : filteredQueries.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-16 bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 shadow-lg"
                    >
                        <div className="w-16 h-16 bg-slate-100 rounded-3xl mx-auto mb-4 flex items-center justify-center">
                            <Search className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-slate-500 text-lg">No queries match your filters</p>
                        <p className="text-slate-400 text-sm mt-1">Try adjusting your search criteria</p>
                    </motion.div>
                ) : (
                    <AnimatePresence>
                        <div className="space-y-4">
                            {filteredQueries.map((query, index) => {
                                const priorityConfig = getPriorityConfig(query.priority);
                                return (
                                    <motion.div
                                        key={query._id}
                                        custom={index}
                                        variants={cardVariants}
                                        initial="hidden"
                                        animate="visible"
                                        whileHover="hover"
                                        onClick={() => navigate(`/staff/queries/${query._id}`)}
                                        className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 p-6 cursor-pointer shadow-lg transition-all"
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Avatar */}
                                            <div className={`w-12 h-12 ${priorityConfig.bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                                                <span className={`text-lg font-bold ${priorityConfig.color}`}>
                                                    {(query.patientId?.name || 'U')[0].toUpperCase()}
                                                </span>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                    <h3 className="text-slate-900 font-semibold truncate">
                                                        {query.patientId?.name || query.patientId?.email || 'Unknown Patient'}
                                                    </h3>
                                                    <StatusBadge status={query.status} />
                                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${priorityConfig.bg} ${priorityConfig.color} ${priorityConfig.border} border`}>
                                                        {priorityConfig.label}
                                                    </span>
                                                    {query.aiSuggestion && (
                                                        <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-violet-50 text-violet-600 border border-violet-200 flex items-center gap-1">
                                                            <Sparkles className="w-3 h-3" />
                                                            AI Ready
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-slate-600 text-sm line-clamp-2 mb-3">{query.message}</p>
                                                <div className="flex items-center gap-4 text-xs text-slate-400">
                                                    <span className="capitalize bg-slate-100 px-2 py-1 rounded-lg">{query.category || 'General'}</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDate(query.createdAt)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Arrow */}
                                            <div className="flex-shrink-0 text-slate-300">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}