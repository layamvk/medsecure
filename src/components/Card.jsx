import React from 'react';

const Card = ({ children, title, subtitle, className = '' }) => {
    return (
        <div className={`glass-panel rounded-xl p-6 transition-all duration-300 group ${className}`}>
            {(title || subtitle) && (
                <div className="mb-4 border-b border-white/10 pb-4">
                    {title && <h3 className="text-base font-semibold text-white transition-colors">{title}</h3>}
                    {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
                </div>
            )}
            <div className="prose prose-invert prose-sm max-w-none">
                {children}
            </div>
        </div>
    );
};

export default Card;
