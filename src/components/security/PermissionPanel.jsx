import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, XCircle } from 'lucide-react';
import Card from '../Card';

const PermissionPanel = () => {
    const { activePermissions, role } = useAuth();

    if (!activePermissions) return null;

    return (
        <Card title="Active Policy Scope" subtitle={`Displaying permissions for role: ${role}`}>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Allowed Actions */}
                <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-green-400 mb-4">
                        <CheckCircle2 className="w-5 h-5" />
                        Allowed Actions
                    </h4>
                    <ul className="space-y-3">
                        {activePermissions.allowed.map((action, idx) => (
                            <li key={idx} className="flex items-center gap-3">
                                <div className="w-1 h-1 bg-green-400 rounded-full shrink-0"></div>
                                <span className="text-sm text-text-secondary">{action}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Denied Actions */}
                <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-red-400 mb-4">
                        <XCircle className="w-5 h-5" />
                        Denied Actions
                    </h4>
                    <ul className="space-y-3">
                        {activePermissions.denied.map((action, idx) => (
                            <li key={idx} className="flex items-center gap-3">
                                <div className="w-1 h-1 bg-red-400 rounded-full shrink-0"></div>
                                <span className="text-sm text-text-secondary line-through">{action}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </Card>
    );
};

export default PermissionPanel;
