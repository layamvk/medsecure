import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const DeviceTrustIndicator = () => {
    const { deviceTrusted } = useAuth();

    return (
        <div className="relative group flex items-center justify-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${deviceTrusted ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {deviceTrusted ? (
                    <ShieldCheck className="w-4 h-4" />
                ) : (
                    <ShieldAlert className="w-4 h-4" />
                )}
                <span>{deviceTrusted ? 'Device Trusted' : 'Untrusted'}</span>
            </div>
        </div>
    );
};

export default DeviceTrustIndicator;
