const express = require('express');
const multer = require('multer');
const { generateAIResponse } = require('../services/aiResponseService');
const { analyzeQuery } = require('../services/mlClassifier');
const { executeIntent, getRoleContext } = require('../services/intentActionExecutor');
const { addMessage, getHistory, getActiveIntent, setActiveIntent, clearActiveIntent, updateCollectedFields, getSessionMeta } = require('../services/conversationMemory');
const { analyzeImage } = require('../services/imageAnalysisService');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Multer setup for optional symptom image upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB — larger for X-ray / prescription images
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Accepted: JPEG, PNG, WEBP, TIFF.'), false);
    }
  },
});

// Helper: format appointments into a short human summary
// (Kept for backward compat — main logic now in intentActionExecutor)
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

// POST /api/ai/chat — Universal AI Assistant (authenticated)
// Pipeline: ML classify → intent detect → action executor → Groq AI → structured response
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

  console.log('[AI CHAT] ═══════════════════════════════════════');
  console.log('[AI CHAT] Incoming message:', message);

  // Allow image-only submissions
  if (!message && !req.file) {
    return res.status(400).json({ error: 'Message or image is required' });
  }
  if (!message && req.file) {
    message = 'Please analyze this medical image.';
  }

  try {
    const userId = req.user?._id || req.user?.id || 'anonymous';
    const userRole = req.user?.role || 'patient';

    // ─── 1. Conversation Memory: store user message & get session history ───
    addMessage(userId, 'patient', message);
    const memoryHistory = getHistory(userId, 8);
    const sessionMeta = getSessionMeta(userId);

    // Merge frontend history with server memory (prefer server memory)
    const safeHistory = memoryHistory.length > 0
      ? memoryHistory
      : (Array.isArray(parsedHistory)
        ? parsedHistory.filter((item) => item && typeof item.text === 'string' && typeof item.role === 'string').slice(-8)
        : []);

    // ─── 2. ML Classification ──────────────────────────────────────────────
    const mlAnalysis = analyzeQuery(message);
    console.log('[AI CHAT] ML classification:', JSON.stringify({
      intent: mlAnalysis.intent,
      severity: mlAnalysis.severity,
      category: mlAnalysis.category,
      confidence: mlAnalysis.confidence,
    }));

    // ─── 3. Check for active multi-turn intent ────────────────────────────
    const { intent: activeIntent, collectedFields } = getActiveIntent(userId);
    let resolvedIntent = mlAnalysis.intent || 'general_health_question';

    // If there's an active multi-turn flow (e.g., booking), continue it
    // unless the user clearly changed intent
    if (activeIntent && mlAnalysis.intentConfidence < 0.8) {
      resolvedIntent = activeIntent;
      console.log('[AI CHAT] Continuing multi-turn flow:', activeIntent);
    } else if (activeIntent && resolvedIntent !== activeIntent) {
      // User changed intent — clear the old flow
      clearActiveIntent(userId);
      console.log('[AI CHAT] Intent changed from', activeIntent, 'to', resolvedIntent);
    }

    // ─── 4. Optional image analysis ────────────────────────────────────────
    let imageAnalysis = null;
    if (req.file) {
      try {
        imageAnalysis = await analyzeImage(req.file);
        console.log('[AI CHAT] Image analysis:', imageAnalysis?.imageType || 'none');
      } catch (imgErr) {
        console.error('[AI CHAT] Image analysis failed:', imgErr?.message || imgErr);
        imageAnalysis = null;
      }
    }

    // ─── 5. Intent Action Executor ─────────────────────────────────────────
    // When an image is present, skip system actions and go straight to AI
    const hasImage = imageAnalysis && imageAnalysis.imageType;
    let intentResult = { responseText: null, action: null, actionCards: [], needsAI: true, roleContext: getRoleContext(userRole), intent: resolvedIntent };

    if (!hasImage) {
      try {
        intentResult = await executeIntent({
          intent: resolvedIntent,
          message,
          mlAnalysis,
          user: req.user,
          history: safeHistory,
        });
        console.log('[AI CHAT] Intent executor result:', {
          intent: intentResult.intent,
          needsAI: intentResult.needsAI,
          actionCards: intentResult.actionCards.length,
          hasAction: !!intentResult.action,
        });

        // Track multi-turn flows
        if (intentResult.action?.type === 'APPOINTMENT_FLOW') {
          setActiveIntent(userId, 'book_appointment', intentResult.action.missingFields ? {} : {});
        } else if (intentResult.action?.type === 'APPOINTMENT_CREATED') {
          clearActiveIntent(userId);
        }
      } catch (intentErr) {
        console.error('[AI CHAT] Intent executor error:', intentErr?.message);
        intentResult.needsAI = true;
      }
    }

    // ─── 6. Groq AI Response (when needed) ─────────────────────────────────
    let aiResponse = intentResult.responseText;
    let fallbackUsed = false;

    if (intentResult.needsAI || hasImage) {
      try {
        // Build action context for AI
        const actionContext = {
          intent: resolvedIntent,
          actionPerformed: intentResult.action?.type ? `${intentResult.action.type} action` : null,
          actionResult: intentResult.responseText || null,
          activeIntent: activeIntent || null,
          collectedFields: collectedFields || null,
        };

        const groqResponse = await generateAIResponse(
          message,
          mlAnalysis,
          safeHistory,
          userRole,
          imageAnalysis,
          actionContext,
        );

        // If intent executor already has text, combine; otherwise use AI response
        if (aiResponse) {
          aiResponse = `${aiResponse}\n\n${groqResponse}`;
        } else {
          aiResponse = groqResponse;
        }
      } catch (aiErr) {
        console.error('[AI CHAT] Groq AI error:', aiErr?.message || aiErr);
        if (!aiResponse) {
          fallbackUsed = true;
          aiResponse = 'I apologise — I was unable to generate a full response right now. Please try again in a moment.';
        }
      }
    }

    // ─── 7. Store AI response in conversation memory ───────────────────────
    addMessage(userId, 'ai', aiResponse, {
      intent: resolvedIntent,
      severity: mlAnalysis.severity,
    });

    // ─── 8. Build structured response ──────────────────────────────────────
    const recommendAppointment = Boolean(
      mlAnalysis.recommendAppointment ||
      mlAnalysis.severity === 'high' ||
      mlAnalysis.severity === 'critical'
    );

    const responsePayload = {
      // ── Core response ──
      responseText: aiResponse,
      aiResponse,
      response: aiResponse,

      // ── Intent & classification metadata ──
      intent: resolvedIntent,
      intentConfidence: mlAnalysis.intentConfidence,
      category: mlAnalysis.category,
      severity: mlAnalysis.severity,
      confidence: mlAnalysis.confidence,
      recommendedAction: mlAnalysis.recommendedAction,
      recommendAppointment,
      symptomTags: mlAnalysis.symptomTags || [],
      emergencyDetected: mlAnalysis.emergencyDetected || false,
      fallbackUsed,

      // ── System action result ──
      action: intentResult.action,
      actionCards: intentResult.actionCards,

      // ── Conversation session metadata ──
      session: {
        messageCount: sessionMeta?.messageCount || 0,
        activeIntent: sessionMeta?.activeIntent || null,
        historyLength: sessionMeta?.historyLength || 0,
      },

      // ── Role context ──
      roleContext: intentResult.roleContext,

      // ── Rich image analysis fields ──
      imageAnalysis: imageAnalysis || null,
      visualFinding: imageAnalysis?.visualFinding || null,
      visualConfidence: typeof imageAnalysis?.confidence === 'number' ? imageAnalysis.confidence : null,
      imageType: imageAnalysis?.imageType || null,
      imageLowConfidence: imageAnalysis?.lowConfidence || false,
      imageWarning: imageAnalysis?.warning || null,
      imageFindings: imageAnalysis?.findings || null,
      imageMedications: imageAnalysis?.medications || null,
      imageDosageSummary: imageAnalysis?.dosageSummary || null,
      imageInstructions: imageAnalysis?.instructions || null,
      imageDetails: imageAnalysis?.details || null,

      // ── Full classification object ──
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
        intent: resolvedIntent,
        intentConfidence: mlAnalysis.intentConfidence,
        imageAnalysis: imageAnalysis || null,
      },
    };

    console.log('[AI CHAT] Response sent — intent:', resolvedIntent, '| cards:', intentResult.actionCards.length, '| severity:', mlAnalysis.severity);
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
