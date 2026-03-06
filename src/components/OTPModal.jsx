import React, { useState } from 'react';
import { Shield, X } from 'lucide-react';

const OTPModal = ({ isOpen, onClose, onVerify, title = "Verification Required" }) => {
    const [code, setCode] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onVerify(code);
        setCode('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="relative glass-panel rounded-xl w-full max-w-md p-8 shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-text-secondary hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-white/10 rounded-full mb-4 text-accent-blue">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                    <p className="text-sm text-text-secondary mt-2 max-w-sm mx-auto">
                        Enter the 6-digit code from your authenticator app to proceed.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2 text-center">One-Time Code</label>
                        <input
                            type="text"
                            autoFocus
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="000000"
                            className="w-full bg-white/5 border border-white/10 text-white text-center text-3xl tracking-[0.3em] px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full glass-button font-bold py-3 rounded-lg"
                    >
                        Verify
                    </button>
                </form>
            </div>
        </div>
    );
};

export default OTPModal;
