import React from 'react';

const SensitivityBadge = ({ level }) => {
    const normalizedLevel = level.toLowerCase();

    const styles = {
        low: 'bg-green-500/10 text-green-400 border border-green-500/20',
        medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        high: 'bg-red-500/10 text-red-400 border border-red-500/20',
    };

    const style = styles[normalizedLevel] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${style}`}>
            <span className={`w-2 h-2 rounded-full ${
                normalizedLevel === 'low' ? 'bg-green-400' :
                normalizedLevel === 'medium' ? 'bg-amber-400' :
                normalizedLevel === 'high' ? 'bg-red-400' : 'bg-gray-400'
            }`}></span>
            {level}
        </span>
    );
};

export default SensitivityBadge;
