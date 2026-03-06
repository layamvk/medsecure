import React, { useState } from 'react';
import Card from '../components/Card';
import { Clock, FileText, User, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MOCK_HISTORY_DATA = [
    {
        id: 1,
        timestamp: '2026-03-02T14:32:00Z',
        action: 'Patient Record Access',
        target: 'Marcus Sterling (PT-8932)',
        details: 'Viewed complete medical history and lab results',
        ipAddress: '192.168.1.42',
        deviceInfo: 'Chrome 122 on Windows 11',
        riskLevel: 'Low',
        sensitivity: 'High',
        duration: '12 min 34 sec'
    },
    {
        id: 2,
        timestamp: '2026-03-02T13:45:00Z',
        action: 'Prescription Authorization',
        target: 'Elena Rostova (PT-1049)',
        details: 'Authorized refill for Metformin 500mg',
        ipAddress: '192.168.1.42',
        deviceInfo: 'Chrome 122 on Windows 11',
        riskLevel: 'Medium',
        sensitivity: 'Medium',
        duration: '3 min 12 sec'
    },
    {
        id: 3,
        timestamp: '2026-03-02T12:18:00Z',
        action: 'Data Export Request',
        target: 'Daily Shift Summary',
        details: 'Exported patient census and treatment overview',
        ipAddress: '192.168.1.42',
        deviceInfo: 'Chrome 122 on Windows 11',
        riskLevel: 'Low',
        sensitivity: 'Low',
        duration: '45 sec'
    },
    {
        id: 4,
        timestamp: '2026-03-02T11:22:00Z',
        action: 'Emergency Access',
        target: 'Sarah Connor (PT-9988)',
        details: 'Emergency protocol: Accessed ICU critical records',
        ipAddress: '192.168.1.42',
        deviceInfo: 'Chrome 122 on Windows 11',
        riskLevel: 'High',
        sensitivity: 'High',
        duration: '28 min 15 sec'
    },
    {
        id: 5,
        timestamp: '2026-03-02T10:55:00Z',
        action: 'Lab Results Review',
        target: 'James Wilson (PT-4421)',
        details: 'Reviewed blood chemistry panel results',
        ipAddress: '192.168.1.42',
        deviceInfo: 'Chrome 122 on Windows 11',
        riskLevel: 'Low',
        sensitivity: 'Medium',
        duration: '7 min 23 sec'
    },
    {
        id: 6,
        timestamp: '2026-03-02T09:30:00Z',
        action: 'Authentication Event',
        target: 'System Login',
        details: 'Multi-factor authentication completed',
        ipAddress: '192.168.1.42',
        deviceInfo: 'Chrome 122 on Windows 11',
        riskLevel: 'Low',
        sensitivity: 'Low',
        duration: '1 min 45 sec'
    },
    {
        id: 7,
        timestamp: '2026-03-01T16:42:00Z',
        action: 'Patient Record Access',
        target: 'Michael Chang (PT-1122)',
        details: 'Updated treatment plan and medication schedule',
        ipAddress: '192.168.1.35',
        deviceInfo: 'Chrome 121 on Windows 11',
        riskLevel: 'Low',
        sensitivity: 'Medium',
        duration: '18 min 12 sec'
    },
    {
        id: 8,
        timestamp: '2026-03-01T15:18:00Z',
        action: 'Privacy Budget Query',
        target: 'System Query',
        details: 'Checked remaining privacy budget allocation',
        ipAddress: '192.168.1.35',
        deviceInfo: 'Chrome 121 on Windows 11',
        riskLevel: 'Low',
        sensitivity: 'Low',
        duration: '30 sec'
    }
];

const getRiskIcon = (riskLevel) => {
    switch (riskLevel) {
        case 'High': return <AlertTriangle className="w-3 h-3 text-[var(--color-accent-red)]" />;
        case 'Medium': return <Eye className="w-3 h-3 text-[var(--color-accent-warning)]" />;
        case 'Low': return <CheckCircle className="w-3 h-3 text-[var(--color-accent-success)]" />;
        default: return <CheckCircle className="w-3 h-3 text-[var(--color-text-secondary)]" />;
    }
};

const getSensitivityColor = (sensitivity) => {
    switch (sensitivity) {
        case 'High': return 'text-[var(--color-accent-red)] border-[var(--color-accent-red)]';
        case 'Medium': return 'text-[var(--color-accent-warning)] border-[var(--color-accent-warning)]';
        case 'Low': return 'text-[var(--color-accent-success)] border-[var(--color-accent-success)]';
        default: return 'text-[var(--color-text-secondary)] border-[var(--color-border)]';
    }
};

const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    };
};

