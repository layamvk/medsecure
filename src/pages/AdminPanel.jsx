import React from 'react';
import Card from '../components/Card';
import AuditTable from '../components/AuditTable';
import { ShieldCheck, AlertTriangle, Users, Database } from 'lucide-react';

const MOCK_AUDIT_LOGS = [
    { id: 1, timestamp: '2023-11-04 14:32:01', user: 'Dr. Sarah Jenkins', role: 'Doctor', patient: 'Marcus Sterling', sensitivity: 'High', privacyCost: 15, status: 'Allowed' },
    { id: 2, timestamp: '2023-11-04 14:30:45', user: 'Nurse Mark', role: 'Nurse', patient: 'Marcus Sterling', sensitivity: 'High', privacyCost: 25, status: 'Denied' },
    { id: 3, timestamp: '2023-11-04 13:15:22', user: 'Dr. Sarah Jenkins', role: 'Doctor', patient: 'Elena Rostova', sensitivity: 'Medium', privacyCost: 5, status: 'Allowed' },
    { id: 4, timestamp: '2023-11-04 11:22:10', user: 'Admin User', role: 'Admin', patient: 'System Backup', sensitivity: 'Low', privacyCost: 0, status: 'Allowed' },
    { id: 5, timestamp: '2023-11-04 09:14:05', user: 'Dr. Robert Smith', role: 'Doctor', patient: 'Sarah Connor', sensitivity: 'High', privacyCost: 15, status: 'Allowed' },
];

const AdminPanel = () => {
    return (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="border-b border-[var(--color-border)] pb-4 mb-2">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] uppercase">System Intelligence Matrix</h1>
                <p className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-widest mt-1">Global Security Protocol 8.4 // Monitoring Node: MSC-ADMIN-01</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <Card className="flex flex-col p-6 border-l-4 border-l-[var(--color-accent-cyan)]">
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.2em] mb-3">Total Personnel</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-[var(--color-text-primary)] tracking-tighter">1,024</span>
                        <span className="text-[10px] text-[var(--color-accent-success)] font-bold">ACTIVE</span>
                    </div>
                </Card>

                <Card className="flex flex-col p-6 border-l-4 border-l-[var(--color-accent-red)]" glow={true}>
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.2em] mb-3">Escalated Access / 24H</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-[var(--color-text-primary)] tracking-tighter">42</span>
                        <div className="w-1.5 h-1.5 bg-[var(--color-accent-red)] animate-pulse"></div>
                    </div>
                </Card>

                <Card className="flex flex-col p-6 border-l-4 border-l-[var(--color-accent-warning)]">
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.2em] mb-3">Restricted Records</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-[var(--color-text-primary)] tracking-tighter">85</span>
                        <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">[CAT-A]</span>
                    </div>
                </Card>

                <Card className="flex flex-col p-6 border-l-4 border-l-[var(--color-accent-success)]">
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.2em] mb-3">Policy Over-Util</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-[var(--color-text-primary)] tracking-tighter">12</span>
                        <span className="text-[10px] text-[var(--color-text-secondary)] italic">WARNING</span>
                    </div>
                </Card>
            </div>

            <div className="mt-4">
                <div className="flex items-center justify-between mb-4 border-b border-[var(--color-border)] pb-2">
                    <h2 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest">Master Audit Chain</h2>
                    <span className="text-[9px] font-mono text-[var(--color-text-secondary)] uppercase">Streaming Real-Time Logs...</span>
                </div>
                <Card className="p-0 overflow-hidden border-[var(--color-border)] rounded-[1px]">
                    <AuditTable logs={MOCK_AUDIT_LOGS} />
                </Card>
            </div>
        </div>
    );
};

export default AdminPanel;
