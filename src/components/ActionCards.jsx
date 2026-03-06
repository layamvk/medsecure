import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarPlus, Clock, MapPin, AlertTriangle, CheckCircle2,
  ChevronRight, Pill, Shield, CreditCard, FileText,
  Stethoscope, Heart, Activity, Building2
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// Appointment Booking Card — interactive form for collecting appointment details
// ═══════════════════════════════════════════════════════════════════════════════
export const AppointmentBookingCard = ({ card, onAction }) => {
  const [dept, setDept] = useState(card.collectedFields?.department || "");
  const [date, setDate] = useState(card.collectedFields?.date || "");
  const [time, setTime] = useState(card.collectedFields?.time || "");

  const departments = card.departments || [
    'General Medicine', 'Cardiology', 'Neurology', 'Pediatrics',
    'Orthopedics', 'Dermatology', 'ENT', 'Ophthalmology',
  ];

  const handleSubmit = () => {
    if (!dept || !date || !time) return;
    const msg = `Book appointment in ${dept} on ${date} at ${time}`;
    onAction?.(msg);
  };

  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/60 p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <CalendarPlus className="w-4 h-4 text-emerald-600" />
        </div>
        <span className="font-semibold text-sm text-emerald-900">{card.title || 'Book an Appointment'}</span>
      </div>

      <div className="space-y-2.5">
        {/* Department */}
        {(!card.collectedFields?.department) && (
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Department</label>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">Select department...</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}

        {/* Date */}
        {(!card.collectedFields?.date) && (
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Date</label>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        )}

        {/* Time */}
        {(!card.collectedFields?.time) && (
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Preferred Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!dept || !date || !time}
          className="w-full mt-1 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          Book Appointment
        </button>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Appointment Confirmed Card
// ═══════════════════════════════════════════════════════════════════════════════
export const AppointmentConfirmedCard = ({ card }) => {
  const appt = card.appointment || {};
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-green-50/60 p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <span className="font-semibold text-sm text-emerald-900">{card.title || 'Appointment Confirmed'}</span>
      </div>

      <div className="space-y-1.5 text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-medium">{appt.department || 'General'}</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarPlus className="w-3.5 h-3.5 text-emerald-500" />
          <span>{appt.date ? new Date(appt.date).toLocaleDateString() : 'Date TBD'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-emerald-500" />
          <span>{appt.time || 'Time TBD'}</span>
        </div>
        {appt.urgencyLevel && appt.urgencyLevel !== 'low' && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span className="capitalize text-amber-700">Priority: {appt.urgencyLevel}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate('/appointments')}
        className="mt-3 w-full px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors flex items-center justify-center gap-1"
      >
        View All Appointments <ChevronRight className="w-3 h-3" />
      </button>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Appointment Suggestion Card — AI recommends booking when severity is high
// ═══════════════════════════════════════════════════════════════════════════════
export const AppointmentSuggestionCard = ({ card, onAction }) => {
  const isCritical = card.severity === 'critical';
  const borderColor = isCritical ? 'border-red-200' : 'border-amber-200';
  const bgGrad = isCritical
    ? 'from-red-50/80 to-rose-50/60'
    : 'from-amber-50/80 to-orange-50/60';
  const iconBg = isCritical ? 'bg-red-100' : 'bg-amber-100';
  const iconColor = isCritical ? 'text-red-600' : 'text-amber-600';
  const textColor = isCritical ? 'text-red-900' : 'text-amber-900';

  const handleBook = () => {
    const dept = card.suggestedDepartment || '';
    const msg = dept
      ? `I'd like to book an appointment in ${dept}`
      : "I'd like to book an appointment";
    onAction?.(msg);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${borderColor} bg-gradient-to-br ${bgGrad} p-4 shadow-sm ${isCritical ? 'animate-pulse' : ''}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          {isCritical ? <AlertTriangle className={`w-4 h-4 ${iconColor}`} /> : <Stethoscope className={`w-4 h-4 ${iconColor}`} />}
        </div>
        <span className={`font-semibold text-sm ${textColor}`}>{card.title}</span>
      </div>

      <p className="text-xs text-slate-700 mb-2">{card.message}</p>

      {card.suggestedDepartment && (
        <p className="text-xs text-slate-600 mb-1">
          <span className="font-medium">Suggested department:</span> {card.suggestedDepartment}
        </p>
      )}
      {card.suggestedTimeframe && (
        <p className="text-xs text-slate-600 mb-2">
          <span className="font-medium">Timeframe:</span> {card.suggestedTimeframe}
        </p>
      )}

      <button
        type="button"
        onClick={handleBook}
        className={`w-full px-4 py-2 text-xs font-semibold rounded-lg text-white transition-colors flex items-center justify-center gap-2 ${isCritical ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
      >
        <CalendarPlus className="w-3.5 h-3.5" />
        {isCritical ? 'Book Urgent Appointment' : 'Book Appointment'}
      </button>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Appointments List Card
// ═══════════════════════════════════════════════════════════════════════════════
export const AppointmentsListCard = ({ card }) => {
  const navigate = useNavigate();
  const appointments = card.appointments || [];

  const urgencyColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-amber-100 text-amber-700';
      case 'medium': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <CalendarPlus className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-semibold text-sm text-blue-900">{card.title || 'Your Appointments'}</span>
        </div>
        {card.total > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
            {card.total} total
          </span>
        )}
      </div>

      {appointments.length === 0 ? (
        <p className="text-xs text-slate-600">No upcoming appointments found.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {appointments.map((appt, i) => (
            <div key={appt.id || i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/80 border border-blue-100 text-xs">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 truncate">
                  {appt.department || 'General'} — {appt.doctorName || 'Doctor'}
                </div>
                <div className="text-slate-500 flex items-center gap-2 mt-0.5">
                  <CalendarPlus className="w-3 h-3" />
                  {appt.date ? new Date(appt.date).toLocaleDateString() : 'TBD'}
                  <Clock className="w-3 h-3 ml-1" />
                  {appt.time || 'TBD'}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${urgencyColor(appt.urgencyLevel)}`}>
                  {appt.urgencyLevel || 'normal'}
                </span>
                <span className="text-[10px] text-slate-400 capitalize">{appt.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate('/appointments')}
        className="mt-3 w-full px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center justify-center gap-1"
      >
        Manage Appointments <ChevronRight className="w-3 h-3" />
      </button>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Medicine Suggestions Card
// ═══════════════════════════════════════════════════════════════════════════════
export const MedicineSuggestionsCard = ({ card }) => {
  const navigate = useNavigate();
  const medicines = card.medicines || [];
  const compact = card.compact || false;

  const typeColor = (type) => {
    switch (type) {
      case 'OTC': return 'bg-emerald-100 text-emerald-700';
      case 'Prescription': return 'bg-violet-100 text-violet-700';
      case 'Supplement': return 'bg-blue-100 text-blue-700';
      case 'Home remedy': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-purple-50/60 p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
          <Pill className="w-4 h-4 text-violet-600" />
        </div>
        <span className="font-semibold text-sm text-violet-900">{card.title || 'Medicine Suggestions'}</span>
        {card.categories?.length > 0 && (
          <span className="text-[10px] text-violet-500">({card.categories.join(', ')})</span>
        )}
      </div>

      {medicines.length === 0 ? (
        <p className="text-xs text-slate-600">Tell me your symptoms and I'll suggest relevant medications.</p>
      ) : (
        <div className={`space-y-2 ${compact ? 'max-h-32' : 'max-h-48'} overflow-y-auto pr-1`}>
          {medicines.map((med, i) => (
            <div key={i} className="px-3 py-2 rounded-lg bg-white/80 border border-violet-100 text-xs">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-medium text-slate-800">{med.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${typeColor(med.type)}`}>
                  {med.type}
                </span>
              </div>
              <div className="text-slate-500">
                <span className="font-medium">Dosage:</span> {med.dosage}
              </div>
              {med.note && <div className="text-slate-400 mt-0.5">{med.note}</div>}
            </div>
          ))}
        </div>
      )}

      {card.disclaimer && (
        <p className="text-[10px] text-violet-500 mt-2 flex items-center gap-1">
          <Shield className="w-3 h-3 flex-shrink-0" />
          {card.disclaimer}
        </p>
      )}

      {card.navigateTarget && !compact && (
        <button
          type="button"
          onClick={() => navigate(card.navigateTarget)}
          className="mt-2 w-full px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors flex items-center justify-center gap-1"
        >
          Open Medicine Store <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Insurance Info Card
// ═══════════════════════════════════════════════════════════════════════════════
export const InsuranceInfoCard = ({ card }) => {
  const navigate = useNavigate();
  const [expandedPlan, setExpandedPlan] = useState(null);
  const plans = card.plans || [];
  const claimSteps = card.claimSteps || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50/80 to-cyan-50/60 p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
          <CreditCard className="w-4 h-4 text-sky-600" />
        </div>
        <span className="font-semibold text-sm text-sky-900">{card.title || 'Insurance Information'}</span>
      </div>

      {/* Plans */}
      {plans.length > 0 && (
        <div className="space-y-2 mb-3">
          {plans.map((plan, i) => (
            <div
              key={i}
              className="rounded-lg bg-white/80 border border-sky-100 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpandedPlan(expandedPlan === i ? null : i)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-sky-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-sky-500" />
                  <span className="font-medium text-slate-800">{plan.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sky-600 font-medium">{plan.coverage} coverage</span>
                  <ChevronRight className={`w-3 h-3 text-slate-400 transition-transform ${expandedPlan === i ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {expandedPlan === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="px-3 pb-2 text-xs space-y-1 border-t border-sky-100"
                >
                  <div className="pt-2 flex gap-4">
                    <span><span className="font-medium">Copay:</span> {plan.copay}</span>
                    <span><span className="font-medium">Deductible:</span> {plan.deductible}</span>
                  </div>
                  {plan.includes?.length > 0 && (
                    <div>
                      <span className="font-medium">Includes:</span>
                      <ul className="list-disc list-inside text-slate-500 mt-0.5">
                        {plan.includes.map((item, j) => (
                          <li key={j}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Claim Steps */}
      {claimSteps.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-sky-800 mb-1 flex items-center gap-1">
            <FileText className="w-3 h-3" /> How to file a claim:
          </p>
          <ol className="list-decimal list-inside text-xs text-slate-600 space-y-0.5">
            {claimSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {card.supportContact && (
        <p className="text-[10px] text-sky-500 mt-1">Support: {card.supportContact}</p>
      )}

      {card.navigateTarget && (
        <button
          type="button"
          onClick={() => navigate(card.navigateTarget)}
          className="mt-2 w-full px-3 py-1.5 text-xs font-medium rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors flex items-center justify-center gap-1"
        >
          Open Insurance Portal <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Card Dispatcher — renders the correct card based on cardType
// ═══════════════════════════════════════════════════════════════════════════════
export const ActionCardRenderer = ({ cards = [], onAction }) => {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="space-y-3 mt-3 ml-1">
      {cards.map((card, idx) => {
        switch (card.cardType) {
          case 'appointment_booking':
            return <AppointmentBookingCard key={idx} card={card} onAction={onAction} />;
          case 'appointment_confirmed':
            return <AppointmentConfirmedCard key={idx} card={card} />;
          case 'appointment_suggestion':
            return <AppointmentSuggestionCard key={idx} card={card} onAction={onAction} />;
          case 'appointments_list':
            return <AppointmentsListCard key={idx} card={card} />;
          case 'medicine_suggestions':
            return <MedicineSuggestionsCard key={idx} card={card} />;
          case 'insurance_info':
            return <InsuranceInfoCard key={idx} card={card} />;
          default:
            return null;
        }
      })}
    </div>
  );
};

export default ActionCardRenderer;
