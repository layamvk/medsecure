import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldPlus, Mail, Lock, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(email, password);
            navigate(result.dashboardPath || '/dashboard');
        } catch (err) {
            let msg;
            if (err.response?.status === 429) {
                msg = 'Too many login attempts. Please wait a few minutes and try again.';
            } else if (err.code === 'ERR_NETWORK' || !err.response) {
                msg = 'Cannot reach the server. Please ensure the backend is running on port 3001.';
            } else {
                msg = err.response?.data?.error || err.message || 'Login failed. Please check your credentials.';
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Demo credentials for testing
    const demoAccounts = [
        { role: 'Admin', email: 'admin@medsecure.com', password: 'Admin123!' },
        { role: 'Doctor', email: 'doctor@medsecure.com', password: 'Doctor123!' },
        { role: 'Nurse', email: 'nurse@medsecure.com', password: 'Nurse123!' },
        { role: 'Patient', email: 'patient@medsecure.com', password: 'Patient123!' },
    ];

    const fillDemo = (account) => {
        setEmail(account.email);
        setPassword(account.password);
        setError('');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"></div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="w-16 h-16 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/25 mb-4"
                    >
                        <ShieldPlus className="w-9 h-9 text-white" />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">MedSecure</h1>
                    <p className="text-blue-300/80 mt-1 flex items-center justify-center gap-2 text-sm">
                        <Sparkles className="w-4 h-4" />
                        AI-Powered Healthcare Platform
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8">
                    <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
                    <p className="text-blue-200/60 text-sm mb-6">Sign in to continue to your dashboard</p>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm mb-4"
                        >
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="text-xs font-bold text-blue-200/60 uppercase tracking-wider mb-2 block">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300/40" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    placeholder="doctor@medsecure.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-blue-200/60 uppercase tracking-wider mb-2 block">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300/40" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300/40 hover:text-blue-300/80 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                                loading
                                    ? 'bg-blue-600/50 text-blue-200 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25'
                            }`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </motion.button>
                    </form>
                </div>

                {/* Demo Credentials */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-5"
                >
                    <p className="text-xs font-bold text-blue-200/50 uppercase tracking-wider mb-3">Demo Accounts</p>
                    <div className="grid grid-cols-2 gap-2">
                        {demoAccounts.map((acct) => (
                            <button
                                key={acct.role}
                                onClick={() => fillDemo(acct)}
                                className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-blue-200/80 hover:text-white transition-all text-left"
                            >
                                <span className="font-medium">{acct.role}</span>
                                <span className="block text-xs text-blue-300/40 mt-0.5">{acct.email}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
