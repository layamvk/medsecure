import { useEffect, useRef, useCallback, useState } from 'react';
import { socket, reconnectSocket } from '../services/socket';

/**
 * useSocket — React hook for real-time Socket.IO event subscriptions.
 * Automatically subscribes on mount and cleans up on unmount.
 *
 * @param {string} event — Socket event name (e.g. 'appointment:created')
 * @param {Function} handler — Callback receiving the event payload
 * @param {boolean} [enabled=true] — Toggle listener on/off
 */
export function useSocket(event, handler, enabled = true) {
    const savedHandler = useRef(handler);

    useEffect(() => {
        savedHandler.current = handler;
    }, [handler]);

    useEffect(() => {
        if (!enabled || !event) return;

        const listener = (data) => savedHandler.current(data);
        socket.on(event, listener);

        return () => {
            socket.off(event, listener);
        };
    }, [event, enabled]);
}

/**
 * useSocketReconnect — Reconnects the socket with a fresh auth token.
 * Call this after login/token refresh.
 */
export function useSocketReconnect() {
    return useCallback(() => {
        reconnectSocket();
    }, []);
}

/**
 * useRealTimeAppointments — Composite hook that tracks real-time appointment events.
 * Returns { appointments, criticalAlerts, clearAlert }.
 */
export function useRealTimeAppointments(initialAppointments = []) {
    const [appointments, setAppointments] = useState(initialAppointments);
    const [criticalAlerts, setCriticalAlerts] = useState([]);

    // Sync with prop changes
    useEffect(() => {
        setAppointments(initialAppointments);
    }, [initialAppointments]);

    // New appointment created
    useSocket('appointment:created', (payload) => {
        setAppointments((prev) => {
            const exists = prev.some(a => a._id === payload.appointment?._id);
            if (exists) return prev;
            return [payload.appointment, ...prev];
        });
    });

    // Appointment updated (status change, etc.)
    useSocket('appointment:updated', (payload) => {
        setAppointments((prev) =>
            prev.map(a => a._id === payload.appointment?._id ? { ...a, ...payload.appointment } : a)
        );
    });

    // Critical alert
    useSocket('critical:alert', (payload) => {
        setCriticalAlerts((prev) => [
            { ...payload, id: Date.now() + Math.random() },
            ...prev.slice(0, 9), // keep last 10
        ]);
    });

    const clearAlert = useCallback((alertId) => {
        setCriticalAlerts((prev) => prev.filter(a => a.id !== alertId));
    }, []);

    return { appointments, setAppointments, criticalAlerts, clearAlert };
}

export default useSocket;
