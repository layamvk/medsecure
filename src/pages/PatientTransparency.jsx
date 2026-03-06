import React, { useState } from 'react';
import Card from '../components/Card';
import { ShieldAlert, FileText, Clock, Users, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MOCK_TRANSPARENCY_FEED = [
  { id: 1, date: '2026-03-02 13:45', actor: 'Dr. Sarah Jenkins', action: 'Viewed complete record', resource: 'Medical History + Labs', method: 'Portal', status: 'Authorized' },
  { id: 2, date: '2026-03-01 22:10', actor: 'Nurse Maria Rodriguez', action: 'Updated vitals', resource: 'Vitals Flow Sheet', method: 'Clinical Console', status: 'Authorized' },
  { id: 3, date: '2026-03-01 18:25', actor: 'Admin System', action: 'Triggered audit export', resource: 'Audit logs archive', method: 'System Job', status: 'Completed' },
  { id: 4, date: '2026-03-01 14:50', actor: 'Receptionist Lisa Chen', action: 'Viewed appointment history', resource: 'Appointments', method: 'Scheduling', status: 'Authorized' },
  { id: 5, date: '2026-03-01 08:20', actor: 'Dr. Michael Chen', action: 'Prescribed medication', resource: 'Medication Orders', method: 'Doctor Console', status: 'Authorized' },
];

const MOCK_NOTIFICATIONS = [
  'You have 2 unread transparency notes from Dr. Jenkins.',
  'Your PHI access log was exported on 2026-03-01 18:30 for internal review.',
  'A new privacy budget allocation review is scheduled for 2026-03-10.',
];

const PatientTransparency = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFeed = MOCK_TRANSPARENCY_FEED.filter((item) =>
    item.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.resource.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-end justify-between mb-4 border-b border-[var(--color-border)] pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] uppercase">Access Transparency</h1>
          <p className="text-[var(--color-text-secondary)] text-xs font-bold uppercase tracking-wider mt-1">Viewing history for {user?.name || 'Patient'} / Protected Health Data</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase">Search:</span>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Find by actor, action, or resource"
            className="bg-[var(--color-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-4 py-2 rounded-[2px] focus:outline-none focus:border-[var(--color-accent-cyan)] transition-colors text-xs font-mono tracking-tight w-72"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="flex flex-col">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-4 h-4 text-[var(--color-accent-cyan)]" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Latest Notes</h3>
          </div>
          <p className="text-[var(--color-text-primary)] text-sm font-medium mt-3">Transparency timeline updated every time someone accesses or modifies your protected data.</p>
          <ul className="mt-4 space-y-2 text-[10px] text-[var(--color-text-secondary)]">
            {MOCK_NOTIFICATIONS.map((note, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent-cyan)] mt-1"></span>
                {note}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Alert Summary</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 border border-[var(--color-border)] rounded-[2px]">
              <p className="text-[var(--color-text-secondary)] text-[8px] uppercase tracking-[0.3em]">Daily Views</p>
              <p className="text-3xl font-black text-[var(--color-text-primary)]">5</p>
              <p className="text-[10px] text-[var(--color-text-secondary)]">In the past 24h</p>
            </div>
            <div className="p-3 border border-[var(--color-border)] rounded-[2px]">
              <p className="text-[var(--color-text-secondary)] text-[8px] uppercase tracking-[0.3em]">High Risk</p>
              <p className="text-3xl font-black text-[var(--color-accent-red)]">1</p>
              <p className="text-[10px] text-[var(--color-text-secondary)]">Flagged interactions</p>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Data Coverage</h3>
          <div className="mt-4 space-y-3">
            <p className="text-[8px] uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Authorized actors</p>
            <p className="text-lg font-black text-[var(--color-text-primary)]">12</p>
            <p className="text-[10px] text-[var(--color-text-secondary)]">Includes clinicians, admin staff, and system services.</p>
            <div className="pt-3 border-t border-[var(--color-border)]">
              <p className="text-[8px] uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Data types</p>
              <p className="text-lg font-black text-[var(--color-text-primary)]">Medical, Labs, Imaging</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Access Feed" subtitle="Detailed log of who interacted with your records and why." className="flex-1">
        <div className="mt-4 border border-[var(--color-border)] rounded-[2px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[var(--color-secondary)] border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-wider">Actor</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-wider">Resource</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeed.map((item, index) => (
                  <tr key={item.id} className={`border-b border-[var(--color-border)] hover:bg-[var(--color-secondary)] transition-colors ${index % 2 === 0 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-card)]'}`}>
                    <td className="px-4 py-4 font-mono text-[var(--color-text-primary)] text-xs">{item.date}</td>
                    <td className="px-4 py-4 font-semibold text-[var(--color-text-primary)]">{item.actor}</td>
                    <td className="px-4 py-4 text-[var(--color-text-secondary)] text-[10px]">{item.action}</td>
                    <td className="px-4 py-4 text-[var(--color-text-secondary)] text-[10px]">{item.resource}</td>
                    <td className="px-4 py-4">
                      <span className={`text-[9px] font-black px-2 py-1 border rounded-[1px] ${item.status === 'Authorized' ? 'border-[var(--color-accent-success)] text-[var(--color-accent-success)]' : 'border-[var(--color-accent-warning)] text-[var(--color-accent-warning)]'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredFeed.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-text-secondary)] text-xs">
                      No transparency events match your search. Try another keyword.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PatientTransparency;
