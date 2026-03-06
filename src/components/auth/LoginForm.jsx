import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const { dashboardPath } = await login(email, password);
            navigate(dashboardPath);
        } catch (err) {
            let message = 'An unexpected error occurred. Please try again.';

            // Axios error with HTTP response
            if (err && err.response && err.response.data) {
                if (err.response.data.error) {
                    message = err.response.data.error;
                } else if (typeof err.response.data.message === 'string') {
                    message = err.response.data.message;
                }
            }
            // Errors passed through axios interceptor as plain objects
            else if (err && typeof err === 'object' && (err.error || err.message)) {
                message = err.error || err.message;
            }
            // Pure network / CORS / server unreachable case
            else if (!err || !err.response) {
                message = 'Network error. Please check your connection and ensure the backend server is running.';
            }

            // Fallback to generic invalid credentials text if nothing better is available
            if (!message) {
                message = 'Invalid email or password. Please try again.';
            }

            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="glass-panel rounded-xl shadow-2xl overflow-hidden">
            <div className="p-8 md:p-10">
                <h2 className="text-2xl font-bold text-center text-white mb-2">
                    System Authentication
                </h2>
                <p className="text-sm text-center text-text-secondary mb-8">
                    Access to MedSecure is restricted to authorized personnel only.
                </p>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. doctor@gmail.com"
                            autoComplete="email"
                            className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue transition-all"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue transition-all"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full glass-button font-bold py-3 rounded-lg disabled:opacity-50"
                    >
                        {isLoading ? 'Authenticating…' : 'Sign In'}
                    </button>

                    <div className="text-center mt-6">
                        <span className="text-text-secondary text-sm">Don't have an account? </span>
                        <button
                            type="button"
                            onClick={() => navigate('/register')}
                            className="text-accent-blue hover:text-accent-purple font-medium text-sm transition-colors"
                        >
                            Create Account
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;

