/**
 * Intent Action Executor
 * Maps detected intents from the ML classifier to concrete system actions.
 * Returns structured actionCards for the frontend to render interactive UI.
 *
 * Supported intents:
 *   symptom_query       → AI symptom analysis + optional appointment suggestion
 *   book_appointment    → Collect details / create appointment via controller
 *   check_appointment   → Fetch & summarise user appointments
 *   buy_medicine        → Medicine suggestion card with common OTC options
 *   insurance_info      → Insurance information panel
 *   general_health_question → Pure AI response (no system action)
 */

const { getAppointmentsForUser, bookAppointmentForUser } = require('../controllers/appointmentController');
const { classifyUrgency, generateAppointmentSuggestion } = require('./appointmentAIService');

// ─── Medicine knowledge base (common OTC + guidance) ────────────────────────
const MEDICINE_DATABASE = {
  fever: [
    { name: 'Paracetamol (Acetaminophen)', dosage: '500mg every 4-6 hours', type: 'OTC', note: 'Do not exceed 4g/day' },
    { name: 'Ibuprofen', dosage: '200-400mg every 6-8 hours', type: 'OTC', note: 'Take with food' },
  ],
  headache: [
    { name: 'Paracetamol', dosage: '500-1000mg every 4-6 hours', type: 'OTC', note: 'First-line for tension headaches' },
    { name: 'Ibuprofen', dosage: '200-400mg every 6-8 hours', type: 'OTC', note: 'Anti-inflammatory' },
    { name: 'Aspirin', dosage: '300-900mg every 4-6 hours', type: 'OTC', note: 'Not for under 16s' },
  ],
  cough: [
    { name: 'Dextromethorphan syrup', dosage: '10-20mg every 4 hours', type: 'OTC', note: 'Dry cough relief' },
    { name: 'Guaifenesin', dosage: '200-400mg every 4 hours', type: 'OTC', note: 'Expectorant for productive cough' },
    { name: 'Honey & lemon', dosage: '1 tablespoon in warm water', type: 'Home remedy', note: 'Soothes throat' },
  ],
  cold: [
    { name: 'Pseudoephedrine', dosage: '60mg every 4-6 hours', type: 'OTC', note: 'Decongestant' },
    { name: 'Chlorpheniramine', dosage: '4mg every 4-6 hours', type: 'OTC', note: 'Antihistamine for runny nose' },
    { name: 'Vitamin C', dosage: '500-1000mg daily', type: 'Supplement', note: 'Immune support' },
  ],
  pain: [
    { name: 'Ibuprofen', dosage: '200-400mg every 6-8 hours', type: 'OTC', note: 'Anti-inflammatory painkiller' },
    { name: 'Paracetamol', dosage: '500-1000mg every 4-6 hours', type: 'OTC', note: 'General pain relief' },
    { name: 'Diclofenac gel', dosage: 'Apply 2-4 times daily', type: 'OTC', note: 'Topical for joint/muscle pain' },
  ],
  nausea: [
    { name: 'Ondansetron', dosage: '4-8mg as needed', type: 'Prescription', note: 'Anti-nausea; consult doctor' },
    { name: 'Ginger tea', dosage: '1-2 cups', type: 'Home remedy', note: 'Natural anti-nausea' },
    { name: 'Dimenhydrinate', dosage: '50mg every 4-6 hours', type: 'OTC', note: 'Motion sickness / nausea' },
  ],
  allergy: [
    { name: 'Cetirizine', dosage: '10mg once daily', type: 'OTC', note: 'Non-drowsy antihistamine' },
    { name: 'Loratadine', dosage: '10mg once daily', type: 'OTC', note: 'Non-drowsy; good for hay fever' },
    { name: 'Diphenhydramine', dosage: '25-50mg every 6-8 hours', type: 'OTC', note: 'May cause drowsiness' },
  ],
  diarrhea: [
    { name: 'Loperamide', dosage: '2mg after each loose stool', type: 'OTC', note: 'Max 16mg/day' },
    { name: 'ORS (Oral Rehydration Salts)', dosage: 'As directed on packet', type: 'OTC', note: 'Prevent dehydration' },
  ],
  insomnia: [
    { name: 'Melatonin', dosage: '1-5mg before bedtime', type: 'Supplement', note: 'Short-term use' },
    { name: 'Diphenhydramine', dosage: '25-50mg at bedtime', type: 'OTC', note: 'May cause grogginess' },
  ],
};

