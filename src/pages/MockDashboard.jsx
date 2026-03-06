import React from 'react';
import Card from '../components/Card';
import { Activity, Lock } from 'lucide-react';

const MockDashboard = ({ roleName }) => {
    return (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="border-b border-[var(--color-border)] pb-4 mb-2">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] uppercase">{roleName} Control Center</h1>
                <p className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-widest mt-1">Status: Standby // Access Tier: Secured // Protocol: Z-Trust Alpha</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[1, 2, 3].map(i => (
                    <Card key={i} className="flex flex-col p-6 border-l-2 border-l-[var(--color-border)] opacity-40">
                        <div className="h-2 w-12 bg-[var(--color-border)] mb-4"></div>
                        <div className="h-1 w-full bg-[var(--color-border)]/50 mb-2"></div>
                        <div className="h-1 w-2/3 bg-[var(--color-border)]/50"></div>
                    </Card>
                ))}
            </div>

            <Card className="mt-4 p-12 flex flex-col items-center justify-center border-dashed opacity-50">
                <div className="p-4 bg-[var(--color-primary)] border border-[var(--color-border)] rounded-[2px] mb-4">
                    <Lock className="w-8 h-8 text-[var(--color-text-secondary)]" />
                </div>
                <h2 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest">Interface under construction</h2>
                <p className="text-[9px] font-bold text-[var(--color-text-secondary)] uppercase tracking-[0.2em] mt-2">Module activation scheduled for deployment cycle 12.A</p>

                <div className="mt-8 flex gap-2">
                    <div className="h-1 w-8 bg-[var(--color-accent-cyan)]/20 animate-pulse"></div>
                    <div className="h-1 w-8 bg-[var(--color-accent-cyan)]/20 animate-pulse delay-75"></div>
                    <div className="h-1 w-8 bg-[var(--color-accent-cyan)]/20 animate-pulse delay-150"></div>
                </div>
            </Card>
        </div>
    );
};

export default MockDashboard;
