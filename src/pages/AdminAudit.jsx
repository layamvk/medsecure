import React from 'react';
import Card from '../components/Card';
import AuditTable from '../components/AuditTable';
import { FileText } from 'lucide-react';

const MOCK_AUDIT_LOGS = [
  { id: 1, timestamp: '2026-03-02 09:14:22', user: 'Dr. Sarah Jenkins', role: 'Doctor', patient: 'Marcus Sterling', sensitivity: 'High', privacyCost: 15, status: 'Allowed' },
  { id: 2, timestamp: '2026-03-02 09:01:55', user: 'Nurse Mark Reyes', role: 'Nurse', patient: 'Marcus Sterling', sensitivity: 'High', privacyCost: 25, status: 'Denied' },
  { id: 3, timestamp: '2026-03-02 08:47:30', user: 'Dr. Robert Smith', role: 'Doctor', patient: 'Sarah Connor', sensitivity: 'High', privacyCost: 15, status: 'Allowed' },
  { id: 4, timestamp: '2026-03-02 08:32:10', user: 'Admin User', role: 'Admin', patient: 'System Backup', sensitivity: 'Low', privacyCost: 0, status: 'Allowed' },
  { id: 5, timestamp: '2026-03-02 08:15:05', user: 'Dr. Angela Yuen', role: 'Doctor', patient: 'Elena Rostova', sensitivity: 'Medium', privacyCost: 5, status: 'Allowed' },
  { id: 6, timestamp: '2026-03-01 17:55:00', user: 'Dr. Robert Smith', role: 'Doctor', patient: 'James Wilson', sensitivity: 'Low', privacyCost: 2, status: 'Allowed' },
];

const STATS = [
  { label: 'Total Events / 24H', value: 312 },
  { label: 'Denied Requests', value: 18 },
  { label: 'High Sensitivity', value: 47 },
  { label: 'Anomaly Flags', value: 3 },
];

const AdminAudit = () => (
  <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="flex items-end justify-between border-b border-[var(--color-border)] pb-4">
      <div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)] uppercase tracking-tight">Audit Logs</h1>
        <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-wider mt-1">Full immutable event chain — all access, all roles.</p>
      </div>
      <FileText className="w-5 h-5 text-[var(--color-text-secondary)]" />
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {STATS.map((s) => (
        <Card key={s.label} className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">{s.label}</span>
          <p className="text-3xl font-black text-[var(--color-text-primary)] mt-3">{s.value}</p>
        </Card>
      ))}
    </div>

    <Card title="Event Log" subtitle="Streaming most-recent access events." className="p-0 overflow-hidden">
      <div className="mt-4">
        <AuditTable logs={MOCK_AUDIT_LOGS} />
      </div>
    </Card>
  </div>
);

export default AdminAudit;
