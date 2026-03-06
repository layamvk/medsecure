import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { Heart, Stethoscope, Users, Clock, FileText, AlertCircle, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';
import { useRealTimeAppointments } from '../hooks/useSocket';
import CriticalAlertBanner from '../components/CriticalAlertBanner';

const NurseDashboard = () => {
    const { user } = useAuth();
    const [assignedPatients, setAssignedPatients] = useState([]);
    const [medications, setMedications] = useState([]);
    const [tasks, setTasks] = useState([]);

    // Real-time critical alerts via Socket.IO
    const { criticalAlerts, clearAlert } = useRealTimeAppointments([]);

    useEffect(() => {
        api.get('patients/assigned').then(res => setAssignedPatients(res.data || []));
        api.get('medications/nurse').then(res => setMedications(res.data || []));
        api.get('tasks/nurse').then(res => setTasks(res.data || []));
    }, []);

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'Critical': return 'text-[var(--color-accent-red)] border-[var(--color-accent-red)]';
            case 'High': return 'text-[var(--color-accent-warning)] border-[var(--color-accent-warning)]';
            case 'Medium': return 'text-[var(--color-accent-cyan)] border-[var(--color-accent-cyan)]';
            case 'Low': return 'text-[var(--color-accent-success)] border-[var(--color-accent-success)]';
            default: return 'text-[var(--color-text-secondary)] border-[var(--color-border)]';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Critical': return 'bg-[var(--color-accent-red)] text-white';
            case 'Due': return 'bg-[var(--color-accent-warning)] text-white';
            case 'Administered': return 'bg-[var(--color-accent-success)] text-white';
            case 'Scheduled': return 'bg-[var(--color-accent-cyan)] text-[#0B1220]';
            default: return 'bg-[var(--color-text-secondary)] text-white';
        }
    };

    return (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-end justify-between mb-4 border-b border-[var(--color-border)] pb-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] uppercase">Nurse Station Central</h1>
                    <p className="text-[var(--color-text-secondary)] text-xs font-bold uppercase tracking-wider mt-1">Personnel: {user.name} // Shift: Day // Ward: Medical-Surgical</p>
                </div>
            </div>

            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <Card className="flex flex-col">
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">Assigned Patients</h3>
                    <p className="text-4xl font-black mt-3 text-[var(--color-text-primary)] tracking-tighter">{assignedPatients.length}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] bg-[var(--color-accent-success)] text-white px-1.5 py-0.5 rounded-[1px] font-bold">ACTIVE</span>
                    </div>
                </Card>

                <Card className="flex flex-col">
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">Medications Due</h3>
                    <p className="text-4xl font-black mt-3 text-[var(--color-accent-warning)] tracking-tighter">
                        {medications.filter(m => m.status === 'Due' || m.status === 'Critical').length}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] border border-[var(--color-accent-warning)] text-[var(--color-accent-warning)] px-1.5 py-0.5 rounded-[1px] font-bold">PENDING</span>
                    </div>
                </Card>

                <Card className="flex flex-col" glow={assignedPatients.some(p => p.priority === 'Critical')}>
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">Critical Alerts</h3>
                    <p className="text-4xl font-black mt-3 text-[var(--color-accent-red)] tracking-tighter">
                        {assignedPatients.filter(p => p.priority === 'Critical').length}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] bg-[var(--color-accent-red)] text-white px-1.5 py-0.5 rounded-[1px] font-bold">URGENT</span>
                    </div>
                </Card>

                <Card className="flex flex-col">
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">Tasks Completed</h3>
                    <p className="text-4xl font-black mt-3 text-[var(--color-text-primary)] tracking-tighter">
                        {tasks.filter(t => t.completed).length}/{tasks.length}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] bg-[var(--color-accent-cyan)] text-[#0B1220] px-1.5 py-0.5 rounded-[1px] font-bold">PROGRESS</span>
                    </div>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Patient Assignment */}
                <Card title="Patient Assignment" subtitle="Current ward responsibilities and patient care priorities." className="h-full">
                    <div className="mt-4 border border-[var(--color-border)] rounded-[2px] overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-[var(--color-secondary)] border-b border-[var(--color-border)]">
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase">Patient</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase">Room</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase">Priority</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assignedPatients.map((patient, index) => (
                                    <tr key={patient.id} className={`border-b border-[var(--color-border)] hover:bg-[var(--color-secondary)] transition-colors ${index % 2 === 0 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-card)]'}`}>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="text-xs font-semibold text-[var(--color-text-primary)]">{patient.name}</p>
                                                <p className="text-[10px] text-[var(--color-text-secondary)]">{patient.condition}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-mono text-[var(--color-text-primary)]">{patient.room}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-black px-2 py-1 border rounded-[1px] ${getPriorityColor(patient.priority)}`}>
                                                {patient.priority?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Activity className="w-3 h-3 text-[var(--color-accent-cyan)]" />
                                                <span className="text-xs text-[var(--color-text-primary)]">{patient.vitals}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Medication Schedule */}
                <Card title="Medication Schedule" subtitle="Pending medication administration and care protocols." className="h-full">
                    <div className="mt-4 space-y-3">
                        {medications.map((med, index) => (
                            <div key={index} className="p-3 border border-[var(--color-border)] rounded-[2px] hover:bg-[var(--color-secondary)] transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Stethoscope className="w-3 h-3 text-[var(--color-accent-cyan)]" />
                                            <p className="text-xs font-semibold text-[var(--color-text-primary)]">{med.patient}</p>
                                        </div>
                                        <p className="text-xs text-[var(--color-text-primary)] font-medium">{med.medication}</p>
                                        <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">{med.type}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-mono text-[var(--color-text-primary)] mb-1">{med.time}</p>
                                        <span className={`text-[9px] font-bold px-2 py-1 rounded-[1px] ${getStatusColor(med.status)}`}>{med.status?.toUpperCase()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Task List */}
            <Card title="Daily Task Queue" subtitle="Scheduled nursing activities and patient care interventions.">
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tasks.map((task) => (
                        <div key={task.id} className={`p-3 border rounded-[2px] transition-colors ${task.completed ? 'border-[var(--color-accent-success)] bg-[var(--color-accent-success)]/5' : 'border-[var(--color-border)] hover:bg-[var(--color-secondary)]'}`}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 border-2 rounded-[1px] ${task.completed ? 'bg-[var(--color-accent-success)] border-[var(--color-accent-success)]' : 'border-[var(--color-border)]'}`}>{task.completed && <div className="w-full h-full flex items-center justify-center">✓</div>}</div>
                                    <div>
                                        <p className={`text-xs font-medium ${task.completed ? 'text-[var(--color-accent-success)] line-through' : 'text-[var(--color-text-primary)]'}`}>{task.task}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 border rounded-[1px] ${getPriorityColor(task.priority)}`}>{task.priority?.toUpperCase()}</span>
                                            <span className="text-[10px] text-[var(--color-text-secondary)] font-mono">Due: {task.due}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default NurseDashboard;
