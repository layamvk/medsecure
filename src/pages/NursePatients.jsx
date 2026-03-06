
import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { useNavigate } from 'react-router-dom';
import { Activity, Heart } from 'lucide-react';
import api from '../api/axiosConfig';

const NursePatients = () => {
  const navigate = useNavigate();
  const [nursePatients, setNursePatients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [gridStats, setGridStats] = useState([]);

  useEffect(() => {
    api.get('patients/nurse').then(res => setNursePatients(res.data || []));
    api.get('tasks/nurse').then(res => setTasks(res.data || []));
    api.get('patients/nurse/stats').then(res => setGridStats(res.data || []));
  }, []);

  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-end justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)] uppercase tracking-tight">Active Patient List</h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-wider mt-1">Ward assignments, priorities, and care plans.</p>
        </div>
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
          <Heart className="w-4 h-4" />
          {gridStats.reduce((sum, stat) => sum + stat.value, 0)} patients monitored
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {gridStats.map((stat) => (
          <Card key={stat.label} className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">{stat.label}</span>
            <p className="text-3xl font-black text-[var(--color-text-primary)] mt-3">{stat.value}</p>
            <p className="text-[10px] text-[var(--color-text-secondary)] mt-2">{stat.desc}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Patient Roster" subtitle="Tap/toggle to view care notes." className="h-full">
          <div className="mt-4 border border-[var(--color-border)] rounded-[2px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--color-secondary)] border-b border-[var(--color-border)]">
                    <th className="px-4 py-3 text-left uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Patient</th>
                    <th className="px-4 py-3 text-left uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Room</th>
                    <th className="px-4 py-3 text-left uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Priority</th>
                    <th className="px-4 py-3 text-left uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Last Vitals</th>
                    <th className="px-4 py-3 text-left uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {nursePatients.map((patient, index) => (
                    <tr key={patient.id} className={`border-b border-[var(--color-border)] hover:bg-[var(--color-secondary)] transition-colors ${index % 2 === 0 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-card)]'} cursor-pointer`} onClick={() => navigate(`/doctor/patients/${patient.id}`)}>
                      <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">{patient.name}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{patient.room}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{patient.priority}</td>
                      <td className="px-4 py-3 font-mono text-[var(--color-text-primary)]">{patient.lastVitals}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{patient.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <Card title="Task List" subtitle="Nursing interventions queued for today." className="h-full">
          <div className="mt-4 space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className={`p-3 border rounded-[2px] border-[var(--color-border)] ${task.completed ? 'bg-[var(--color-accent-success)]/10 border-[var(--color-accent-success)]' : 'hover:bg-[var(--color-secondary)] transition-colors'}`}>
                <div className="flex items-center justify-between text-[var(--color-text-primary)]">
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${task.completed ? 'text-[var(--color-accent-success)]' : ''}`}>{task.description}</p>
                  <span className="text-[9px] font-mono">Due {task.due}</span>
                </div>
                {!task.completed && (
                  <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">Pending confirmation at bedside.</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Care Plan Highlight" subtitle="Focus targets for the next rounding cycle." className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Next checkpoint</p>
          <h3 className="text-xl font-black text-[var(--color-text-primary)] mt-2">14:30 Multidisciplinary huddle</h3>
          <p className="text-[10px] text-[var(--color-text-secondary)]">Review telemetry + sedation wean for ICU-4</p>
        </div>
        <Activity className="w-10 h-10 text-[var(--color-accent-cyan)]" />
      </Card>
    </div>
  );
};

export default NursePatients;
