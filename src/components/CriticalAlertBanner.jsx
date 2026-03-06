import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Clock, User, Stethoscope } from 'lucide-react';

const URGENCY_COLORS = {
    critical: 'from-red-600 to-red-700 border-red-400',
    high: 'from-orange-500 to-orange-600 border-orange-400',
    medium: 'from-yellow-500 to-yellow-600 border-yellow-400',
    low: 'from-blue-500 to-blue-600 border-blue-400',
};

const URGENCY_LABELS = {
    critical: 'CRITICAL',
    high: 'HIGH PRIORITY',
    medium: 'MEDIUM',
    low: 'LOW',
};

/**
 * CriticalAlertBanner — Real-time emergency alert overlay.
 * Shows for critical/high urgency appointments broadcast via Socket.IO.
 */
export default function CriticalAlertBanner({ alerts = [], onDismiss }) {
    if (!alerts || alerts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-md w-full pointer-events-none">
            <AnimatePresence>
                {alerts.slice(0, 3).map((alert) => {
                    const urgency = alert.urgency?.urgencyLevel || alert.appointment?.urgencyLevel || 'high';
                    const colorClass = URGENCY_COLORS[urgency] || URGENCY_COLORS.high;
                    const label = URGENCY_LABELS[urgency] || 'ALERT';

                    return (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, x: 100, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 100, scale: 0.9 }}
                            transition={{ type: 'spring', damping: 20 }}
                            className={`pointer-events-auto bg-gradient-to-r ${colorClass} border rounded-2xl p-4 shadow-2xl text-white`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-black tracking-widest bg-white/20 px-2 py-0.5 rounded">
                                            {label}
                                        </span>
                                        <span className="text-xs opacity-80">
                                            {new Date(alert.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <p className="text-sm font-semibold truncate">
                                        New {urgency} urgency appointment
                                    </p>
                                    {alert.appointment && (
                                        <div className="mt-2 space-y-1 text-xs opacity-90">
                                            {alert.appointment.doctorName && (
                                                <p className="flex items-center gap-1">
                                                    <Stethoscope className="w-3 h-3" />
                                                    {alert.appointment.doctorName}
                                                </p>
                                            )}
                                            {alert.appointment.symptomDescription && (
                                                <p className="truncate">
                                                    Symptoms: {alert.appointment.symptomDescription}
                                                </p>
                                            )}
                                            {alert.urgency?.symptomTags?.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {alert.urgency.symptomTags.slice(0, 4).map((tag, i) => (
                                                        <span key={i} className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {onDismiss && (
                                    <button
                                        onClick={() => onDismiss(alert.id)}
                                        className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