// ─── Insurance knowledge base ───────────────────────────────────────────────
const INSURANCE_INFO = {
  plans: [
    { name: 'MedSecure Basic', coverage: '70%', copay: '$25', deductible: '$1,500/year', includes: ['General consultations', 'Emergency care', 'Lab tests'] },
    { name: 'MedSecure Plus', coverage: '85%', copay: '$15', deductible: '$750/year', includes: ['All Basic benefits', 'Specialist visits', 'Prescription drugs', 'Mental health'] },
    { name: 'MedSecure Premium', coverage: '95%', copay: '$5', deductible: '$250/year', includes: ['All Plus benefits', 'Dental & Vision', 'Wellness programs', 'Telehealth unlimited'] },
  ],
  claimSteps: [
    'Visit the Insurance section in your dashboard',
    'Click "File a Claim" and upload supporting documents',
    'Claims are reviewed within 5-7 business days',
    'Approved claims are credited to your account or paid to the provider',
  ],
  supportContact: 'insurance@medsecure.com | 1-800-MED-SURE',
};

// ─── Department list for appointment booking ────────────────────────────────
const DEPARTMENTS = [
  'General Medicine', 'Cardiology', 'Neurology', 'Pediatrics',
  'Orthopedics', 'Dermatology', 'ENT', 'Ophthalmology',
  'Gynecology', 'Psychiatry', 'Oncology', 'Urology',
];

// ─── Helper: summarise appointments ─────────────────────────────────────────
const summariseAppointments = (appointments = []) => {
  if (!appointments.length) {
    return 'You have no upcoming appointments in the system.';
  }
  const lines = appointments.slice(0, 5).map((appt) => {
    const doctorName = appt.doctorName || (appt.doctorId && (appt.doctorId.fullName || `${appt.doctorId.firstName || ''} ${appt.doctorId.lastName || ''}`.trim())) || 'Assigned doctor';
    const date = appt.date ? new Date(appt.date).toLocaleDateString() : 'Unknown date';
    const time = appt.time || 'time to be confirmed';
    const department = appt.department || 'General';
    const status = appt.status || 'scheduled';
    return `• ${date} at ${time} with ${doctorName} (${department}) — ${status}`;
  });
  return `Here are your upcoming appointments:\n${lines.join('\n')}`;
};

// ─── Helper: extract appointment details from message + history ──────────────
const extractAppointmentDetails = (message, history = []) => {
  const combined = [
    ...history.filter((h) => h && h.role === 'patient' && typeof h.text === 'string').map((h) => h.text),
    message,
  ].join(' ').toLowerCase();

  const departments = DEPARTMENTS.map(d => d.toLowerCase());
  let department = null;
  for (const dept of departments) {
    if (combined.includes(dept)) {
      department = DEPARTMENTS[departments.indexOf(dept)];
      break;
    }
  }

  let dateMatch = combined.match(/(\d{4}-\d{2}-\d{2})/);
  let date;
  if (dateMatch) {
    date = dateMatch[1];
  } else if (combined.includes('tomorrow')) {
    const d = new Date(); d.setDate(d.getDate() + 1);
    date = d.toISOString().slice(0, 10);
  } else if (combined.includes('today')) {
    date = new Date().toISOString().slice(0, 10);
  }

  let timeMatch = combined.match(/\b(\d{1,2}:\d{2})\b/);
  let time = timeMatch ? timeMatch[1] : undefined;
  if (!time) {
    const alt = combined.match(/\b(\d{1,2})\s?(am|pm)\b/);
    if (alt) {
      let hour = parseInt(alt[1], 10);
      const suffix = alt[2];
      if (suffix === 'pm' && hour < 12) hour += 12;
      if (suffix === 'am' && hour === 12) hour = 0;
      time = `${hour.toString().padStart(2, '0')}:00`;
    }
  }

  const missingFields = [];
  if (!department) missingFields.push('department');
  if (!date) missingFields.push('date');
  if (!time) missingFields.push('time');

  return { department, date, time, missingFields, isComplete: missingFields.length === 0 };
};

// ─── Helper: match symptoms to medicine suggestions ─────────────────────────
const findMedicineSuggestions = (message, symptomTags = []) => {
  const text = message.toLowerCase();
  const matched = new Set();

  // Check symptom tags from ML classifier first
  for (const tag of symptomTags) {
    const lower = tag.toLowerCase();
    for (const key of Object.keys(MEDICINE_DATABASE)) {
      if (lower.includes(key) || key.includes(lower)) {
        matched.add(key);
      }
    }
  }

  // Also scan message directly
  for (const key of Object.keys(MEDICINE_DATABASE)) {
    if (text.includes(key)) {
      matched.add(key);
    }
  }

  // Gather all matched medicines
  const medicines = [];
  const categories = [];
  for (const key of matched) {
    categories.push(key);
    medicines.push(...MEDICINE_DATABASE[key]);
  }

  // Deduplicate by name
  const seen = new Set();
  const unique = medicines.filter((m) => {
    if (seen.has(m.name)) return false;
    seen.add(m.name);
    return true;
  });

  return { medicines: unique.slice(0, 6), categories, hasResults: unique.length > 0 };
};

