import React from 'react';
import Card from '../components/Card';
import { Calendar, Clock, Users, ShieldAlert, PhoneCall, FileCheck } from 'lucide-react';

const APPOINTMENTS = [
  { id: '1', patient: 'Marcus Sterling', time: '14:00', doctor: 'Dr. Jennifer Lee', type: 'Consultation', status: 'Confirmed', room: 'Suite 201' },
  { id: '2', patient: 'Elena Rostova', time: '14:40', doctor: 'Dr. Michael Chen', type: 'Diabetes Follow-up', status: 'Waiting', room: 'Suite 204' },
  { id: '3', patient: 'James Wilson', time: '15:15', doctor: 'Dr. Sarah Jenkins', type: 'Medication Review', status: 'In Progress', room: 'Suite 198' },
  { id: '4', patient: 'Sarah Connor', time: '16:00', doctor: 'Dr. Sarah Jenkins', type: 'Emergency', status: 'Priority', room: 'Critical Response' },
  { id: '5', patient: 'Priya Nanda', time: '16:30', doctor: 'Dr. Emily Park', type: 'New Patient', status: 'Confirmed', room: 'Suite 210' },
];

const WAITING_LIST = [
  { name: 'Robert Chen', wait: '12 min', type: 'Follow-up', priority: 'Normal' },
  { name: 'Maria Garcia', wait: '4 min', type: 'Urgent refill', priority: 'Urgent' },
  { name: 'David Kim', wait: '25 min', type: 'Lab review', priority: 'Normal' },
];

const DAILY_METRICS = [
  { label: 'Checked-in', value: 24 },
  { label: 'No-shows', value: 1 },
  { label: 'Confirmed', value: 18 },
  { label: 'Pending', value: 3 },
];

const getStatusColor = (status) => {
  switch (status) {
    case 'Confirmed':
      return 'text-[var(--color-accent-success)] border-[var(--color-accent-success)]';
    case 'Waiting':
      return 'text-[var(--color-accent-warning)] border-[var(--color-accent-warning)]';
    case 'In Progress':
      return 'text-[var(--color-accent-cyan)] border-[var(--color-accent-cyan)]';
    case 'Priority':
      return 'text-[var(--color-accent-red)] border-[var(--color-accent-red)]';
    default:
      return 'text-[var(--color-text-secondary)] border-[var(--color-border)]';
  }
};

const ReceptionistAppointments = () => (
  <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="flex items-end justify-between border-b border-[var(--color-border)] pb-4">
      <div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)] uppercase tracking-tight">Appointment Center</h1>
        <p className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-wider mt-1">Front desk operations for timetabling, arrivals, and calls.</p>
      </div>
      <div className="flex items-center gap-3 text-[var(--color-text-secondary)] text-xs uppercase tracking-[0.4em]">
        <Calendar className="w-4 h-4" />
        <span>Today</span>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {DAILY_METRICS.map((metric) => (
        <Card key={metric.label} className="flex flex-col">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-[var(--color-accent-cyan)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">{metric.label}</span>
          </div>
          <p className="text-3xl font-black mt-3 text-[var(--color-text-primary)]">{metric.value}</p>
        </Card>
      ))}
    </div>

    <Card title="Appointment Schedule" subtitle="Live session allocation and check-in tracking." className="flex-1">
      <div className="mt-4 border border-[var(--color-border)] rounded-[2px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--color-secondary)] border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Time</th>
                <th className="px-4 py-3 text-left uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Patient</th>
                <th className="px-4 py-3 text-left uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Doctor</th>
                <th className="px-4 py-3 text-left uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Type</th>
                <th className="px-4 py-3 text-left uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Status</th>
                <th className="px-4 py-3 text-left uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Room</th>
              </tr>
            </thead>
            <tbody>
              {APPOINTMENTS.map((appointment, index) => (
                <tr key={appointment.id} className={`border-b border-[var(--color-border)] hover:bg-[var(--color-secondary)] transition-colors ${index % 2 === 0 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-card)]'}`}>
                  <td className="px-4 py-3 font-mono text-[var(--color-text-primary)]">{appointment.time}</td>
                  <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">{appointment.patient}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{appointment.doctor}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{appointment.type}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] font-black px-2 py-1 border rounded-[1px] ${getStatusColor(appointment.status)}`}>
                      {appointment.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{appointment.room}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card title="Waiting Room" subtitle="Patients queued for check-in." className="h-full">
        <div className="mt-4 space-y-3">
          {WAITING_LIST.map((patient) => (
            <div key={patient.name} className="p-3 border border-[var(--color-border)] rounded-[2px] hover:bg-[var(--color-secondary)] transition-colors">
              <div className="flex items-center justify-between text-[var(--color-text-secondary)] text-xs">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                  <span className="font-bold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">{patient.name}</span>
                </div>
                <span>{patient.wait}</span>
              </div>
              <div className="flex items-center justify-between mt-2 text-[var(--color-text-primary)] text-sm">
                <span>{patient.type}</span>
                <span className="text-[9px] font-black px-2 py-0.5 border rounded-[1px] border-[var(--color-border)]">{patient.priority}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Communication" subtitle="Recent inbound/outbound calls." className="h-full">
        <div className="mt-4 space-y-3">
          {[
            { id: 1, type: 'Incoming', origin: 'Patient portal', detail: 'Urgent refill request', time: '2 min ago' },
            { id: 2, type: 'Outbound', origin: 'Insurance', detail: 'Verify coverage for MRI', time: '12 min ago' },
            { id: 3, type: 'Incoming', origin: 'Emergency', detail: 'Redirect to critical response', time: '22 min ago' },
          ].map((call) => (
            <div key={call.id} className="flex items-start gap-3 bg-[var(--color-primary)] border border-[var(--color-border)] rounded-[2px] p-3">
              <PhoneCall className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              <div className="flex-1 text-[var(--color-text-secondary)] text-xs">
                <p className="font-semibold text-[var(--color-text-primary)] uppercase tracking-[0.2em]">{call.type}</p>
                <p className="mt-1">{call.detail}</p>
                <p className="flex items-center gap-2 mt-1 text-[var(--color-text-secondary)]">
                  <Clock className="w-3 h-3" />
                  {call.time} via {call.origin}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>

    <Card className="bg-[var(--color-card)] flex items-center justify-between">
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">Operational Notice</h3>
        <p className="text-[var(--color-text-primary)] text-sm mt-2">Next surge drill scheduled for 2026-03-05 09:00.</p>
      </div>
      <ShieldAlert className="w-8 h-8 text-[var(--color-accent-warning)]" />
    </Card>
  </div>
);

export default ReceptionistAppointments;
