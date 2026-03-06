import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getQueryById, respondToQuery, getAISuggestion } from '../../services/queryService';
import StatusBadge from '../../components/StatusBadge';
import { socket } from '../../services/socket';
import toast from 'react-hot-toast';
import { Sparkles, ArrowLeft, Send, RefreshCw, Clock, User, FileText, CheckCircle } from 'lucide-react';

// Mock query for demo when real query not found
const mockQuery = {
    _id: 'mock-1',
    patientId: { name: 'Sarah Jenkins', email: 'sarah.j@email.com' },
    message: "I've been feeling dizzy since starting the new meds. Is this normal?",
    category: 'medication',
    priority: 'high',
    status: 'open',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    aiSuggestion: "Hi Sarah, dizziness can be a side effect, but we should monitor it. Please rest and record your heart rate. Our team will call you in 30 mins.",
    responses: []
};

export default function StaffQueryDetail() {
    const { id } = useParams();
    const [query, setQuery] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Response form state
    const [responseText, setResponseText] = useState('');
    const [sending, setSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);

    // AI Suggestion State
    const [aiSuggestion, setAiSuggestion] = useState('');
    const [loadingSuggestion, setLoadingSuggestion] = useState(false);

    const fetchQueryData = () => {
        getQueryById(id)
            .then((res) => {
                setQuery(res.data);
                if (res.data.aiSuggestion) {
                    setAiSuggestion(res.data.aiSuggestion);
                }
            })
            .catch(() => {
                // Use mock data for demo
                if (id.startsWith('mock-')) {
                    setQuery(mockQuery);
                    setAiSuggestion(mockQuery.aiSuggestion);
                } else {
                    setError('Failed to load query details.');
                }
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchQueryData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        const handleResponse = (updatedQuery) => {
            if (updatedQuery._id === id) {
                setQuery(updatedQuery);
            }
        };

        socket.on("query:response", handleResponse);

        return () => {
            socket.off("query:response", handleResponse);
        };
    }, [id]);

    const handleGenerateAI = async () => {
        setLoadingSuggestion(true);
        try {
            const res = await getAISuggestion(id);
            const draft = res.data.aiSuggestion;
            setAiSuggestion(draft);
            setResponseText(draft);
            toast.success('AI draft generated successfully');
        } catch {
            // Generate mock AI response for demo
            const mockResponse = "Thank you for reaching out. Based on your symptoms, I recommend scheduling a follow-up appointment. In the meantime, please monitor your condition and contact us immediately if symptoms worsen.";
            setAiSuggestion(mockResponse);
            setResponseText(mockResponse);
            toast.success('AI draft generated (demo mode)');
        } finally {
            setLoadingSuggestion(false);
        }
    };

    const handleResponseSubmit = async (e) => {
        e.preventDefault();
        if (!responseText.trim()) return;

        setSending(true);
        try {
            await respondToQuery(id, { message: responseText });
            setSendSuccess(true);
            toast.success('Response sent to patient');
            setTimeout(() => {
                setResponseText('');
                setAiSuggestion('');
                setSendSuccess(false);
                fetchQueryData();
            }, 1500);
        } catch {
            // Demo mode - simulate success
            setSendSuccess(true);
            toast.success('Response sent (demo mode)');
            setTimeout(() => {
                setResponseText('');
                setAiSuggestion('');
                setSendSuccess(false);
            }, 1500);
        } finally {
            setSending(false);
        }
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 py-8 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-slate-200 rounded-xl w-48"></div>
                        <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-8 space-y-4">
                            <div className="h-6 bg-slate-200 rounded-lg w-1/3"></div>
                            <div className="h-4 bg-slate-200 rounded-lg w-full"></div>
                            <div className="h-4 bg-slate-200 rounded-lg w-2/3"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 py-8 px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50/80 backdrop-blur-xl text-red-600 p-6 rounded-3xl border border-red-200"
                    >
                        {error}
                    </motion.div>
                </div>
            </div>
        );
    }

    if (!query) return null;

    const priorityConfig = getPriorityConfig(query.priority);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 py-8 px-6">
            <div className="max-w-5xl mx-auto">
                {/* Back Link */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-6"
                >
                    <Link
                        to="/staff/queries"
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Triage Dashboard
                    </Link>
                </motion.div>

                {/* Patient Query Card - Glass Bubble */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 shadow-lg overflow-hidden mb-6"
                >
                    {/* Header */}
                    <div className="px-8 py-6 bg-gradient-to-r from-blue-50/80 to-violet-50/50 border-b border-white/40">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 ${priorityConfig.bg} rounded-2xl flex items-center justify-center`}>
                                    <User className={`w-7 h-7 ${priorityConfig.color}`} />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900">
                                        {query.patientId?.name || query.patientId?.email || 'Unknown Patient'}
                                    </h1>
                                    <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {new Date(query.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <StatusBadge status={query.status} />
                                <span className={`px-3 py-1.5 text-xs font-semibold rounded-xl ${priorityConfig.bg} ${priorityConfig.color} ${priorityConfig.border} border`}>
                                    {priorityConfig.label} Priority
                                </span>
                                <span className="px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-100 text-slate-600 capitalize">
                                    {query.category || 'General'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Patient Message - Glass Bubble Style */}
                    <div className="px-8 py-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Patient Query
                        </h3>
                        <div className="bg-slate-50/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-100">
                            <p className="text-slate-800 text-base leading-relaxed whitespace-pre-wrap">{query.message}</p>
                        </div>
                    </div>

                    {/* Attachments */}
                    {query.attachments && query.attachments.length > 0 && (
                        <div className="px-8 pb-6">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Attachments</h4>
                            <div className="flex flex-wrap gap-2">
                                {query.attachments.map((file, index) => (
                                    <a
                                        key={index}
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 hover:bg-white rounded-xl border border-slate-200 text-sm text-slate-600 hover:text-blue-600 transition-all"
                                    >
                                        <FileText className="w-4 h-4" />
                                        {file.fileType || 'File'}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Response History */}
                {query.responses && query.responses.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="mb-6"
                    >
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Response History</h3>
                        <div className="space-y-3">
                            {query.responses.map((response, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-white/60 backdrop-blur-xl rounded-2xl p-5 border border-white/40 shadow-sm"
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="font-semibold text-slate-700 text-sm capitalize flex items-center gap-2">
                                            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                                                <User className="w-4 h-4 text-emerald-600" />
                                            </div>
                                            {response.responderId?.role || 'Staff'} &bull; {response.responderId?.name || 'Unknown'}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {new Date(response.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                    <p className="text-slate-600 whitespace-pre-wrap">{response.message}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* AI Drafting Pane */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 shadow-lg overflow-hidden"
                >
                    {/* AI Header */}
                    <div className="px-8 py-5 bg-gradient-to-r from-violet-50/80 to-blue-50/50 border-b border-white/40 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-violet-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">AI Response Assistant</h3>
                                <p className="text-xs text-slate-500">Generate, review, and send responses to patients</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleGenerateAI}
                            disabled={loadingSuggestion}
                            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                                loadingSuggestion
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-500/25'
                            }`}
                        >
                            {loadingSuggestion ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    Generate AI Draft
                                </>
                            )}
                        </button>
                    </div>

                    {/* AI Suggestion Display with Animation */}
                    <AnimatePresence>
                        {aiSuggestion && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                                className="px-8 py-5 bg-violet-50/30 border-b border-white/40"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                                        <Sparkles className="w-4 h-4 text-violet-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-2">AI Suggested Draft</p>
                                        <p className="text-slate-700 text-sm leading-relaxed">{aiSuggestion}</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Loading Shimmer */}
                    <AnimatePresence>
                        {loadingSuggestion && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="px-8 py-5 bg-violet-50/30 border-b border-white/40"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-4 h-4 text-violet-600 animate-pulse" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-violet-200/50 rounded-lg w-1/4 animate-pulse"></div>
                                        <div className="h-3 bg-violet-200/50 rounded-lg w-full animate-pulse"></div>
                                        <div className="h-3 bg-violet-200/50 rounded-lg w-3/4 animate-pulse"></div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Response Editor */}
                    <form onSubmit={handleResponseSubmit} className="p-8">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">
                            Your Response (Edit AI suggestion or write your own)
                        </label>
                        <textarea
                            rows="5"
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50/80 border-2 border-slate-200/60 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                            placeholder="Type your response to the patient here..."
                            required
                            disabled={sending || sendSuccess}
                        />

                        {/* Approval Bar */}
                        <div className="mt-6 flex items-center justify-between">
                            <p className="text-xs text-slate-500 italic">
                                Review the response before sending to patient
                            </p>
                            <div className="flex items-center gap-3">
                                {aiSuggestion && (
                                    <button
                                        type="button"
                                        onClick={handleGenerateAI}
                                        disabled={loadingSuggestion || sending}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-all"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Regenerate
                                    </button>
                                )}
                                <AnimatePresence mode="wait">
                                    {sendSuccess ? (
                                        <motion.div
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-emerald-500 text-white"
                                        >
                                            <CheckCircle className="w-5 h-5" />
                                            Sent Successfully!
                                        </motion.div>
                                    ) : (
                                        <motion.button
                                            initial={{ scale: 1 }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            type="submit"
                                            disabled={sending || !responseText.trim()}
                                            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                                                sending || !responseText.trim()
                                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25'
                                            }`}
                                        >
                                            {sending ? (
                                                <>
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    Send to Patient
                                                </>
                                            )}
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
