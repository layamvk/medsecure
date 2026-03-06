import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';

const Orbs = () => (
  <>
    <div className="fixed top-0 left-0 w-1/2 h-1/2 bg-accent-purple/20 rounded-full filter blur-[150px] opacity-40 animate-[spin_20s_linear_infinite] -translate-x-1/4 -translate-y-1/4" />
    <div className="fixed bottom-0 right-0 w-1/2 h-1/2 bg-accent-blue/20 rounded-full filter blur-[150px] opacity-40 animate-[spin_25s_linear_infinite_reverse] translate-x-1/4 translate-y-1/4" />
  </>
);

const Register = () => {
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        role: 'Patient'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    // If already authenticated, redirect to dashboard
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            setIsLoading(false);
            return;
        }

        // Check password complexity
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        if (!passwordRegex.test(formData.password)) {
            setError('Password must contain uppercase, lowercase, number and special character (@$!%*?&)');
            setIsLoading(false);
            return;
        }

        try {
            const response = await api.post('auth/register', {
                email: formData.email,
                username: formData.username,
                password: formData.password,
                role: formData.role.toLowerCase() // Convert to lowercase for backend
            });

            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            // Show detailed error message
            if (err.response?.status === 503) {
                setError('Database not connected. Administrator needs to whitelist IP in MongoDB Atlas.');
            } else {
                const data = err.response?.data;

                // Prefer explicit backend error/message fields
                let errorMessage =
                    data?.error ||
                    data?.message ||
                    data?.errors?.[0]?.msg ||
                    null;

                // Handle validation errors from validateRequest middleware
                if (!errorMessage && Array.isArray(data?.details) && data.details.length > 0) {
                    // details looks like: [{ field: "message" }]
                    const first = data.details[0];
                    const fieldName = Object.keys(first)[0];
                    const fieldMsg = first[fieldName];
                    errorMessage = `${fieldMsg}`;
                }

                // Network / unexpected cases
                if (!errorMessage) {
                    if (!err.response) {
                        errorMessage = 'Network error. Please check your connection and ensure the backend server is running.';
                    } else {
                        errorMessage = 'Registration failed. Please try again.';
                    }
                }

                setError(errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-primary flex items-center justify-center p-4 relative overflow-hidden font-sans">
            <Orbs />
            <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="glass-panel rounded-xl shadow-2xl overflow-hidden">
                    <div className="p-8 md:p-10">
                        <h2 className="text-2xl font-bold text-center text-white mb-2">
                            Create Account
                        </h2>
                        <p className="text-sm text-center text-text-secondary mb-8">
                            Register for MedSecure system access
                        </p>

                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
                                Registration successful! Redirecting to login...
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="e.g. john@example.com"
                                    autoComplete="email"
                                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Choose a username"
                                    autoComplete="username"
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
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Min 8 chars, uppercase, lowercase, number, special char"
                                    autoComplete="new-password"
                                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue transition-all"
                                    required
                                />
                                <p className="text-xs text-text-secondary mt-1">
                                    Must include: A-Z, a-z, 0-9, and @$!%*?&
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Re-enter your password"
                                    autoComplete="new-password"
                                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Role
                                </label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue transition-all"
                                    required
                                >
                                    <option value="Patient" className="bg-primary text-white">Patient</option>
                                    <option value="Doctor" className="bg-primary text-white">Doctor</option>
                                    <option value="Nurse" className="bg-primary text-white">Nurse</option>
                                    <option value="Receptionist" className="bg-primary text-white">Receptionist</option>
                                    <option value="Admin" className="bg-primary text-white">Admin</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || success}
                                className="w-full glass-button font-bold py-3 rounded-lg disabled:opacity-50"
                            >
                                {isLoading ? 'Creating Account...' : 'Register'}
                            </button>

                            <div className="text-center mt-6">
                                <span className="text-text-secondary text-sm">Already have an account? </span>
                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="text-accent-blue hover:text-accent-purple font-medium text-sm transition-colors"
                                >
                                    Sign In
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
