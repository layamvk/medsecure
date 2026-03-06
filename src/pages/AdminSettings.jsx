import React, { useState } from 'react';
import Card from '../components/Card';
import { Settings, Save } from 'lucide-react';

const Section = ({ title, children }) => (
  <Card>
    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-text-secondary)] border-b border-[var(--color-border)] pb-2 mb-4">{title}</h2>
    {children}
  </Card>
);

const Toggle = ({ label, desc, value, onChange }) => (
  <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
    <div>
      <p className="text-xs font-semibold text-[var(--color-text-primary)]">{label}</p>
      {desc && <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">{desc}</p>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`w-9 h-5 rounded-none relative transition-colors border ${value ? 'bg-[var(--color-accent-cyan)] border-[var(--color-accent-cyan)]' : 'bg-transparent border-[var(--color-border)]'}`}
    >
      <span className={`absolute top-0.5 w-3.5 h-3.5 transition-all ${value ? 'left-4 bg-black' : 'left-0.5 bg-[var(--color-text-secondary)]'}`} />
    </button>
  </div>
);

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    mfaRequired: true,
    auditAll: true,
    dpEnabled: true,
    riskAlerts: true,
    sessionTimeout: '30',
    budgetDefault: '100',
    dataRetention: '365',
    emailNotifs: false,
  });

  const set = (key) => (val) => setSettings((s) => ({ ...s, [key]: val }));

  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-end justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)] uppercase tracking-tight">System Settings</h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-wider mt-1">Global policy, security thresholds, and privacy parameters.</p>
        </div>
        <Settings className="w-5 h-5 text-[var(--color-text-secondary)]" />
      </div>

      <Section title="Security Policy">
        <Toggle label="Require MFA for all roles" desc="Forces TOTP / OTP enrollment before login." value={settings.mfaRequired} onChange={set('mfaRequired')} />
        <Toggle label="Full audit logging" desc="Log every record access regardless of sensitivity." value={settings.auditAll} onChange={set('auditAll')} />
        <Toggle label="Risk-based alerts" desc="Send notifications on anomaly detection events." value={settings.riskAlerts} onChange={set('riskAlerts')} />
        <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-primary)]">Session timeout (minutes)</p>
            <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">Auto-logout idle sessions.</p>
          </div>
          <input
            type="number"
            min={5}
            max={480}
            value={settings.sessionTimeout}
            onChange={(e) => set('sessionTimeout')(e.target.value)}
            className="w-20 bg-[var(--color-primary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] px-2 py-1 outline-none text-right rounded-[2px]"
          />
        </div>
      </Section>

      <Section title="Differential Privacy">
        <Toggle label="Enable differential privacy" desc="Apply ε-noise to aggregate query results." value={settings.dpEnabled} onChange={set('dpEnabled')} />
        <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-primary)]">Default privacy budget (ε)</p>
            <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">Applied to each new user on provisioning.</p>
          </div>
          <input
            type="number"
            min={10}
            max={1000}
            value={settings.budgetDefault}
            onChange={(e) => set('budgetDefault')(e.target.value)}
            className="w-20 bg-[var(--color-primary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] px-2 py-1 outline-none text-right rounded-[2px]"
          />
        </div>
      </Section>

      <Section title="Data Retention">
        <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-primary)]">Audit log retention (days)</p>
            <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">Logs older than this are archived automatically.</p>
          </div>
          <input
            type="number"
            min={30}
            max={3650}
            value={settings.dataRetention}
            onChange={(e) => set('dataRetention')(e.target.value)}
            className="w-20 bg-[var(--color-primary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] px-2 py-1 outline-none text-right rounded-[2px]"
          />
        </div>
        <Toggle label="Email notifications" desc="Send periodic compliance digests to admin inbox." value={settings.emailNotifs} onChange={set('emailNotifs')} />
      </Section>

      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent-cyan)] text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-[2px] hover:opacity-90 transition-opacity">
          <Save className="w-3.5 h-3.5" />
          Save Configuration
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;
