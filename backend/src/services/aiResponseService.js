// aiResponseService.js
// Groq LLM integration for healthcare query response generation
const Groq = require('groq-sdk');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
    console.error('[AI SERVICE] GROQ_API_KEY is missing. Set it in backend/.env');
}

const groq = new Groq({ apiKey: GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a healthcare AI assistant embedded in a hospital SaaS platform called MedSecure.
- You see the user's role (patient, doctor, admin) and must adapt your tone and focus.
- You may receive image analysis results (but not raw images).
- For patients: provide safe, non-diagnostic guidance in plain language.
- For doctors: focus on summarizing key patient details and possible considerations, not replacing clinical judgment.
- For admins: focus on system usage, analytics, and configuration, not clinical advice.
- Always explain what could be happening in general terms only.
- Never provide a formal medical diagnosis or prescribe treatment.
- Give practical next steps and clear warning signs.
- If severity is high or critical, advise urgent care and appointment booking.
- Keep responses concise, empathetic, and realistic (4-7 sentences).
- Always recommend consulting a medical professional for serious concerns.`;

const MODEL = 'llama-3.3-70b-versatile';

const buildConversationHistory = (history = []) => {
    if (!Array.isArray(history) || history.length === 0) {
        return [];
    }

    return history.slice(-6).map((entry) => ({
        role: entry?.role === 'ai' ? 'assistant' : 'user',
        content: (entry?.text || '').toString().trim(),
    }));
};

const buildUserPrompt = (queryText, mlAnalysis, history = [], userRole = 'patient', imageAnalysis = null) => {
    const {
        category,
        severity,
        confidence,
        recommendedAction,
        symptomTags,
        recommendAppointment,
        intent,
        intentConfidence,
    } = mlAnalysis;

    const imageSection = imageAnalysis && imageAnalysis.visualFinding
        ? `Image analysis (if reliable):\n- visual_finding: ${imageAnalysis.visualFinding}\n- confidence: ${typeof imageAnalysis.confidence === 'number' ? imageAnalysis.confidence : 'n/a'}`
        : 'Image analysis: no image was provided.';

    return `Patient message: "${queryText}"

User context:
- role: ${userRole}

${imageSection}

ML classification:
- intent: ${intent || 'general_health_question'} (confidence: ${intentConfidence ?? 'n/a'})
- category: ${category}
- severity: ${severity}
- confidence: ${confidence}
- recommended_action: ${recommendedAction}
- symptom_tags: ${(symptomTags || []).join(', ') || 'none'}
- recommend_appointment: ${recommendAppointment}

Task:
Provide a dynamic, patient-specific response with:
1) short interpretation in plain language
2) safe immediate guidance
3) when to seek care
4) whether to book an appointment now.`;
};

/**
 * Generates a professional healthcare response using the Groq LLM, guided by ML analysis.
 * @param {string} queryText - The patient's query
 * @param {object} mlAnalysis - { category, severity, confidence, recommendedAction, intent }
 * @param {Array<{role: string, text: string}>} history - Recent chat history
 * @param {string} userRole - Role of the current user (patient, doctor, admin, etc.)
 * @param {{visualFinding: string|null, confidence: number}|null} imageAnalysis - Optional image-derived finding
 * @returns {Promise<string>} - AI-generated response
 */
async function generateAIResponse(queryText, mlAnalysis, history = [], userRole = 'patient', imageAnalysis = null) {
    const userPrompt = buildUserPrompt(queryText, mlAnalysis, history, userRole, imageAnalysis);
    const conversationHistory = buildConversationHistory(history);

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory,
        { role: 'user', content: userPrompt },
    ];

    console.log('[GROQ] ========== GROQ API REQUEST ==========');
    console.log('[GROQ] Model:', MODEL);
    console.log('[GROQ] User message:', queryText);
    console.log('[GROQ] ML analysis:', JSON.stringify({ category: mlAnalysis.category, severity: mlAnalysis.severity, intent: mlAnalysis.intent }));

    const chatCompletion = await groq.chat.completions.create({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_completion_tokens: 512,
        top_p: 0.9,
    });

    const responseText = chatCompletion.choices?.[0]?.message?.content?.trim();

    console.log('[GROQ] ========== GROQ API RESPONSE ==========');
    console.log('[GROQ] Response received successfully');
    console.log('[GROQ] Response length:', responseText?.length || 0);
    console.log('[GROQ] Token usage:', JSON.stringify(chatCompletion.usage || {}));
    console.log('[GROQ] Response preview:', (responseText || '').substring(0, 200));

    if (!responseText) {
        throw new Error('Groq returned empty response content');
    }

    return responseText;
}

module.exports = { generateAIResponse };
