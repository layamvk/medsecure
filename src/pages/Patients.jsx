
import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import PatientTable from '../components/PatientTable';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

const Patients = () => {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);

    useEffect(() => {
        api.get('patients').then(res => setPatients(res.data || []));
    }, []);

    const handlePatientClick = (id) => {
        navigate(`/doctor/patients/${id}`);
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Patient Directory</h1>
                    <p className="text-sm text-text-secondary mt-1">Browse and manage all patients under your care.</p>
                </div>
                <div className="w-72">
                     <input
                        type="text"
                        placeholder="Search by name or ID..."
                        className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue transition-all"
                    />
                </div>
            </div>

            <Card className="p-0 overflow-hidden">
                <PatientTable patients={patients} onRowClick={handlePatientClick} />
            </Card>
        </div>
    );
};

export default Patients;
