import React, { useState } from 'react';
import { Shield, X } from 'lucide-react';

const StepUpModal = ({ isOpen, onClose, onVerify, title = "Verification Required", description = "Accessing this data requires re-authentication." }) => {
    const [code, setCode] = useState('');
    const [isError, setIsError] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (code !== '123456') {
            setIsError(true);
            setTimeout(() => setIsError(false), 500);
        }
        onVerify(code);
        if (code === '123456') {
            setCode('');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className={`relative glass-panel rounded-xl w-full max-w-md p-8 shadow-2xl transition-all ${isError ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-text-secondary hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className={`p-3 bg-white/10 rounded-full mb-4 transition-colors ${isError ? 'text-red-400' : 'text-accent-blue'}`}>
                        <Shield className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                        {title}
                    </h2>
                    <p className="text-sm text-text-secondary mt-2 max-w-sm mx-auto">
                        {description}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2 text-center">Enter 6-Digit Code</label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className={`w-full bg-white/5 border ${isError ? 'border-red-500/50' : 'border-white/10'} text-white text-center text-3xl tracking-[0.3em] px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${isError ? 'focus:ring-red-500' : 'focus:ring-accent-blue'} transition-all`}
                            required
                            maxLength="6"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full glass-button font-bold py-3 rounded-lg"
                    >
                        Verify & Proceed
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StepUpModal;
