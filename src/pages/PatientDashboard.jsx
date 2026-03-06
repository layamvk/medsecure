import React from 'react';
import Card from '../components/Card';
import { Calendar, FileText, Heart, Clock, Pill, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MOCK_APPOINTMENTS = [
    { id: '1', date: '2026-03-05', time: '10:00 AM', doctor: 'Dr. Sarah Jenkins', type: 'Annual Check-up', status: 'Confirmed' },
    { id: '2', date: '2026-03-12', time: '2:30 PM', doctor: 'Dr. Michael Chen', type: 'Cardiology Consultation', status: 'Scheduled' },
    { id: '3', date: '2026-03-20', time: '9:15 AM', doctor: 'Dr. Sarah Jenkins', type: 'Follow-up', status: 'Pending' },
];

const MOCK_MEDICATIONS = [
    { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', prescribedBy: 'Dr. Sarah Jenkins', startDate: '2026-01-15', nextRefill: '2026-03-15' },
    { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily with meals', prescribedBy: 'Dr. Michael Chen', startDate: '2025-11-20', nextRefill: '2026-03-20' },
    { name: 'Vitamin D3', dosage: '2000 IU', frequency: 'Once daily', prescribedBy: 'Dr. Sarah Jenkins', startDate: '2025-12-01', nextRefill: '2026-04-01' },
];

const MOCK_VITALS = [
    { date: '2026-03-01', bloodPressure: '128/82', heartRate: '72 bpm', weight: '165 lbs', temperature: '98.6°F' },
    { date: '2026-02-15', bloodPressure: '130/85', heartRate: '75 bpm', weight: '167 lbs', temperature: '98.4°F' },
    { date: '2026-02-01', bloodPressure: '125/80', heartRate: '70 bpm', weight: '168 lbs', temperature: '98.7°F' },
];

const MOCK_RECENT_VISITS = [
    { date: '2026-02-28', doctor: 'Dr. Sarah Jenkins', reason: 'Routine Physical Exam', diagnosis: 'Normal examination, mild hypertension monitoring', nextAction: 'Continue current medications' },
    { date: '2026-01-15', doctor: 'Dr. Michael Chen', reason: 'Cardiology Consultation', diagnosis: 'Mild hypertension, recommend lifestyle changes', nextAction: 'Follow up in 3 months' },
    { date: '2025-12-10', doctor: 'Dr. Sarah Jenkins', reason: 'Annual Wellness Visit', diagnosis: 'Overall good health', nextAction: 'Annual follow-up' },
];

const MOCK_TEST_RESULTS = [
    { date: '2026-02-25', test: 'Complete Blood Count', status: 'Normal', doctor: 'Dr. Sarah Jenkins', details: 'All values within normal range' },
    { date: '2026-02-25', test: 'Lipid Panel', status: 'Abnormal', doctor: 'Dr. Sarah Jenkins', details: 'Slightly elevated cholesterol - diet modification recommended' },
    { date: '2026-01-20', test: 'HbA1c', status: 'Normal', doctor: 'Dr. Michael Chen', details: '5.8% - Good diabetes control' },
];

const getStatusColor = (status) => {
    switch (status) {
        case 'Confirmed': return 'bg-[var(--color-accent-success)] text-white';
        case 'Scheduled': return 'bg-[var(--color-accent-cyan)] text-[#0B1220]';
        case 'Pending': return 'bg-[var(--color-accent-warning)] text-white';
        case 'Normal': return 'bg-[var(--color-accent-success)] text-white';
        case 'Abnormal': return 'bg-[var(--color-accent-warning)] text-white';
        default: return 'bg-[var(--color-text-secondary)] text-white';
    }
};

const getStatusIcon = (status) => {
    switch (status) {
        case 'Normal': 
        case 'Confirmed': 
            return <CheckCircle className="w-3 h-3 text-[var(--color-accent-success)]" />;
        case 'Abnormal': 
        case 'Pending': 
            return <AlertCircle className="w-3 h-3 text-[var(--color-accent-warning)]" />;
        default: 
            return <Clock className="w-3 h-3 text-[var(--color-text-secondary)]" />;
    }
};

const PatientDashboard = () => {
    const { user } = useAuth();

    return (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-end justify-between mb-4 border-b border-[var(--color-border)] pb-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] uppercase">Patient Portal</h1>
                    <p className="text-[var(--color-text-secondary)] text-xs font-bold uppercase tracking-wider mt-1">Welcome: {user.name} // Patient ID: PT-5731 // Access Level: Personal Records</p>
                </div>
            </div>

            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <Card className="flex flex-col">
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">Upcoming Appointments</h3>
                    <p className="text-4xl font-black mt-3 text-[var(--color-text-primary)] tracking-tighter">{MOCK_APPOINTMENTS.length}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] bg-[var(--color-accent-success)] text-white px-1.5 py-0.5 rounded-[1px] font-bold">ACTIVE</span>
                    </div>
                </Card>

                <Card className="flex flex-col">
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">Active Medications</h3>
                    <p className="text-4xl font-black mt-3 text-[var(--color-text-primary)] tracking-tighter">{MOCK_MEDICATIONS.length}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] bg-[var(--color-accent-cyan)] text-[#0B1220] px-1.5 py-0.5 rounded-[1px] font-bold">MANAGED</span>
                    </div>
                </Card>

                <Card className="flex flex-col">
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">Recent Tests</h3>
                    <p className="text-4xl font-black mt-3 text-[var(--color-text-primary)] tracking-tighter">{MOCK_TEST_RESULTS.length}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] border border-[var(--color-border)] text-[var(--color-text-secondary)] px-1.5 py-0.5 rounded-[1px] font-bold">REVIEWED</span>
                    </div>
                </Card>

                <Card className="flex flex-col">
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">Last Visit</h3>
                    <p className="text-lg font-black mt-3 text-[var(--color-text-primary)] tracking-tighter">Feb 28</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] bg-[var(--color-accent-success)] text-white px-1.5 py-0.5 rounded-[1px] font-bold">COMPLETE</span>
                    </div>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Upcoming Appointments */}
                <Card title="Upcoming Appointments" subtitle="Schedule for your upcoming medical appointments and consultations." className="h-full">
                    <div className="mt-4 space-y-3">
                        {MOCK_APPOINTMENTS.map((appointment) => (
                            <div key={appointment.id} className="p-4 border border-[var(--color-border)] rounded-[2px] hover:bg-[var(--color-secondary)] transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <Calendar className="w-4 h-4 text-[var(--color-accent-cyan)] mt-1" />
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{appointment.type}</p>
                                                <span className={`text-[9px] font-bold px-2 py-1 rounded-[1px] ${getStatusColor(appointment.status)}`}>
                                                    {appointment.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-[var(--color-text-primary)] mb-1">{appointment.doctor}</p>
                                            <p className="text-[10px] text-[var(--color-text-secondary)]">{appointment.date} at {appointment.time}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Current Medications */}
                <Card title="Current Medications" subtitle="Your active prescriptions and medication schedule." className="h-full">
                    <div className="mt-4 space-y-3">
                        {MOCK_MEDICATIONS.map((medication, index) => (
                            <div key={index} className="p-4 border border-[var(--color-border)] rounded-[2px] hover:bg-[var(--color-secondary)] transition-colors">
                                <div className="flex items-start gap-3">
                                    <Pill className="w-4 h-4 text-[var(--color-accent-cyan)] mt-1" />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{medication.name}</p>
                                            <span className="text-xs text-[var(--color-text-secondary)]">{medication.dosage}</span>
                                        </div>
                                        <p className="text-xs text-[var(--color-text-primary)] mb-1">{medication.frequency}</p>
                                        <div className="flex items-center justify-between text-[10px] text-[var(--color-text-secondary)]">
                                            <span>Prescribed by: {medication.prescribedBy}</span>
                                            <span>Refill due: {medication.nextRefill}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Recent Test Results */}
                <Card title="Recent Test Results" subtitle="Laboratory and diagnostic test results from recent visits.">
                    <div className="mt-4 border border-[var(--color-border)] rounded-[2px] overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-[var(--color-secondary)] border-b border-[var(--color-border)]">
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase">Test</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase">Result</th>
                                </tr>
                            </thead>
                            <tbody>
                                {MOCK_TEST_RESULTS.map((result, index) => (
                                    <tr key={index} className={`border-b border-[var(--color-border)] hover:bg-[var(--color-secondary)] transition-colors ${index % 2 === 0 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-card)]'}`}>
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-mono text-[var(--color-text-primary)]">{result.date}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="text-xs font-semibold text-[var(--color-text-primary)]">{result.test}</p>
                                                <p className="text-[10px] text-[var(--color-text-secondary)]">{result.doctor}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(result.status)}
                                                <span className={`text-[9px] font-bold px-2 py-1 rounded-[1px] ${getStatusColor(result.status)}`}>
                                                    {result.status.toUpperCase()}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Vital Signs History */}
                <Card title="Recent Vitals" subtitle="Your most recent vital signs and health measurements.">
                    <div className="mt-4 space-y-3">
                        {MOCK_VITALS.map((vital, index) => (
                            <div key={index} className="p-3 border border-[var(--color-border)] rounded-[2px] hover:bg-[var(--color-secondary)] transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Heart className="w-4 h-4 text-[var(--color-accent-red)]" />
                                        <span className="text-xs font-semibold text-[var(--color-text-primary)]">{vital.date}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <span className="text-[var(--color-text-secondary)] text-[10px] uppercase">Blood Pressure:</span>
                                        <p className="text-[var(--color-text-primary)] font-semibold">{vital.bloodPressure}</p>
                                    </div>
                                    <div>
                                        <span className="text-[var(--color-text-secondary)] text-[10px] uppercase">Heart Rate:</span>
                                        <p className="text-[var(--color-text-primary)] font-semibold">{vital.heartRate}</p>
                                    </div>
                                    <div>
                                        <span className="text-[var(--color-text-secondary)] text-[10px] uppercase">Weight:</span>
                                        <p className="text-[var(--color-text-primary)] font-semibold">{vital.weight}</p>
                                    </div>
                                    <div>
                                        <span className="text-[var(--color-text-secondary)] text-[10px] uppercase">Temperature:</span>
                                        <p className="text-[var(--color-text-primary)] font-semibold">{vital.temperature}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default PatientDashboard;