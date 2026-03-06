import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, User, Plus, CheckCircle, X, Building2, Stethoscope, Brain, Zap, AlertTriangle, Activity, Sparkles } from "lucide-react";
import api from "../api/axiosConfig";
import toast from "react-hot-toast";
import { useRealTimeAppointments } from "../hooks/useSocket";
import CriticalAlertBanner from "../components/CriticalAlertBanner";

const FALLBACK_DOCTORS = [
  { _id: 'doc-1', firstName: 'Evelyn', lastName: 'Reed', department: 'Cardiology' },
  { _id: 'doc-2', firstName: 'Marcus', lastName: 'Thorne', department: 'Neurology' },
  { _id: 'doc-3', firstName: 'Julian', lastName: 'Hayes', department: 'General Medicine' },
  { _id: 'doc-4', firstName: 'Lena', lastName: 'Petrova', department: 'Pediatrics' },
  { _id: 'doc-5', firstName: 'Sarah', lastName: 'Jenkins', department: 'Internal Medicine' },
];

const AppointmentBooking = () => {
  const [doctors, setDoctors] = useState([]);
  const [initialAppointments, setInitialAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [bookSuccess, setBookSuccess] = useState(false);

  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [symptomDescription, setSymptomDescription] = useState('');

  // AI suggestion state
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [urgencyData, setUrgencyData] = useState(null);

  // Real-time Socket.IO hook
  const { appointments, setAppointments, criticalAlerts, clearAlert } = useRealTimeAppointments(initialAppointments);

  // Load doctors and existing appointments
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docRes, apptRes] = await Promise.all([
          api.get('/appointments/doctors').catch(() => ({ data: FALLBACK_DOCTORS })),
          api.get('/appointments').catch(() => ({ data: [] }))
        ]);
        const docList = docRes.data?.length > 0 ? docRes.data : FALLBACK_DOCTORS;
        setDoctors(docList);
        setSelectedDoctor(docList[0] ? `${docList[0].firstName} ${docList[0].lastName}` : '');
        setAppointments(apptRes.data || []);
        setInitialAppointments(apptRes.data || []);
      } catch {
        setDoctors(FALLBACK_DOCTORS);
        setSelectedDoctor('Dr. Evelyn Reed');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch AI suggestion when symptoms change (debounced)
  useEffect(() => {
    if (!symptomDescription || symptomDescription.trim().length < 5) {
      setAiSuggestion(null);
      setUrgencyData(null);
      return;
    }
    const timer = setTimeout(async () => {
      setAiLoading(true);
      try {
        const res = await api.post('/appointments/suggest', { symptomDescription });
        if (res.data?.suggestion) {
          setAiSuggestion(res.data.suggestion);
          setUrgencyData(res.data.urgency);
        }
      } catch {
        // Silently fail — suggestion is optional
        setAiSuggestion(null);
      } finally {
        setAiLoading(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [symptomDescription]);

  // Accept AI suggestion
  const acceptSuggestion = () => {
    if (!aiSuggestion) return;
    // Find matching doctor
    const suggestedName = aiSuggestion.recommendedDoctor?.replace(/^Dr\.\s*/, '') || '';
    const matchDoc = doctors.find(d => `${d.firstName} ${d.lastName}` === suggestedName || aiSuggestion.recommendedDoctor?.includes(d.lastName));
    if (matchDoc) {
      setSelectedDoctor(`${matchDoc.firstName} ${matchDoc.lastName}`);
    }
    if (aiSuggestion.recommendedTime && aiSuggestion.recommendedTime !== 'ASAP') {
      setTime(aiSuggestion.recommendedTime);
    }
    toast.success('AI suggestion applied!');
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedDoctor || !date || !time) return;

    const doc = doctors.find(d => `${d.firstName} ${d.lastName}` === selectedDoctor);
    const doctorName = doc ? `Dr. ${doc.firstName} ${doc.lastName}` : selectedDoctor;
    const department = doc?.department || 'General';

    setBooking(true);
    try {
      const res = await api.post('/appointments', {
        doctorName,
        department,
        date,
        time,
        reason,
        symptomDescription,
        doctorId: doc?._id || null
      });

      const newAppt = res.data?.appointment || {
        _id: Date.now().toString(),
        doctorName,
        department,
        date,
        time,
        reason,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      };

      setAppointments(prev => [newAppt, ...prev]);
      setBookSuccess(true);
      toast.success('Appointment booked successfully!');

      setTimeout(() => {
        setDate('');
        setTime('');
        setReason('');
        setSymptomDescription('');
        setAiSuggestion(null);
        setUrgencyData(null);
        setBookSuccess(false);
      }, 2000);
    } catch (err) {
      // Fallback: add locally for demo
      const localAppt = {
        _id: Date.now().toString(),
        doctorName: `Dr. ${selectedDoctor}`,
        department: doc?.department || 'General',
        date,
        time,
        reason,
        symptomDescription,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      };
      setAppointments(prev => [localAppt, ...prev]);
      setBookSuccess(true);
      toast.success('Appointment booked (demo mode)');
      setTimeout(() => {
        setDate('');
        setTime('');
        setReason('');
        setSymptomDescription('');
        setAiSuggestion(null);
        setUrgencyData(null);
        setBookSuccess(false);
      }, 2000);
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async (apptId) => {
    try {
      await api.delete(`/appointments/${apptId}`);
      setAppointments(prev => prev.map(a => a._id === apptId ? { ...a, status: 'cancelled' } : a));
      toast.success('Appointment cancelled');
    } catch {
      setAppointments(prev => prev.map(a => a._id === apptId ? { ...a, status: 'cancelled' } : a));
      toast.success('Appointment cancelled (demo)');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'scheduled': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'confirmed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'in-progress': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'completed': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'cancelled': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getUrgencyColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 py-8 px-6">
      {/* Critical Alert Banner */}
      <CriticalAlertBanner alerts={criticalAlerts} onDismiss={clearAlert} />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Appointments</h1>
          <p className="text-slate-500 mt-1">Book and manage your medical appointments</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 shadow-lg overflow-hidden">
              <div className="px-6 py-5 bg-gradient-to-r from-emerald-50/80 to-blue-50/50 border-b border-white/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Plus className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">New Appointment</h2>
                    <p className="text-xs text-slate-500">Select doctor, date & time</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleBook} className="p-6 space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                    <Stethoscope className="w-3.5 h-3.5 inline mr-1" />
                    Select Doctor
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                  >
                    {doctors.map((doc, idx) => (
                      <option key={doc._id || idx} value={`${doc.firstName} ${doc.lastName}`}>
                        Dr. {doc.firstName} {doc.lastName} — {doc.department}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    Time
                  </label>
                  <input
                    type="time"
                    className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                    Reason (optional)
                  </label>
                  <textarea
                    rows="2"
                    className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Brief description of visit..."
                  />
                </div>

                {/* Symptom Description for AI analysis */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                    <Brain className="w-3.5 h-3.5 inline mr-1" />
                    Describe Symptoms (AI Analysis)
                  </label>
                  <textarea
                    rows="3"
                    className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all resize-none"
                    value={symptomDescription}
                    onChange={(e) => setSymptomDescription(e.target.value)}
                    placeholder="Describe your symptoms for AI-powered doctor recommendation..."
                  />
                  {aiLoading && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-violet-600">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      AI analyzing symptoms...
                    </div>
                  )}
                </div>

                {/* AI Suggestion Panel */}
                <AnimatePresence>
                  {aiSuggestion && !aiLoading && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-200/60 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-violet-600" />
                            <span className="text-xs font-bold text-violet-700 uppercase tracking-wider">AI Recommendation</span>
                          </div>
                          {urgencyData && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getUrgencyColor(urgencyData.urgencyLevel)}`}>
                              {urgencyData.urgencyLevel?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-3.5 h-3.5 text-violet-500" />
                            <span className="text-slate-700"><strong>Doctor:</strong> {aiSuggestion.recommendedDoctor}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-violet-500" />
                            <span className="text-slate-700"><strong>Dept:</strong> {aiSuggestion.recommendedDepartment}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-violet-500" />
                            <span className="text-slate-700"><strong>Time:</strong> {aiSuggestion.recommendedTime}</span>
                          </div>
                          {aiSuggestion.reasoning && (
                            <p className="text-xs text-slate-500 italic mt-1">{aiSuggestion.reasoning}</p>
                          )}
                          {urgencyData?.symptomTags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {urgencyData.symptomTags.map((tag, i) => (
                                <span key={i} className="text-[10px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-medium">{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={acceptSuggestion}
                          className="w-full py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Accept AI Suggestion
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {bookSuccess ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Booked!
                    </motion.div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={booking || !date || !time}
                      className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                        booking || !date || !time
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25'
                      }`}
                    >
                      {booking ? 'Booking...' : 'Book Appointment'}
                    </motion.button>
                  )}
                </AnimatePresence>
              </form>
            </div>
          </motion.div>

          {/* Appointments List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Your Appointments</h2>
              <span className="text-sm text-slate-500">{appointments.filter(a => a.status !== 'cancelled').length} upcoming</span>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 p-6 animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-200 rounded-2xl"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-slate-200 rounded-lg w-1/3 mb-2"></div>
                        <div className="h-4 bg-slate-200 rounded-lg w-1/4"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 shadow-lg"
              >
                <div className="w-16 h-16 bg-slate-100 rounded-3xl mx-auto mb-4 flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 text-lg">No appointments yet</p>
                <p className="text-slate-400 text-sm mt-1">Book your first appointment using the form</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {appointments.map((appt, idx) => (
                    <motion.div
                      key={appt._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.01, boxShadow: '0 20px 50px rgba(0,0,0,0.08)' }}
                      className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 p-6 shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                            <User className="w-7 h-7 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{appt.doctorName}</p>
                            <p className="text-sm text-slate-500 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5" />
                              {appt.department}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-4">
                          <div>
                            <p className="font-semibold text-slate-800">
                              {new Date(appt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-sm text-slate-500">{appt.time}</p>
                          </div>
                          <span className={`px-3 py-1.5 text-xs font-semibold rounded-xl border capitalize ${getStatusColor(appt.status)}`}>
                            {appt.status}
                          </span>
                          {appt.urgencyLevel && appt.urgencyLevel !== 'low' && (
                            <span className={`px-2 py-1 text-[10px] font-bold rounded-lg ${getUrgencyColor(appt.urgencyLevel)}`}>
                              {appt.urgencyLevel === 'critical' && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
                              {appt.urgencyLevel.toUpperCase()}
                            </span>
                          )}
                          {appt.status === 'scheduled' && (
                            <button
                              onClick={() => handleCancel(appt._id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="Cancel appointment"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      {appt.reason && (
                        <p className="mt-3 text-sm text-slate-500 bg-slate-50/80 rounded-xl px-4 py-2">{appt.reason}</p>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentBooking;
