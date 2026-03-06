const express = require('express');
const multer = require('multer');
const { generateAIResponse } = require('../services/aiResponseService');
const { analyzeQuery } = require('../services/mlClassifier');
const { getAppointmentsForUser, bookAppointmentForUser } = require('../controllers/appointmentController');
const { analyzeImage } = require('../services/imageAnalysisService');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Multer setup for optional symptom image upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Helper: format appointments into a short human summary
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

// Helper: very simple extraction of appointment details from text/history
const extractAppointmentDetails = (message, history = []) => {
  const combined = [
    ...history.filter((h) => h && h.role === 'patient' && typeof h.text === 'string').map((h) => h.text),
    message,
  ]
    .join(' ') // single text
    .toLowerCase();

  // Department keywords
  const departments = ['cardiology', 'neurology', 'pediatrics', 'general medicine', 'internal medicine'];
  let department = departments.find((d) => combined.includes(d));

  // Date: simple ISO-like pattern or today/tomorrow
  let dateMatch = combined.match(/(\d{4}-\d{2}-\d{2})/);
  let date;
  if (dateMatch) {
    date = dateMatch[1];
  } else if (combined.includes('tomorrow')) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    date = d.toISOString().slice(0, 10);
  } else if (combined.includes('today')) {
    const d = new Date();
    date = d.toISOString().slice(0, 10);
  }

  // Time: HH:MM 24h or mentions like "10am"
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

  return {
    department,
    date,
    time,
    missingFields,
    isComplete: missingFields.length === 0,
  };
};

