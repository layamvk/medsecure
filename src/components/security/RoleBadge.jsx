import React from 'react';

const RoleBadge = ({ role }) => {
    const getBadgeStyle = () => {
        switch (role) {
            case 'Admin':
                return 'bg-[var(--color-accent-cyan)] text-[#0B1220]';
            case 'Doctor':
                return 'bg-[var(--color-accent-success)] text-white';
            case 'Nurse':
                return 'bg-[var(--color-accent-warning)] text-white';
            case 'Receptionist':
                return 'bg-purple-600 text-white';
            case 'Patient':
                return 'bg-blue-600 text-white';
            default:
                return 'bg-[var(--color-border)] text-[var(--color-text-secondary)]';
        }
    };

    return (
        <div className="relative group inline-block">
            <span className={`text-[9px] uppercase tracking-[0.1em] font-black px-1.5 py-0.5 rounded-[2px] leading-none transition-all ${getBadgeStyle()}`}>
                {role}
            </span>
            {/* Tooltip */}
            <div className="absolute top-full right-0 mt-2 bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-[2px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border-l-2 border-l-[var(--color-accent-cyan)]">
                Secure Access Enforced
            </div>
        </div>
    );
};

export default RoleBadge;
