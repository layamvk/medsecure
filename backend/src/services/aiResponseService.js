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
- You may receive medical image analysis results (X-ray findings, prescription OCR, injury detection, skin condition analysis). Use these to provide contextual guidance.
- For patients: provide safe, non-diagnostic guidance in plain language.
- For doctors: focus on summarizing key patient details and possible considerations, not replacing clinical judgment.
- For admins: focus on system usage, analytics, and configuration, not clinical advice.
- Always explain what could be happening in general terms only.
- Never provide a formal medical diagnosis or prescribe treatment.
- Give practical next steps and clear warning signs.
- If severity is high or critical, advise urgent care and appointment booking.
- When image analysis results are provided, explain the findings in accessible language and relate them to the user's message.
- If image confidence is low, clearly state that the analysis is uncertain and recommend professional evaluation.
- For prescription images, list detected medications and any dosage information, and advise verifying with a pharmacist.
- Keep responses concise, empathetic, and realistic (4-8 sentences).
- Always recommend consulting a medical professional for serious concerns.
- Always include this disclaimer at the end: "This information is for guidance only and does not constitute a medical diagnosis."`;

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

    // ── Build image analysis section ──
    let imageSection = 'Image analysis: no image was provided.';
    if (imageAnalysis && imageAnalysis.imageType) {
        const parts = [`Image type detected: ${imageAnalysis.imageType}`];
        parts.push(`Visual finding: ${imageAnalysis.visualFinding || 'none'}`);
        parts.push(`Image confidence: ${typeof imageAnalysis.confidence === 'number' ? imageAnalysis.confidence : 'n/a'}`);

        if (imageAnalysis.lowConfidence) {
            parts.push('WARNING: Image analysis confidence is LOW — findings are uncertain.');
        }

        // Type-specific details
        if (imageAnalysis.imageType === 'xray' && Array.isArray(imageAnalysis.findings)) {
            parts.push('X-ray findings:');
            imageAnalysis.findings.forEach((f, i) => {
                parts.push(`  ${i + 1}. ${f.finding} (confidence: ${f.confidence}, region: ${f.region || 'n/a'})`);
            });
        } else if (imageAnalysis.imageType === 'prescription') {
            if (imageAnalysis.medications && imageAnalysis.medications.length > 0) {
                parts.push('Medications detected:');
                imageAnalysis.medications.forEach((m) => {
                    parts.push(`  - ${m.name}${m.dosage ? ' (' + m.dosage + ')' : ''}`);
                });
            }
            if (imageAnalysis.dosageSummary) {
                parts.push(`Dosage summary: ${imageAnalysis.dosageSummary}`);
            }
            if (imageAnalysis.instructions && imageAnalysis.instructions.length > 0) {
                parts.push(`Instructions: ${imageAnalysis.instructions.join(', ')}`);
            }
        } else if ((imageAnalysis.imageType === 'injury' || imageAnalysis.imageType === 'skin_condition') && Array.isArray(imageAnalysis.findings)) {
            parts.push(`${imageAnalysis.imageType === 'injury' ? 'Injury' : 'Skin condition'} findings:`);
            imageAnalysis.findings.forEach((f, i) => {
                parts.push(`  ${i + 1}. ${f.finding} (confidence: ${f.confidence})`);
                if (f.indicators && f.indicators.length) {
                    parts.push(`     Indicators: ${f.indicators.join(', ')}`);
                }
            });
        }

        imageSection = parts.join('\n');
    } else if (imageAnalysis && imageAnalysis.visualFinding) {
        // Legacy format compatibility
        imageSection = `Image analysis (if reliable):\n- visual_finding: ${imageAnalysis.visualFinding}\n- confidence: ${typeof imageAnalysis.confidence === 'number' ? imageAnalysis.confidence : 'n/a'}`;
    }

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
1) short interpretation in plain language${imageAnalysis?.imageType ? '\n2) explanation of image analysis findings' : ''}
${imageAnalysis?.imageType ? '3' : '2'}) safe immediate guidance
${imageAnalysis?.imageType ? '4' : '3'}) when to seek care
${imageAnalysis?.imageType ? '5' : '4'}) whether to book an appointment now.
Always end with: "This information is for guidance only and does not constitute a medical diagnosis."`;
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
    if (imageAnalysis?.imageType) {
        console.log('[GROQ] Image analysis:', JSON.stringify({ imageType: imageAnalysis.imageType, finding: imageAnalysis.visualFinding, confidence: imageAnalysis.confidence }));
    }

    // Use more tokens when image analysis is present (richer context to explain)
    const maxTokens = imageAnalysis?.imageType ? 768 : 512;

    const chatCompletion = await groq.chat.completions.create({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_completion_tokens: maxTokens,
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
