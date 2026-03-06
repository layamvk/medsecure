
import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { Calendar, Phone, Users, Clock, DollarSign, FileText, Bell, AlertTriangle, Zap, Stethoscope } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';
import { useRealTimeAppointments } from '../hooks/useSocket';
import CriticalAlertBanner from '../components/CriticalAlertBanner';

const MOCK_APPOINTMENTS = [
    { id: '1', time: '09:00 AM', patient: 'John Patterson', doctor: 'Dr. Evelyn Reed', type: 'Cardiology Consultation', status: 'Confirmed' },
    { id: '2', time: '10:30 AM', patient: 'Sarah Mills', doctor: 'Dr. Marcus Thorne', type: 'Neurology Follow-up', status: 'Scheduled' },
    { id: '3', time: '11:00 AM', patient: 'Robert Chen', doctor: 'Dr. Julian Hayes', type: 'General Checkup', status: 'Waiting' },
    { id: '4', time: '02:00 PM', patient: 'Emily Watson', doctor: 'Dr. Lena Petrova', type: 'Pediatric Visit', status: 'Scheduled' },
];

const MOCK_WAITING_PATIENTS = [
    { id: '1', name: 'Robert Chen', appointmentTime: '11:00 AM', waitTime: '12 min', priority: 'Normal' },
    { id: '2', name: 'Maria Garcia', appointmentTime: '11:30 AM', waitTime: '5 min', priority: 'High' },
];

const MOCK_CALLS = [
    { id: '1', number: '(555) 012-3456', type: 'Incoming', purpose: 'Appointment reschedule request', time: '9:15 AM', handled: true },
    { id: '2', number: '(555) 789-0123', type: 'Outgoing', purpose: 'Lab results notification', time: '9:45 AM', handled: true },
    { id: '3', number: '(555) 456-7890', type: 'Incoming', purpose: 'Insurance verification', time: '10:30 AM', handled: false },
];

const MOCK_BILLING = [
    { id: '1', patient: 'John Patterson', service: 'Cardiology Consultation', amount: '$250', status: 'Paid' },
    { id: '2', patient: 'Sarah Mills', service: 'Neurology Follow-up', amount: '$180', status: 'Pending' },
    { id: '3', patient: 'Emily Watson', service: 'Pediatric Visit', amount: '$125', status: 'Insurance' },
];

const getStatusColor = (status) => {
    switch (status) {
        case 'Confirmed': case 'Paid': return 'bg-[var(--color-accent-success)] text-white';
        case 'Scheduled': case 'Pending': return 'bg-[var(--color-accent-cyan)] text-[#0B1220]';
        case 'Waiting': case 'Insurance': return 'bg-[var(--color-accent-warning)] text-white';
        default: return 'bg-[var(--color-text-secondary)] text-white';
    }
};

const getPriorityColor = (priority) => {
    switch (priority) {
        case 'Critical': return 'text-[var(--color-accent-red)] border-[var(--color-accent-red)]';
        case 'High': return 'text-[var(--color-accent-warning)] border-[var(--color-accent-warning)]';
        case 'Normal': return 'text-[var(--color-accent-cyan)] border-[var(--color-accent-cyan)]';
        default: return 'text-[var(--color-text-secondary)] border-[var(--color-border)]';
    }
};

const getUrgencyColor = (level) => {
    switch (level) {
        case 'critical': return 'bg-red-500 text-white';
        case 'high': return 'bg-orange-500 text-white';
        case 'medium': return 'bg-yellow-600 text-white';
        case 'low': return 'bg-green-600 text-white';
        default: return 'bg-gray-500 text-white';
    }
};

const ReceptionistDashboard = () => {
    const { user } = useAuth();
    const [priorityQueue, setPriorityQueue] = useState([]);
    const [queueLoading, setQueueLoading] = useState(true);

    // Real-time updates via Socket.IO
    const { criticalAlerts, clearAlert } = useRealTimeAppointments([]);

    // Fetch priority queue
    useEffect(() => {
        api.get('/appointments/priority-queue').then(res => {
            setPriorityQueue(res.data || []);
        }).catch(() => {}).finally(() => setQueueLoading(false));
    }, []);

    // When critical alerts arrive, refresh priority queue
    useEffect(() => {
        if (criticalAlerts.length > 0) {
            api.get('/appointments/priority-queue').then(res => {
                setPriorityQueue(res.data || []);
            }).catch(() => {});
        }
    }, [criticalAlerts]);

    return (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Critical Alert Banner */}
            <CriticalAlertBanner alerts={criticalAlerts} onDismiss={clearAlert} />

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
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">Priority Queue</h3>
                    <p className="text-4xl font-black mt-3 text-[var(--color-accent-warning)] tracking-tighter">{priorityQueue.length}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] border border-[var(--color-accent-warning)] text-[var(--color-accent-warning)] px-1.5 py-0.5 rounded-[1px] font-bold flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" /> LIVE
                        </span>
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
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">Critical Alerts</h3>
                    <p className="text-4xl font-black mt-3 text-[var(--color-accent-red)] tracking-tighter">{criticalAlerts.length}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] bg-[var(--color-accent-red)] text-white px-1.5 py-0.5 rounded-[1px] font-bold flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> URGENT
                        </span>
                    </div>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Priority Queue — Real-time AI-sorted */}
                <Card title="Priority Queue" subtitle="AI-sorted by urgency score. Updates in real-time." className="h-full">
                    <div className="mt-4 border border-[var(--color-border)] rounded-[2px] overflow-hidden">
                        {queueLoading ? (
                            <div className="p-4 text-center text-xs text-[var(--color-text-secondary)]">Loading priority queue...</div>
                        ) : priorityQueue.length === 0 ? (
                            <div className="p-4 text-center text-xs text-[var(--color-text-secondary)]">No pending appointments in queue</div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-[var(--color-secondary)] border-b border-[var(--color-border)]">
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase">Urgency</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase">Doctor</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase">Time</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {priorityQueue.slice(0, 8).map((appt, index) => (
                                        <tr key={appt._id || index} className={`border-b border-[var(--color-border)] hover:bg-[var(--color-secondary)] transition-colors ${index % 2 === 0 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-card)]'}`}>
                                            <td className="px-4 py-3">
                                                <span className={`text-[9px] font-bold px-2 py-1 rounded-[1px] ${getUrgencyColor(appt.urgencyLevel)}`}>
                                                    {appt.urgencyLevel === 'critical' && '⚠ '}
                                                    {(appt.urgencyLevel || 'low').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="text-xs font-semibold text-[var(--color-text-primary)]">{appt.doctorName || 'Unassigned'}</p>
                                                    <p className="text-[10px] text-[var(--color-text-secondary)]">{appt.department}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs font-mono text-[var(--color-text-primary)]">{appt.time}</span>
                                                <p className="text-[10px] text-[var(--color-text-secondary)]">{appt.date ? new Date(appt.date).toLocaleDateString() : ''}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-[9px] font-bold px-2 py-1 rounded-[1px] bg-[var(--color-accent-cyan)] text-[#0B1220] capitalize">
                                                    {appt.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>

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