import React from 'react';
import Card from '../components/Card';
import { Activity, AlertTriangle, TrendingUp, Eye } from 'lucide-react';

const ALERTS = [
  { id: 1, severity: 'Critical', user: 'Nurse Mark Reyes', event: 'Repeated denied access to ICU-4 records (×5 / 10 min)', time: '09:02', resolved: false },
  { id: 2, severity: 'High', user: 'Dr. Angela Yuen', event: 'Account suspended but login attempt detected', time: '08:44', resolved: false },
  { id: 3, severity: 'Medium', user: 'Dr. Robert Smith', event: 'MFA bypass request outside session hours', time: '08:15', resolved: true },
  { id: 4, severity: 'Low', user: 'Jane Miller', event: 'Unusual export volume from reception terminal', time: '07:50', resolved: true },
];

const SEVERITY_COLORS = {
  Critical: { badge: 'bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)] border-[var(--color-accent-red)]', dot: 'bg-[var(--color-accent-red)] animate-pulse' },
  High: { badge: 'bg-[var(--color-accent-warning)]/10 text-[var(--color-accent-warning)] border-[var(--color-accent-warning)]', dot: 'bg-[var(--color-accent-warning)]' },
  Medium: { badge: 'bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border-[var(--color-accent-cyan)]', dot: 'bg-[var(--color-accent-cyan)]' },
  Low: { badge: 'bg-[var(--color-border)]/10 text-[var(--color-text-secondary)] border-[var(--color-border)]', dot: 'bg-[var(--color-text-secondary)]' },
};

const RISK_SCORES = [
  { department: 'ICU', score: 87, trend: '+12%' },
  { department: 'Cardiology', score: 54, trend: '+2%' },
  { department: 'Oncology', score: 72, trend: '+19%' },
  { department: 'Front Desk', score: 31, trend: '-4%' },
];

const AdminRisk = () => (
  <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="flex items-end justify-between border-b border-[var(--color-border)] pb-4">
      <div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)] uppercase tracking-tight">Risk Monitor</h1>
        <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-wider mt-1">Live anomaly detection and departmental exposure heatmap.</p>
      </div>
      <Activity className="w-5 h-5 text-[var(--color-accent-red)]" />
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: 'Open Alerts', value: ALERTS.filter(a => !a.resolved).length },
        { label: 'Critical', value: ALERTS.filter(a => a.severity === 'Critical').length },
        { label: 'Resolved / 24H', value: ALERTS.filter(a => a.resolved).length },
        { label: 'Avg Risk Score', value: Math.round(RISK_SCORES.reduce((s, r) => s + r.score, 0) / RISK_SCORES.length) },
      ].map((s) => (
        <Card key={s.label} className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">{s.label}</span>
          <p className="text-3xl font-black text-[var(--color-text-primary)] mt-3">{s.value}</p>
        </Card>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card title="Active Alerts" subtitle="Unresolved anomaly events requiring review.">
        <div className="mt-4 space-y-3">
          {ALERTS.map((alert) => {
            const colors = SEVERITY_COLORS[alert.severity];
            return (
              <div key={alert.id} className={`p-3 border rounded-[2px] border-[var(--color-border)] ${alert.resolved ? 'opacity-40' : 'hover:bg-[var(--color-secondary)] transition-colors'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-1.5 h-1.5 rounded-none ${colors.dot}`} />
                  <span className={`px-1.5 py-0.5 border text-[9px] font-black uppercase tracking-[0.2em] rounded-[1px] ${colors.badge}`}>{alert.severity}</span>
                  <span className="text-[9px] font-mono text-[var(--color-text-secondary)] ml-auto">{alert.time}</span>
                </div>
                <p className="text-[10px] font-semibold text-[var(--color-text-primary)] mt-1">{alert.user}</p>
                <p className="text-[10px] text-[var(--color-text-secondary)]">{alert.event}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Departmental Risk Scores" subtitle="Composite exposure index per dept (0–100).">
        <div className="mt-4 space-y-4">
          {RISK_SCORES.map((dept) => (
            <div key={dept.department}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-primary)]">{dept.department}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-[var(--color-text-secondary)]">{dept.trend}</span>
                  <span className={`text-[10px] font-black ${dept.score >= 75 ? 'text-[var(--color-accent-red)]' : dept.score >= 55 ? 'text-[var(--color-accent-warning)]' : 'text-[var(--color-accent-success)]'}`}>{dept.score}</span>
                </div>
              </div>
              <div className="h-1.5 bg-[var(--color-border)] rounded-none">
                <div
                  className={`h-full rounded-none transition-all ${dept.score >= 75 ? 'bg-[var(--color-accent-red)]' : dept.score >= 55 ? 'bg-[var(--color-accent-warning)]' : 'bg-[var(--color-accent-success)]'}`}
                  style={{ width: `${dept.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  </div>
);

export default AdminRisk;