// ─── Role-specific response hints ───────────────────────────────────────────
const getRoleContext = (role) => {
  switch (role) {
    case 'doctor':
      return {
        capabilities: ['View patient queries', 'AI-powered clinical suggestions', 'Priority queue', 'Patient history'],
        tone: 'clinical',
      };
    case 'nurse':
      return {
        capabilities: ['Patient vitals', 'Triage assistance', 'Appointment management', 'Medication tracking'],
        tone: 'supportive',
      };
    case 'admin':
      return {
        capabilities: ['System analytics', 'User management', 'Audit logs', 'Configuration'],
        tone: 'operational',
      };
    case 'receptionist':
      return {
        capabilities: ['Appointment scheduling', 'Patient check-in', 'Queue management', 'Contact details'],
        tone: 'professional',
      };
    default: // patient
      return {
        capabilities: ['Symptom analysis', 'Appointment booking', 'Medicine info', 'Insurance details', 'Medical history'],
        tone: 'empathetic',
      };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN: Execute an intent-driven action
// Returns { responseText, action, actionCards[], needsAI }
// When needsAI is true, the caller should also generate an AI text response.
// ═══════════════════════════════════════════════════════════════════════════════

async function executeIntent({ intent, message, mlAnalysis, user, history = [] }) {
  const userRole = user?.role || 'patient';
  const roleContext = getRoleContext(userRole);
  const actionCards = [];
  let responseText = null;
  let action = null;
  let needsAI = false;

  switch (intent) {
    // ── CHECK APPOINTMENTS ──────────────────────────────────────────────────
    case 'check_appointment': {
      const appointments = await getAppointmentsForUser(user);
      responseText = summariseAppointments(appointments);
      action = { type: 'SHOW_APPOINTMENTS', appointments };
      actionCards.push({
        cardType: 'appointments_list',
        title: 'Your Appointments',
        appointments: appointments.slice(0, 5).map((a) => ({
          id: a._id,
          date: a.date,
          time: a.time || 'TBD',
          department: a.department || 'General',
          doctorName: a.doctorName || 'Assigned doctor',
          status: a.status || 'scheduled',
          urgencyLevel: a.urgencyLevel || 'low',
        })),
        total: appointments.length,
      });
      break;
    }

    // ── BOOK APPOINTMENT ────────────────────────────────────────────────────
    case 'book_appointment': {
      const details = extractAppointmentDetails(message, history);

      if (!details.isComplete) {
        responseText = `I'd love to help you book an appointment! I still need a few details:\n${details.missingFields.map(f => `• **${f}**`).join('\n')}\n\nPlease provide the missing information and I'll book it for you right away.`;
        action = { type: 'APPOINTMENT_FLOW', stage: 'collect_info', missingFields: details.missingFields };
        actionCards.push({
          cardType: 'appointment_booking',
          title: 'Book an Appointment',
          missingFields: details.missingFields,
          collectedFields: {
            department: details.department || null,
            date: details.date || null,
            time: details.time || null,
          },
          departments: DEPARTMENTS,
          interactive: true,
        });
      } else {
        // All details present → create appointment
        const payload = {
          doctorName: `${details.department} clinic`,
          department: details.department,
          date: details.date,
          time: details.time,
          reason: message,
          symptomDescription: message,
        };

        try {
          const result = await bookAppointmentForUser(user, payload);
          responseText = `Great news! Your appointment has been booked:\n• **Department:** ${details.department}\n• **Date:** ${details.date}\n• **Time:** ${details.time}\n\nYou'll find it in your appointments list. I'll remind you before the visit.`;
          action = { type: 'APPOINTMENT_CREATED', appointment: result.appointment };
          actionCards.push({
            cardType: 'appointment_confirmed',
            title: 'Appointment Confirmed',
            appointment: {
              id: result.appointment._id,
              department: details.department,
              date: details.date,
              time: details.time,
              status: 'scheduled',
              urgencyLevel: result.urgency?.urgencyLevel || 'low',
            },
          });
        } catch (bookErr) {
          console.error('[INTENT EXECUTOR] Appointment booking failed:', bookErr?.message);
          responseText = 'I tried to book your appointment but encountered an issue. Please try again or visit the Appointments page directly.';
          action = { type: 'NAVIGATE', target: '/appointments', reason: 'booking_failed' };
        }
      }
      break;
    }

    // ── BUY MEDICINE ────────────────────────────────────────────────────────
    case 'buy_medicine': {
      const { medicines, categories, hasResults } = findMedicineSuggestions(message, mlAnalysis.symptomTags);

      if (hasResults) {
        responseText = `Based on your symptoms${categories.length ? ` (${categories.join(', ')})` : ''}, here are some commonly recommended options. Always consult your doctor or pharmacist before starting any medication.`;
        actionCards.push({
          cardType: 'medicine_suggestions',
          title: 'Medicine Suggestions',
          medicines,
          categories,
          disclaimer: 'These are general OTC suggestions. Always consult a healthcare professional before use.',
          navigateTarget: '/medicine-store',
        });
      } else {
        responseText = 'I can help you with medicines. Let me open the medicine store where you can browse available medications based on your prescription.';
        actionCards.push({
          cardType: 'medicine_suggestions',
          title: 'Medicine Store',
          medicines: [],
          categories: [],
          disclaimer: 'Please describe your symptoms so I can suggest relevant medications.',
          navigateTarget: '/medicine-store',
        });
      }
      action = { type: 'NAVIGATE', target: '/medicine-store', reason: 'buy_medicine' };
      break;
    }

    // ── INSURANCE INFO ──────────────────────────────────────────────────────
    case 'insurance_info': {
      responseText = 'Here is an overview of the insurance plans available through MedSecure. You can view your specific coverage and file claims in the Insurance section.';
      action = { type: 'NAVIGATE', target: '/insurance', reason: 'insurance_info' };
      actionCards.push({
        cardType: 'insurance_info',
        title: 'Insurance Information',
        plans: INSURANCE_INFO.plans,
        claimSteps: INSURANCE_INFO.claimSteps,
        supportContact: INSURANCE_INFO.supportContact,
        navigateTarget: '/insurance',
      });
      break;
    }

    // ── SYMPTOM QUERY ───────────────────────────────────────────────────────
    case 'symptom_query': {
      needsAI = true; // Let Groq generate the main response

      // If severity is high/critical → suggest appointment
      const severity = mlAnalysis.severity || 'low';
      const shouldSuggestAppointment = severity === 'high' || severity === 'critical' || mlAnalysis.recommendAppointment;

      if (shouldSuggestAppointment) {
        // Get AI appointment suggestion
        let aiSuggestion = null;
        try {
          aiSuggestion = await generateAppointmentSuggestion(message, classifyUrgency(message));
        } catch (_e) { /* AI suggestion optional */ }

        actionCards.push({
          cardType: 'appointment_suggestion',
          title: severity === 'critical' ? 'Urgent: Book Appointment Now' : 'Recommended: Book an Appointment',
          severity,
          urgencyLevel: severity,
          message: severity === 'critical'
            ? 'Your symptoms may require immediate medical attention. Please book an appointment or visit the emergency room.'
            : 'Based on your symptoms, we recommend scheduling a medical consultation.',
          suggestedDepartment: aiSuggestion?.department || null,
          suggestedTimeframe: severity === 'critical' ? 'Immediately' : 'Within 24-48 hours',
          departments: DEPARTMENTS,
          interactive: true,
        });
      }

      // Also provide medicine suggestions if relevant symptom tags found
      const { medicines, categories, hasResults } = findMedicineSuggestions(message, mlAnalysis.symptomTags);
      if (hasResults) {
        actionCards.push({
          cardType: 'medicine_suggestions',
          title: 'Related Medications',
          medicines: medicines.slice(0, 4),
          categories,
          disclaimer: 'These are general suggestions. Consult your doctor before use.',
          compact: true,
        });
      }
      break;
    }

    // ── GENERAL HEALTH QUESTION ─────────────────────────────────────────────
    case 'general_health_question':
    default: {
      needsAI = true; // Let Groq handle it
      break;
    }
  }

  return {
    responseText,
    action,
    actionCards,
    needsAI,
    roleContext,
    intent,
  };
}

module.exports = {
  executeIntent,
  DEPARTMENTS,
  INSURANCE_INFO,
  MEDICINE_DATABASE,
  getRoleContext,
  findMedicineSuggestions,
  summariseAppointments,
  extractAppointmentDetails,
};
