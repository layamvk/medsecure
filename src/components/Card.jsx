import React from 'react';

const Card = ({ children, title, subtitle, className = '', glow = false }) => {
    return (
        <div className={`bg-white/80 backdrop-blur-xl rounded-2xl border shadow-sm p-6 transition-all duration-300 ${
            glow ? 'border-red-300/60 shadow-red-100 ring-1 ring-red-400/30' : 'border-slate-200/60'
        } ${className}`}>
            {(title || subtitle) && (
                <div className="mb-4 border-b border-slate-200/60 pb-4">
                    {title && <h3 className="text-base font-semibold text-slate-800">{title}</h3>}
                    {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
                </div>
            )}
            <div>
                {children}
            </div>
        </div>
    );
};

export default Card;
