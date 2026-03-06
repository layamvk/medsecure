import React from 'react';
import SensitivityBadge from './SensitivityBadge';
import { ShieldAlert, ArrowRight } from 'lucide-react';

const PatientTable = ({ patients, onRowClick }) => {
    if (!patients || patients.length === 0) {
        return <div className="p-6 text-center text-text-secondary text-sm">No matching records found.</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-white/10">
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Patient Name</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Identifier</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Sensitivity</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right"></th>
                    </tr>
                </thead>
                <tbody>
                    {patients.map((patient) => {
                        const isHighRisk = patient.sensitivity.toLowerCase() === 'high';
                        return (
                            <tr
                                key={patient.id}
                                onClick={() => onRowClick && onRowClick(patient.id)}
                                className={`border-b border-white/5 hover:bg-white/5 cursor-pointer group transition-colors ${isHighRisk ? 'bg-red-900/20' : ''}`}
                            >
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <span className={`font-semibold text-sm ${isHighRisk ? 'text-red-400' : 'text-white'}`}>
                                            {patient.name}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4 text-text-secondary text-sm font-mono">[{patient.displayId}]</td>
                                <td className="p-4">
                                    <span className="text-sm font-medium text-text-secondary">{patient.status}</span>
                                </td>
                                <td className="p-4">
                                    <SensitivityBadge level={patient.sensitivity} />
                                </td>
                                <td className="p-4 text-right">
                                    <ArrowRight className="w-5 h-5 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default PatientTable;
