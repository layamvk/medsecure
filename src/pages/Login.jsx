import React from 'react';
import { Navigate } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../context/AuthContext';

const Orbs = () => (
  <>
    <div className="fixed top-0 left-0 w-1/2 h-1/2 bg-accent-purple/20 rounded-full filter blur-[150px] opacity-40 animate-[spin_20s_linear_infinite] -translate-x-1/4 -translate-y-1/4" />
    <div className="fixed bottom-0 right-0 w-1/2 h-1/2 bg-accent-blue/20 rounded-full filter blur-[150px] opacity-40 animate-[spin_25s_linear_infinite_reverse] translate-x-1/4 translate-y-1/4" />
  </>
);

const Login = () => {
    const { isAuthenticated, getDashboardPath } = useAuth();

    // If already authenticated, bounce to dashboard
    if (isAuthenticated) {
        return <Navigate to={getDashboardPath()} replace />;
    }

    return (
        <div className="min-h-screen bg-primary flex items-center justify-center p-4 relative overflow-hidden font-sans">
            <Orbs />
            <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <LoginForm />
            </div>
        </div>
    );
};

export default Login;
