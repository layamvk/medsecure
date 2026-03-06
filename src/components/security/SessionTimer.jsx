import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock } from 'lucide-react';

const SessionTimer = () => {
    const { sessionTime, setSessionTime } = useAuth();

    // Simple countdown effect
    useEffect(() => {
        if (sessionTime <= 0) return;
        const interval = setInterval(() => {
            setSessionTime((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [sessionTime, setSessionTime]);

    const minutes = Math.floor(sessionTime / 60);
    const seconds = sessionTime % 60;
    const isExpiringSoon = sessionTime < 300; // less than 5 minutes

    if (sessionTime <= 0) {
        return null; // Should handle logout in real app
    }

    return (
        <div className="relative group flex items-center gap-3 px-3 py-1.5 rounded-[1px] border border-[var(--color-border)] bg-[var(--color-primary)] hover:border-[var(--color-accent-cyan)]/50 transition-all cursor-default group overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isExpiringSoon ? 'bg-[var(--color-accent-red)] animate-pulse' : 'bg-[var(--color-accent-cyan)]/20'}`}></div>
            <Clock className={`w-3.5 h-3.5 ${isExpiringSoon ? 'text-[var(--color-accent-red)] animate-pulse' : 'text-[var(--color-text-secondary)]'}`} />
            <span className={`text-xs font-mono font-black tracking-widest ${isExpiringSoon ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-text-secondary)] group-hover:text-white'}`}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>

            {/* Tooltip */}
            {isExpiringSoon && (
                <div className="absolute top-full right-0 mt-3 bg-[var(--color-card)] border border-[var(--color-accent-red)] text-white text-[9px] px-3 py-2 rounded-[1px] opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 shadow-2xl font-black uppercase tracking-widest">
                    CRITICAL: AUTHENTICATION EXPIRING
                </div>
            )}
        </div>
    );
};

export default SessionTimer;
