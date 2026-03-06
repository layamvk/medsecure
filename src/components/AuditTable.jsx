import React from 'react';
import SensitivityBadge from './SensitivityBadge';

const AuditTable = ({ logs }) => {
    if (!logs || logs.length === 0) {
        return <div className="p-6 text-center text-text-secondary text-sm">No audit logs found.</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-white/10">
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Timestamp</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Personnel</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Role</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Subject</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Sensitivity</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Cost</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Verdict</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {logs.map((log) => {
                        const isHighRisk = log.sensitivity.toLowerCase() === 'high' || log.status === 'Denied';
                        return (
                            <tr
                                key={log.id}
                                className={`border-b border-white/5 transition-colors hover:bg-white/5 group ${isHighRisk ? 'bg-red-900/20' : ''}`}
                            >
                                <td className="p-4 text-text-secondary font-mono text-xs whitespace-nowrap">{log.timestamp}</td>
                                <td className="p-4 text-white font-medium">{log.user}</td>
                                <td className="p-4 text-text-secondary font-medium">{log.role}</td>
                                <td className="p-4 text-white font-medium">{log.patient}</td>
                                <td className="p-4"><SensitivityBadge level={log.sensitivity} /></td>
                                <td className="p-4 text-amber-400 font-semibold font-mono text-xs">-{log.privacyCost}</td>
                                <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center ${
                                        log.status === 'Allowed' ? 'bg-green-500/10 text-green-400' :
                                        log.status === 'Denied' ? 'bg-red-500/10 text-red-400' :
                                        'bg-amber-500/10 text-amber-400'
                                    }`}>
                                        {log.status}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default AuditTable;
