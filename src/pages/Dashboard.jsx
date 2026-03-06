import React from 'react';
import Card from '../components/Card';
import PatientTable from '../components/PatientTable';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const MOCK_PATIENTS = [
    { id: '1', name: 'Marcus Sterling', displayId: 'PT-8932', status: 'Admitted', sensitivity: 'High' },
    { id: '2', name: 'Elena Rostova', displayId: 'PT-1049', status: 'Routine Checkup', sensitivity: 'Medium' },
    { id: '3', name: 'James Wilson', displayId: 'PT-4421', status: 'Discharged', sensitivity: 'Low' },
    { id: '4', name: 'Sarah Connor', displayId: 'PT-9988', status: 'ICU', sensitivity: 'High' },
];

const RECENT_ACTIVITY = [
    { id: 1, action: 'Viewed labs for Marcus Sterling', time: '10 mins ago' },
    { id: 2, action: 'Authorized script refill for Elena Rostova', time: '1 hour ago' },
    { id: 3, action: 'Step-up authentication verified for Sarah Connor', time: '3 hours ago', highRisk: true },
    { id: 4, action: 'Exported daily shift summary', time: '5 hours ago' },
];

const Dashboard = () => {
    const { user, privacyBudget } = useAuth();
    const navigate = useNavigate();

    const handlePatientClick = (id) => {
        navigate(`/doctor/patients/${id}`);
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                    <p className="text-sm text-text-secondary mt-1">Welcome back, {user.name}. Here's your overview for today.</p>
                </div>
            </div>

            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="Assigned Patients">
                    <p className="text-5xl font-bold text-white">42</p>
                    <p className="text-sm text-accent-success mt-2">+3 new admissions</p>
                </Card>

                <Card title="Access Count (24h)">
                    <p className="text-5xl font-bold text-white">128</p>
                    <p className="text-sm text-text-secondary mt-2">Activity level is stable</p>
                </Card>

                <Card title="Privacy Quota">
                     <div className="flex items-baseline gap-2">
                        <p className={`text-5xl font-bold ${privacyBudget.current / privacyBudget.max > 0.8 ? 'text-red-500' : 'text-white'}`}>
                            {privacyBudget.current}
                        </p>
                        <p className="text-xl font-medium text-text-secondary">/ {privacyBudget.max}</p>
                    </div>
                     <p className={`text-sm mt-2 font-semibold ${privacyBudget.current / privacyBudget.max > 0.8 ? 'text-red-400' : 'text-amber-400'}`}>
                        {privacyBudget.current / privacyBudget.max > 0.8 ? 'Critical Limit Reached' : 'Approaching Limit'}
                    </p>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card
                        title="High Sensitivity Queue"
                        subtitle="Restricted records requiring elevated audit trail protocols."
                        className="h-full"
                    >
                        <PatientTable patients={MOCK_PATIENTS.filter(p => ['High', 'Medium'].includes(p.sensitivity))} onRowClick={handlePatientClick} />
                    </Card>
                </div>

                <div className="lg:col-span-1">
                    <Card title="Recent Activity" subtitle="Latest access events" className="h-full">
                        <div className="mt-4 flex flex-col gap-2">
                            {RECENT_ACTIVITY.map((activity) => (
                                <div key={activity.id} className={`p-3 rounded-lg transition-colors group ${activity.highRisk ? 'bg-red-500/10' : 'bg-white/5'}`}>
                                    <p className="text-sm font-medium text-text-primary">{activity.action}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {activity.highRisk && <AlertCircle className="w-4 h-4 text-red-400" />}
                                        <p className="text-xs text-text-secondary">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
