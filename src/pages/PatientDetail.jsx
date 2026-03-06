import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import SensitivityBadge from '../components/SensitivityBadge';
import RiskAlertBanner from '../components/RiskAlertBanner';
import StepUpModal from '../components/auth/StepUpModal';
import { useAuth } from '../context/AuthContext';
import { Lock, ArrowLeft, Unlock, ShieldAlert } from 'lucide-react';

const PATIENT_RECORDS = {
    '1': {
        id: '1', name: 'Marcus Sterling', age: 45, displayId: 'PT-8932', sensitivity: 'High',
        basicInfo: { dob: '1979-05-12', bloodType: 'O+', gender: 'Male' },
        medicalHistory: 'Hypertension, Type 2 Diabetes',
        diagnosis: 'Acute Coronary Syndrome',
        restrictedData: {
            psychiatricNotes: 'Patient experiencing severe anxiety and paranoia episodes. Prescribed Lorazepam.',
            hivStatus: 'Negative'
        },
        privacyCost: 15
    },
    '2': {
        id: '2', name: 'Elena Rostova', age: 32, displayId: 'PT-1049', sensitivity: 'Medium',
        basicInfo: { dob: '1992-11-20', bloodType: 'A-', gender: 'Female' },
        medicalHistory: 'Asthma, Migraines',
        diagnosis: 'Severe Allergic Reaction',
        restrictedData: null,
        privacyCost: 5
    }
};

const PatientDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { privacyBudget, setPrivacyBudget } = useAuth();

    const record = PATIENT_RECORDS[id] || PATIENT_RECORDS['2'];
    const isHighRisk = record.sensitivity === 'High';

    const [isUnlocked, setIsUnlocked] = useState(!isHighRisk);
    const [showOTP, setShowOTP] = useState(false);
    const [error, setError] = useState('');

    const handleUnlockRequest = () => {
        if (privacyBudget.current + record.privacyCost > privacyBudget.max) {
            setError('Privacy budget exceeded. Cannot access this high-sensitivity data.');
            return;
        }
        setShowOTP(true);
    };

    const handleVerify = (code) => {
        if (code === '123456') {
            setIsUnlocked(true);
            setShowOTP(false);
            setPrivacyBudget(prev => ({ ...prev, current: prev.current + record.privacyCost }));
            setError('');
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header section */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2.5 bg-white/5 rounded-lg text-text-secondary hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold text-white">{record.name}</h1>
                        <SensitivityBadge level={record.sensitivity} />
                    </div>
                    <p className="text-sm text-text-secondary mt-1">Patient ID: {record.displayId}  ·  Age: {record.age}</p>
                </div>
            </div>

            {error && <RiskAlertBanner show={true} message={error} />}

            {isHighRisk && !isUnlocked && !error && (
                <RiskAlertBanner
                    show={true}
                    message={`This record contains restricted data. Re-authentication is required to unlock. Privacy Budget Cost: ${record.privacyCost} units.`}
                />
            )}

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Basic Info */}
                    <Card title="Patient Information">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 py-2">
                            <div>
                                <p className="text-sm font-medium text-text-secondary">Date of Birth</p>
                                <p className="text-base font-semibold text-white mt-1">{record.basicInfo?.dob}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-text-secondary">Blood Type</p>
                                <p className="text-base font-semibold text-white mt-1">{record.basicInfo?.bloodType}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-text-secondary">Gender</p>
                                <p className="text-base font-semibold text-white mt-1">{record.basicInfo?.gender}</p>
                            </div>
                        </div>
                    </Card>
                    <Card title="Medical Overview">
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-text-secondary">Known Medical History</p>
                                <p className="text-base font-semibold text-white mt-1">{record.medicalHistory}</p>
                            </div>
                             <div>
                                <p className="text-sm font-medium text-text-secondary">Current Diagnosis</p>
                                <p className="text-base font-semibold text-white mt-1">{record.diagnosis}</p>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-1">
                    <Card title="Restricted Data" className="relative h-full">
                        {!isUnlocked ? (
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-md flex flex-col items-center justify-center rounded-xl z-10">
                                <Lock className="w-12 h-12 text-white/50 mb-4" />
                                <h3 className="text-lg font-bold text-white">Content Locked</h3>
                                <p className="text-text-secondary text-sm mb-6">Elevated privileges required.</p>
                                <button onClick={handleUnlockRequest} className="glass-button flex items-center gap-2 px-6 py-3">
                                    <Unlock className="w-4 h-4" />
                                    <span>Unlock Record</span>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 h-full flex flex-col justify-center">
                                <div>
                                    <p className="text-sm font-medium text-text-secondary flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-400"/> Psychiatric Notes</p>
                                    <p className="text-base font-semibold text-white mt-1">{record.restrictedData?.psychiatricNotes}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-text-secondary">HIV Status</p>
                                    <p className="text-base font-semibold text-white mt-1">{record.restrictedData?.hivStatus}</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
            <StepUpModal isOpen={showOTP} onClose={() => setShowOTP(false)} onVerify={handleVerify} />
        </div>
    );
};

export default PatientDetail;
