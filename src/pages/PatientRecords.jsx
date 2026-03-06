import React, { useState } from 'react';
import Card from '../components/Card';
import { FileText, Activity, Heart, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SUMMARY = [
  { label: 'Active Medications', value: 5, detail: 'Refills auto-tracked' },
  { label: 'Lab Tests', value: 12, detail: 'Last 6 months' },
  { label: 'Imaging', value: 4, detail: 'Includes MRI/CT' },
  { label: 'Visits', value: 18, detail: 'Past year care' },
];

const LAB_RESULTS = [
  { test: 'Complete Blood Count', date: '2026-02-25', result: 'Normal', provider: 'Dr. Sarah Jenkins' },
  { test: 'Lipid Panel', date: '2026-02-25', result: 'Borderline High Cholesterol', provider: 'Dr. Sarah Jenkins' },
  { test: 'HbA1c', date: '2026-01-20', result: '5.8% (well-controlled)', provider: 'Dr. Michael Chen' },
  { test: 'CMP', date: '2025-12-11', result: 'Normal kidney & liver function', provider: 'Dr. Sarah Jenkins' },
];

const IMAGING = [
  { type: 'Chest X-Ray', date: '2026-02-10', summary: 'No acute cardiopulmonary process', provider: 'Dr. Elisa Walker' },
  { type: 'Abdominal Ultrasound', date: '2025-11-22', summary: 'Stable hepatic steatosis', provider: 'Dr. Elisa Walker' },
  { type: 'Brain MRI', date: '2025-07-14', summary: 'No new lesions', provider: 'Dr. Sarah Jenkins' },
];

const NOTES = [
  { id: 1, date: '2026-02-28', source: 'Dr. Sarah Jenkins', note: 'Continued Lisinopril 10mg daily, monitor blood pressure weekly.' },
  { id: 2, date: '2026-01-15', source: 'Dr. Michael Chen', note: 'Cardiology evaluation noted mild stage 1 hypertension; lifestyle modifications advised.' },
  { id: 3, date: '2025-12-05', source: 'Nurse Maria Rodriguez', note: 'Vaccination record updated for influenza and tetanus boosters.' },
];

const PatientRecords = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLabs = LAB_RESULTS.filter((entry) =>
    entry.test.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.provider.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-end justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)] uppercase tracking-tight">My Health Records</h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mt-1">{user?.name || 'Patient'} // Patient ID: PT-5731</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter labs or provider"
            className="bg-[var(--color-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-4 py-2 rounded-[2px] focus:outline-none focus:border-[var(--color-accent-cyan)] transition-colors text-xs font-mono tracking-tight"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {SUMMARY.map((item) => (
          <Card key={item.label} className="flex flex-col">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">{item.label}</span>
            </div>
            <p className="text-3xl font-black mt-3 text-[var(--color-text-primary)]">{item.value}</p>
            <p className="text-[10px] text-[var(--color-text-secondary)] mt-2">{item.detail}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Lab Results" subtitle="Latest laboratory findings and providers." className="lg:col-span-2">
          <div className="mt-4 border border-[var(--color-border)] rounded-[2px] overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--color-secondary)] border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-wider">Test</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-wider">Result</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-wider">Provider</th>
                </tr>
              </thead>
              <tbody>
                {filteredLabs.map((entry, index) => (
                  <tr key={entry.test + index} className={`border-b border-[var(--color-border)] hover:bg-[var(--color-secondary)] transition-colors ${index % 2 === 0 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-card)]'}`}>
                    <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">{entry.test}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{entry.result}</td>
                    <td className="px-4 py-3 font-mono text-[var(--color-text-primary)]">{entry.date}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{entry.provider}</td>
                  </tr>
                ))}
                {filteredLabs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-[var(--color-text-secondary)] text-xs">
                      No lab entries match your filter. Try another keyword.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Imagery" subtitle="Recent imaging studies." className="h-full">
          <div className="mt-4 space-y-3">
            {IMAGING.map((image) => (
              <div key={image.type} className="p-3 border border-[var(--color-border)] rounded-[2px] hover:bg-[var(--color-secondary)] transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">{image.type}</p>
                </div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{image.summary}</p>
                <p className="text-[10px] text-[var(--color-text-secondary)]">{image.date} · {image.provider}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Clinical Notes" subtitle="Recent documentation and care plan updates." className="flex-1">
        <div className="mt-4 space-y-3">
          {NOTES.map((entry) => (
            <div key={entry.id} className="p-4 border border-[var(--color-border)] rounded-[2px] hover:bg-[var(--color-secondary)] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[var(--color-accent-warning)]" />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">{entry.date}</p>
                </div>
                <span className="text-[9px] font-bold text-[var(--color-accent-success)]">{entry.source}</span>
              </div>
              <p className="text-sm text-[var(--color-text-primary)]">{entry.note}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default PatientRecords;
