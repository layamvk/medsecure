
import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { Calendar, Phone, Users, Clock, DollarSign, FileText, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';

const ReceptionistDashboard = () => {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [waitingPatients, setWaitingPatients] = useState([]);
    const [calls, setCalls] = useState([]);
    const [billing, setBilling] = useState([]);

    useEffect(() => {
        // Replace with real API endpoints
        api.get('appointments').then(res => setAppointments(res.data || []));
        api.get('patients/waiting').then(res => setWaitingPatients(res.data || []));
        api.get('calls').then(res => setCalls(res.data || []));
        api.get('billing').then(res => setBilling(res.data || []));
    }, []);

const ReceptionistDashboard = () => {
    const { user } = useAuth();

    return (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-end justify-between mb-4 border-b border-[var(--color-border)] pb-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] uppercase">Reception Command Center</h1>
                    <p className="text-[var(--color-text-secondary)] text-xs font-bold uppercase tracking-wider mt-1">Personnel: {user.name} // Shift: Day // Station: Front Desk Alpha</p>
                </div>
            </div>

            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <Card className="flex flex-col">
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">Today's Appointments</h3>
                    <p className="text-4xl font-black mt-3 text-[var(--color-text-primary)] tracking-tighter">{MOCK_APPOINTMENTS.length}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] bg-[var(--color-accent-success)] text-white px-1.5 py-0.5 rounded-[1px] font-bold">SCHEDULED</span>
                    </div>
                </Card>

                <Card className="flex flex-col">
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">Waiting Patients</h3>
                    <p className="text-4xl font-black mt-3 text-[var(--color-accent-warning)] tracking-tighter">{MOCK_WAITING_PATIENTS.length}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] border border-[var(--color-accent-warning)] text-[var(--color-accent-warning)] px-1.5 py-0.5 rounded-[1px] font-bold">QUEUE</span>
                    </div>
                </Card>

                <Card className="flex flex-col">
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">Pending Calls</h3>
                    <p className="text-4xl font-black mt-3 text-[var(--color-accent-red)] tracking-tighter">
                        {MOCK_CALLS.filter(c => !c.handled).length}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] bg-[var(--color-accent-red)] text-white px-1.5 py-0.5 rounded-[1px] font-bold">ACTIVE</span>
                    </div>
                </Card>

                <Card className="flex flex-col">
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">Today's Revenue</h3>
                    <p className="text-4xl font-black mt-3 text-[var(--color-text-primary)] tracking-tighter">$555</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] bg-[var(--color-accent-cyan)] text-[#0B1220] px-1.5 py-0.5 rounded-[1px] font-bold">TRACKING</span>
                    </div>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Appointment Schedule */}
                <Card title="Today's Schedule" subtitle="Current appointment bookings and patient flow management." className="h-full">
                    <div className="mt-4 border border-[var(--color-border)] rounded-[2px] overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-[var(--color-secondary)] border-b border-[var(--color-border)]">
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase">Time</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase">Patient</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase">Doctor</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {MOCK_APPOINTMENTS.map((appointment, index) => (
                                    <tr key={appointment.id} className={`border-b border-[var(--color-border)] hover:bg-[var(--color-secondary)] transition-colors ${index % 2 === 0 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-card)]'}`}>
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-mono text-[var(--color-text-primary)]">{appointment.time}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="text-xs font-semibold text-[var(--color-text-primary)]">{appointment.patient}</p>
                                                <p className="text-[10px] text-[var(--color-text-secondary)]">{appointment.type}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-[var(--color-text-primary)]">{appointment.doctor}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[9px] font-bold px-2 py-1 rounded-[1px] ${getStatusColor(appointment.status)}`}>
                                                {appointment.status.toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Waiting Room */}
                <Card title="Waiting Room Status" subtitle="Current patient queue and estimated wait times." className="h-full">
                    <div className="mt-4 space-y-3">
                        {MOCK_WAITING_PATIENTS.map((patient) => (
                            <div key={patient.id} className="p-3 border border-[var(--color-border)] rounded-[2px] hover:bg-[var(--color-secondary)] transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Users className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                                        <div>
                                            <p className="text-xs font-semibold text-[var(--color-text-primary)]">{patient.name}</p>
                                            <p className="text-[10px] text-[var(--color-text-secondary)]">Appointment: {patient.appointmentTime}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Clock className="w-3 h-3 text-[var(--color-text-secondary)]" />
                                            <span className="text-xs font-mono text-[var(--color-text-primary)]">{patient.waitTime}</span>
                                        </div>
                                        <span className={`text-[9px] font-bold px-2 py-1 border rounded-[1px] ${getPriorityColor(patient.priority)}`}>
                                            {patient.priority.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Call Log */}
                <Card title="Call Activity" subtitle="Recent phone calls and communication log.">
                    <div className="mt-4 space-y-3">
                        {MOCK_CALLS.map((call) => (
                            <div key={call.id} className={`p-3 border rounded-[2px] transition-colors ${call.handled ? 'border-[var(--color-accent-success)] bg-[var(--color-accent-success)]/5' : 'border-[var(--color-accent-red)] bg-[var(--color-accent-red)]/5'}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <Phone className={`w-4 h-4 ${call.handled ? 'text-[var(--color-accent-success)]' : 'text-[var(--color-accent-red)]'}`} />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-[var(--color-text-primary)]">{call.number}</span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-[1px] ${call.type === 'Incoming' ? 'bg-[var(--color-accent-cyan)] text-[#0B1220]' : 'bg-[var(--color-text-secondary)] text-white'}`}>
                                                    {call.type.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">{call.purpose}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-[var(--color-text-secondary)] mb-1">{call.time}</p>
                                        <span className={`text-[9px] font-bold px-2 py-1 rounded-[1px] ${call.handled ? 'bg-[var(--color-accent-success)] text-white' : 'bg-[var(--color-accent-red)] text-white'}`}>
                                            {call.handled ? 'HANDLED' : 'PENDING'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Billing Summary */}
                <Card title="Billing & Payments" subtitle="Financial transactions and insurance processing.">
                    <div className="mt-4 border border-[var(--color-border)] rounded-[2px] overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-[var(--color-secondary)] border-b border-[var(--color-border)]">
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase">Patient</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase">Amount</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {MOCK_BILLING.map((bill, index) => (
                                    <tr key={bill.id} className={`border-b border-[var(--color-border)] hover:bg-[var(--color-secondary)] transition-colors ${index % 2 === 0 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-card)]'}`}>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="text-xs font-semibold text-[var(--color-text-primary)]">{bill.patient}</p>
                                                <p className="text-[10px] text-[var(--color-text-secondary)]">{bill.service}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-mono text-[var(--color-text-primary)]">{bill.amount}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[9px] font-bold px-2 py-1 rounded-[1px] ${getStatusColor(bill.status)}`}>
                                                {bill.status.toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ReceptionistDashboard;