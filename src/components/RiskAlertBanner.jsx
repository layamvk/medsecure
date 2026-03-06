import React from 'react';
import { AlertTriangle } from 'lucide-react';

const RiskAlertBanner = ({ show, message }) => {
    if (!show) return null;

    return (
        <div className="bg-red-900/30 border border-red-500/50 p-4 mb-6 rounded-lg flex items-start gap-4">
            <AlertTriangle className="text-red-400 w-6 h-6 shrink-0 mt-0.5" />
            <div className="flex flex-col">
                <h3 className="text-lg font-bold text-white">Security Alert</h3>
                <p className="text-red-200 text-sm font-medium leading-relaxed mt-1">{message}</p>
            </div>
        </div>
    );
};

export default RiskAlertBanner;