// POST /api/ai/chat — General AI chat (authenticated)
// Accepts JSON or multipart/form-data with optional image field `image`.
router.post('/chat', protect, upload.single('image'), async (req, res) => {
  let { message, history } = req.body || {};

  // History may come as JSON string when using multipart/form-data
  let parsedHistory = [];
  if (typeof history === 'string') {
    try {
      const tmp = JSON.parse(history);
      if (Array.isArray(tmp)) parsedHistory = tmp;
    } catch (_) {
      parsedHistory = [];
    }
  } else if (Array.isArray(history)) {
    parsedHistory = history;
  }

  console.log('AI /chat incoming message:', message);

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // 1. Run ML classifier
    const mlAnalysis = analyzeQuery(message);
    console.log('AI /chat ML classification:', mlAnalysis);

    const safeHistory = Array.isArray(parsedHistory)
      ? parsedHistory.filter((item) => item && typeof item.text === 'string' && typeof item.role === 'string').slice(-8)
      : [];

    const userRole = req.user?.role || 'patient';

    // Optional image analysis
    let imageAnalysis = null;
    if (req.file) {
      try {
        imageAnalysis = await analyzeImage(req.file);
        console.log('AI /chat image analysis:', imageAnalysis);
      } catch (imgErr) {
        console.error('Image analysis failed:', imgErr?.message || imgErr);
        imageAnalysis = null;
      }
    }

    // 2. Decide intent-driven system action or AI response
    const intent = mlAnalysis.intent || 'general_health_question';
    let aiResponse;
    let action = null;
    let fallbackUsed = false;

    try {
      if (intent === 'check_appointment') {
        const appointments = await getAppointmentsForUser(req.user);
        aiResponse = summariseAppointments(appointments);
        action = { type: 'SHOW_APPOINTMENTS', appointments };
      } else if (intent === 'book_appointment') {
        const details = extractAppointmentDetails(message, safeHistory);
        if (!details.isComplete) {
          aiResponse = 'I can help you book an appointment. Please tell me the department (for example, Cardiology), the date (YYYY-MM-DD), and your preferred time (HH:MM).';
          action = {
            type: 'APPOINTMENT_FLOW',
            stage: 'collect_info',
            missingFields: details.missingFields,
          };
        } else {
          // Use a generic doctor name when none is given; staff can refine later.
          const payload = {
            doctorName: `${details.department} clinic`,
            department: details.department,
            date: details.date,
            time: details.time,
            reason: message,
          };
          const result = await bookAppointmentForUser(req.user, payload);
          aiResponse = `Your appointment has been booked with the ${details.department} clinic on ${details.date} at ${details.time}. You will see it in your appointments list.`;
          action = { type: 'APPOINTMENT_CREATED', appointment: result.appointment };
        }
      } else if (intent === 'buy_medicine') {
        aiResponse = 'I can help you with medicines. I will open the medicine store where you can review and request medications recommended by your clinician.';
        action = { type: 'NAVIGATE', target: '/medicine-store', reason: 'buy_medicine' };
      } else if (intent === 'insurance_info') {
        aiResponse = 'You can review your insurance and billing details in the Insurance section. I will open the relevant page so you can check coverage and recent claims.';
        action = { type: 'NAVIGATE', target: '/insurance', reason: 'insurance_info' };
      } else {
        // Symptom/general health questions go through Groq AI
        aiResponse = await generateAIResponse(message, mlAnalysis, safeHistory, userRole, imageAnalysis);
      }
    } catch (err) {
      console.error('[AI ROUTE] Error in intent/action handling:', err?.message || err);
      return res.status(502).json({
        error: 'AI response generation failed. Please try again.',
        details: err?.message || 'Unknown error',
        classification: {
          category: mlAnalysis.category,
          severity: mlAnalysis.severity,
          confidence: mlAnalysis.confidence,
        },
      });
    }

    const recommendAppointment = Boolean(mlAnalysis.recommendAppointment || mlAnalysis.severity === 'high' || mlAnalysis.severity === 'critical');

    const responsePayload = {
      responseText: aiResponse,
      aiResponse,
      response: aiResponse,
      intent,
      category: mlAnalysis.category,
      severity: mlAnalysis.severity,
      confidence: mlAnalysis.confidence,
      recommendedAction: mlAnalysis.recommendedAction,
      recommendAppointment,
      symptomTags: mlAnalysis.symptomTags || [],
      fallbackUsed,
      action,
      imageAnalysis,
      visualFinding: imageAnalysis?.visualFinding || null,
      visualConfidence: typeof imageAnalysis?.confidence === 'number' ? imageAnalysis.confidence : null,
      classification: {
        category: mlAnalysis.category,
        severity: mlAnalysis.severity,
        priority: mlAnalysis.priority,
        urgency: mlAnalysis.urgency,
        confidence: mlAnalysis.confidence,
        emergencyDetected: mlAnalysis.emergencyDetected,
        recommended_action: mlAnalysis.recommended_action,
        recommendAppointment,
        symptomTags: mlAnalysis.symptomTags || [],
        intent,
        intentConfidence: mlAnalysis.intentConfidence,
        imageAnalysis,
      },
    };

    res.json(responsePayload);
  } catch (error) {
    console.error('Error in AI chat endpoint:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// POST /api/ai/generate-response — Full ML+AI pipeline for query triage
router.post('/generate-response', protect, async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // 1. ML classification
    const mlAnalysis = analyzeQuery(message);
    console.log('AI /generate-response ML classification:', mlAnalysis);

    const safeHistory = Array.isArray(history)
      ? history.filter((item) => item && typeof item.text === 'string' && typeof item.role === 'string').slice(-8)
      : [];

    const userRole = req.user?.role || 'patient';

    // 2. AI draft response (Groq LLM — no fallback templates)
    let aiSuggestion;
    let fallbackUsed = false;
    try {
      aiSuggestion = await generateAIResponse(message, mlAnalysis, safeHistory, userRole);
    } catch (aiErr) {
      console.error('[AI ROUTE] Groq AI call failed:', aiErr?.message || aiErr);
      return res.status(502).json({
        error: 'AI response generation failed. Please try again.',
        details: aiErr?.message || 'Unknown error',
        classification: {
          category: mlAnalysis.category,
          severity: mlAnalysis.severity,
          confidence: mlAnalysis.confidence,
        },
      });
    }

    const recommendAppointment = Boolean(mlAnalysis.recommendAppointment || mlAnalysis.severity === 'high' || mlAnalysis.severity === 'critical');

    res.json({
      success: true,
      category: mlAnalysis.category,
      severity: mlAnalysis.severity,
      priority: mlAnalysis.priority,
      urgency: mlAnalysis.urgency,
      confidence: mlAnalysis.confidence,
      emergencyDetected: mlAnalysis.emergencyDetected,
      recommendedAction: mlAnalysis.recommendedAction,
      intent: mlAnalysis.intent,
      intentConfidence: mlAnalysis.intentConfidence,
      recommendAppointment,
      symptomTags: mlAnalysis.symptomTags || [],
      aiSuggestion,
      fallbackUsed,
      breakdown: mlAnalysis.breakdown
    });
  } catch (error) {
    console.error('Error in AI generate-response:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

module.exports = router;
