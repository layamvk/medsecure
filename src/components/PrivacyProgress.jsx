import React from 'react';

const PrivacyProgress = ({ budget }) => {
    const { current, max } = budget;
    const percentage = Math.min(100, Math.max(0, (current / max) * 100));

    let colorClass = "bg-green-500";
    if (percentage >= 70 && percentage < 90) colorClass = "bg-amber-500";
    if (percentage >= 90) colorClass = "bg-red-500";

    return (
        <div className="flex flex-col gap-1.5 w-full group relative">
            <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-text-secondary">Privacy Budget</span>
                <span className="text-xs font-mono text-text-secondary">{current}/{max}</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colorClass} transition-all duration-500 ease-out rounded-full`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

export default PrivacyProgress;
