import React from 'react';
import Card from '../components/Card';
import PrivacyProgress from '../components/PrivacyProgress';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, BarChart3, Clock, AlertTriangle } from 'lucide-react';

const PrivacyBudget = () => {
    const { privacyBudget, user } = useAuth();

    const percentage = Math.min(100, (privacyBudget.current / privacyBudget.max) * 100);
    const isNearLimit = percentage >= 80;

    return (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="border-b border-[var(--color-border)] pb-4 mb-2">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] uppercase">Quota Analysis Matrix</h1>
                <p className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-widest mt-1">Personnel ID: {user?.name?.split(' ')[0] || 'User'} // Monitor active data consumption trends.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Card className="flex flex-col justify-center items-center py-12" glow={isNearLimit}>
                    <div className="relative w-56 h-56 flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                            <circle
                                cx="112" cy="112" r="100"
                                className="stroke-[var(--color-border)]"
                                strokeWidth="8"
                                fill="none"
                            />
                            <circle
                                cx="112" cy="112" r="100"
                                className={`stroke-[var(--color-accent-${isNearLimit ? 'red' : 'cyan'})] transition-all duration-1000 ease-out`}
                                strokeWidth="16"
                                fill="none"
                                strokeDasharray="628"
                                strokeDashoffset={628 - (percentage / 100) * 628}
                                strokeLinecap="butt"
                            />
                        </svg>

                        <div className="text-center absolute">
                            <p className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.2em] mb-1">Total Consumption</p>
                            <span className="text-6xl font-black text-[var(--color-text-primary)] tracking-tighter">{privacyBudget.current}</span>
                            <span className="text-[var(--color-text-secondary)] font-bold text-sm block mt-1 uppercase tracking-wider">/ {privacyBudget.max} Units</span>
                        </div>
                    </div>

                    <div className="mt-12 text-center w-full px-8">
                        {isNearLimit ? (
                            <div className="bg-[var(--color-accent-red)] text-white py-2 px-4 flex items-center justify-center gap-3 rounded-[1px] animate-pulse">
                                <AlertTriangle className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">WARNING: Quota Exhaustion Imminent</span>
                            </div>
                        ) : (
                            <div className="border border-[var(--color-accent-success)] text-[var(--color-accent-success)] py-2 px-4 flex items-center justify-center gap-3 rounded-[1px]">
                                <ShieldAlert className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Status: Nominal Operations</span>
                            </div>
                        )}
                    </div>
                </Card>

                <div className="flex flex-col gap-5">
                    <Card title="Traffic Archetype Breakdown" className="flex-1">
                        <div className="space-y-8 mt-6">
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-wider">Clinical Record Decrypt (1 CP)</span>
                                    <span className="text-xs font-mono font-bold text-[var(--color-text-primary)]">14 Units</span>
                                </div>
                                <div className="h-1 w-full bg-[var(--color-border)]">
                                    <div className="h-full bg-[var(--color-accent-success)]" style={{ width: '30%' }}></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-wider">Restricted Hive Access (15 CP)</span>
                                    <span className="text-xs font-mono font-bold text-[var(--color-text-primary)]">15 Units</span>
                                </div>
                                <div className="h-1 w-full bg-[var(--color-border)]">
                                    <div className="h-full bg-[var(--color-accent-warning)]" style={{ width: '50%' }}></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-wider">Encrypted Data Export (5 CP)</span>
                                    <span className="text-xs font-mono font-bold text-[var(--color-text-primary)]">5 Units</span>
                                </div>
                                <div className="h-1 w-full bg-[var(--color-border)]">
                                    <div className="h-full bg-[var(--color-accent-cyan)]" style={{ width: '20%' }}></div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-[var(--color-primary)] border border-[var(--color-border)] flex items-center justify-center">
                                <Clock className="text-[var(--color-accent-cyan)] w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest">Global Quota Reset Cycle</h3>
                                <p className="text-2xl font-mono font-black text-[var(--color-text-primary)] tracking-tighter mt-1">T-MINUS 14:22:04</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PrivacyBudget;
