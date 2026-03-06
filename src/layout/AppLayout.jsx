import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import PrivacyBudgetBar from '../components/security/PrivacyBudgetBar';
import RiskAlertBanner from '../components/RiskAlertBanner';
import { useEffect, useState } from 'react';
import api from '../api/axiosConfig';

const Orbs = () => (
  <>
    <div className="fixed top-0 left-0 w-1/2 h-1/2 bg-accent-purple/20 rounded-full filter blur-[150px] opacity-40 animate-[spin_20s_linear_infinite] -translate-x-1/4 -translate-y-1/4" />
    <div className="fixed bottom-0 right-0 w-1/2 h-1/2 bg-accent-blue/20 rounded-full filter blur-[150px] opacity-40 animate-[spin_25s_linear_infinite_reverse] translate-x-1/4 translate-y-1/4" />
  </>
);

const AppLayout = () => {
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    useEffect(() => {
        const fetchThreat = async () => {
            try {
                const res = await api.get('security/threat/');
                const threat = res.data[0]?.score ?? 0;
                if (threat > 80) {
                    setShowAlert(true);
                    setAlertMessage('System is in high-alert mode. MFA required for writes.');
                } else {
                    setShowAlert(false);
                }
            } catch (e) {
                console.error('Error fetching threat score', e);
            }
        };
        fetchThreat();
        const interval = setInterval(fetchThreat, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen w-full bg-primary text-text-primary font-sans flex">
            <Orbs />
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0">
                <Topbar />
                <main className="flex-1 p-6 overflow-y-auto">
                    {showAlert && <RiskAlertBanner message={alertMessage} />}
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