const History = () => {
    const { user } = useAuth();
    const [filterRisk, setFilterRisk] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredHistory = MOCK_HISTORY_DATA.filter(item => {
        const matchesRisk = filterRisk === 'All' || item.riskLevel === filterRisk;
        const matchesSearch = item.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             item.target.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesRisk && matchesSearch;
    });

    return (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between mb-4 border-b border-[var(--color-border)] pb-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] uppercase">Access History</h1>
                    <p className="text-[var(--color-text-secondary)] text-[10px] font-bold uppercase tracking-widest mt-1">Complete audit trail of your clinical system interactions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase">Filter:</span>
                    <select
                        value={filterRisk}
                        onChange={(e) => setFilterRisk(e.target.value)}
                        className="bg-[var(--color-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-3 py-2 rounded-[2px] focus:outline-none focus:border-[var(--color-accent-cyan)] transition-colors text-xs font-medium"
                    >
                        <option value="All">All Risk Levels</option>
                        <option value="High">High Risk</option>
                        <option value="Medium">Medium Risk</option>
                        <option value="Low">Low Risk</option>
                    </select>
                    <input
                        type="text"
                        placeholder="SEARCH ACTIONS OR TARGETS..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-[var(--color-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-4 py-2 rounded-[2px] focus:outline-none focus:border-[var(--color-accent-cyan)] transition-colors w-72 text-xs font-mono tracking-tight"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <Card className="flex flex-col">
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">Today's Actions</h3>
                    <p className="text-4xl font-black mt-3 text-[var(--color-text-primary)] tracking-tighter">
                        {filteredHistory.filter(h => h.timestamp.startsWith('2026-03-02')).length}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] bg-[var(--color-accent-success)] text-white px-1.5 py-0.5 rounded-[1px] font-bold">ACTIVE</span>
                    </div>
                </Card>

                <Card className="flex flex-col">
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">High Risk Events</h3>
                    <p className="text-4xl font-black mt-3 text-[var(--color-accent-red)] tracking-tighter">
                        {filteredHistory.filter(h => h.riskLevel === 'High').length}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] border border-[var(--color-accent-red)] text-[var(--color-accent-red)] px-1.5 py-0.5 rounded-[1px] font-bold">FLAGGED</span>
                    </div>
                </Card>

                <Card className="flex flex-col">
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">Patient Accesses</h3>
                    <p className="text-4xl font-black mt-3 text-[var(--color-text-primary)] tracking-tighter">
                        {filteredHistory.filter(h => h.action.includes('Patient')).length}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] border border-[var(--color-border)] text-[var(--color-text-secondary)] px-1.5 py-0.5 rounded-[1px] font-bold">TRACKED</span>
                    </div>
                </Card>

                <Card className="flex flex-col">
                    <h3 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">Session Duration</h3>
                    <p className="text-4xl font-black mt-3 text-[var(--color-text-primary)] tracking-tighter">4h</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] bg-[var(--color-accent-cyan)] text-[#0B1220] px-1.5 py-0.5 rounded-[1px] font-bold">ONGOING</span>
                    </div>
                </Card>
            </div>

            {/* History Table */}
            <Card title="Audit Trail" subtitle="Chronological record of all system interactions and data access events." className="flex-1">
                <div className="mt-4 border border-[var(--color-border)] rounded-[2px] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-[var(--color-secondary)] border-b border-[var(--color-border)]">
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-wider">Time</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-wider">Action</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-wider">Target</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-wider">Risk</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-wider">Sensitivity</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-wider">Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredHistory.map((item, index) => {
                                    const timeFormatted = formatTimestamp(item.timestamp);
                                    return (
                                        <tr key={item.id} className={`border-b border-[var(--color-border)] hover:bg-[var(--color-secondary)] transition-colors ${index % 2 === 0 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-card)]'}`}>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-[var(--color-text-primary)] font-mono">{timeFormatted.time}</span>
                                                    <span className="text-[10px] text-[var(--color-text-secondary)] font-medium">{timeFormatted.date}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-start gap-2">
                                                    <FileText className="w-4 h-4 text-[var(--color-accent-cyan)] mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="text-xs font-semibold text-[var(--color-text-primary)]">{item.action}</p>
                                                        <p className="text-[10px] text-[var(--color-text-secondary)] mt-1 leading-relaxed">{item.details}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3 h-3 text-[var(--color-text-secondary)]" />
                                                    <span className="text-xs font-medium text-[var(--color-text-primary)]">{item.target}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    {getRiskIcon(item.riskLevel)}
                                                    <span className="text-xs font-bold text-[var(--color-text-primary)]">{item.riskLevel}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`text-[10px] font-black px-2 py-1 border rounded-[1px] ${getSensitivityColor(item.sensitivity)}`}>
                                                    {item.sensitivity.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-xs font-mono text-[var(--color-text-secondary)]">{item.duration}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {filteredHistory.length === 0 && (
                    <div className="text-center py-12">
                        <Clock className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-4" />
                        <p className="text-[var(--color-text-secondary)] text-sm">No access history found matching your criteria.</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default History;