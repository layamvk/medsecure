import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle } from 'lucide-react';

const PrivacyBudgetBar = () => {
    const { privacyBudget, role } = useAuth();

    // Only show for roles that consume privacy budget
    if (!['Doctor', 'Nurse'].includes(role)) return null;

    const percentage = (privacyBudget.current / privacyBudget.max) * 100;

    let colorClass = "bg-green-500";
    if (percentage >= 70 && percentage < 90) colorClass = "bg-amber-500";
    if (percentage >= 90) colorClass = "bg-red-500";

    return (
        <div className="w-full bg-black/20 relative z-20 flex flex-col border-b border-white/10">
            {/* Thin Progress Bar */}
            <div className="h-1.5 w-full bg-white/5">
                <div
                    className={`h-full ${colorClass} transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                />
            </div>

            {/* Warning Banner if >90% */}
            {percentage >= 90 && (
                <div className="bg-red-800/50 text-white px-4 py-1 text-xs font-semibold flex items-center justify-center gap-3 animate-pulse">
                    <AlertCircle className="w-4 h-4" />
                    <span>CRITICAL PRIVACY BUDGET: Non-essential data access will be restricted.</span>
                </div>
            )}
        </div>
    );
};

export default PrivacyBudgetBar;
