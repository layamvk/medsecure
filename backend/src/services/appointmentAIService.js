/**
 * Appointment AI Service
 * - Urgency classification using mlClassifier
 * - Groq-powered smart appointment suggestions (recommended doctor, time, priority)
 */
const { analyzeQuery } = require('./mlClassifier');
const Groq = require('groq-sdk');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;
const MODEL = 'llama-3.3-70b-versatile';

// ── Urgency score mapping ──
const URGENCY_SCORE_MAP = { critical: 100, high: 75, medium: 50, low: 25 };

/**
 * Classify the urgency of a symptom description using the ML classifier.
 * Returns { urgencyLevel, urgencyScore, symptomTags, category, severity, recommendAppointment }
 */
function classifyUrgency(symptomDescription) {
    if (!symptomDescription || typeof symptomDescription !== 'string' || symptomDescription.trim().length === 0) {
        return {
            urgencyLevel: 'low',
            urgencyScore: 25,
            symptomTags: [],
            category: 'general_question',
            severity: 'low',
            recommendAppointment: false,
        };
    }

    const analysis = analyzeQuery(symptomDescription);
    const urgencyLevel = analysis.severity || 'low';
    const urgencyScore = URGENCY_SCORE_MAP[urgencyLevel] || 25;

    return {
        urgencyLevel,
        urgencyScore,
        symptomTags: analysis.symptomTags || [],
        category: analysis.category,
        severity: analysis.severity,
        recommendAppointment: analysis.recommendAppointment,
        emergencyDetected: analysis.emergencyDetected,
    };
}

// ── Available departments & time slots for AI suggestion ──
const DEPARTMENTS = [
    'Cardiology', 'Neurology', 'General Medicine', 'Pediatrics',
    'Internal Medicine', 'Emergency', 'Orthopedics', 'Dermatology',
    'Psychiatry', 'Pulmonology', 'Gastroenterology'
];

const DOCTORS_DB = [
    { name: 'Dr. Evelyn Reed', department: 'Cardiology', specialties: ['heart', 'chest pain', 'blood pressure', 'cardiac'] },
    { name: 'Dr. Marcus Thorne', department: 'Neurology', specialties: ['headache', 'migraine', 'seizure', 'dizziness', 'numbness', 'brain'] },
    { name: 'Dr. Julian Hayes', department: 'General Medicine', specialties: ['fever', 'cold', 'flu', 'cough', 'general', 'fatigue'] },
    { name: 'Dr. Lena Petrova', department: 'Pediatrics', specialties: ['child', 'infant', 'pediatric', 'vaccination'] },
    { name: 'Dr. Sarah Jenkins', department: 'Internal Medicine', specialties: ['diabetes', 'thyroid', 'chronic', 'blood test', 'internal'] },
];

/**
 * Generate AI-powered appointment suggestion using Groq LLM.
 * Falls back to rule-based suggestion if Groq is unavailable.
 */
async function generateAppointmentSuggestion(symptomDescription, urgencyData, availableDoctors = null) {
    const doctors = availableDoctors || DOCTORS_DB;
    const urgency = urgencyData || classifyUrgency(symptomDescription);

    // ── Try Groq AI suggestion ──
    if (groq) {
        try {
            const doctorList = doctors.map(d => `${d.name} (${d.department})`).join(', ');
            const prompt = `You are a hospital triage AI. Based on the patient's symptoms, recommend the best appointment setup.

Patient symptoms: "${symptomDescription}"
ML urgency classification: ${urgency.urgencyLevel} (score: ${urgency.urgencyScore}/100)
Detected symptom tags: ${(urgency.symptomTags || []).join(', ') || 'none'}
Category: ${urgency.category}
Emergency detected: ${urgency.emergencyDetected || false}

Available doctors: ${doctorList}

Reply ONLY in valid JSON (no markdown, no explanation):
{
  "recommendedDoctor": "Doctor name from list above",
  "recommendedDepartment": "Department name",
  "recommendedTime": "Suggested time slot like '09:00' or 'ASAP' for critical",
  "priorityScore": number between 1-100,
  "reasoning": "Brief 1-2 sentence explanation"
}`;

            const completion = await groq.chat.completions.create({
                model: MODEL,
                messages: [
                    { role: 'system', content: 'You are a medical triage AI. Respond with valid JSON only. No markdown.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_completion_tokens: 256,
            });

            const raw = completion.choices?.[0]?.message?.content?.trim();
            if (raw) {
                // Parse JSON from response (handle potential markdown wrapping)
                const jsonStr = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                const suggestion = JSON.parse(jsonStr);
                console.log('[AI SUGGEST] Groq suggestion:', JSON.stringify(suggestion));
                return {
                    recommendedDoctor: suggestion.recommendedDoctor || doctors[0]?.name,
                    recommendedDepartment: suggestion.recommendedDepartment || doctors[0]?.department,
                    recommendedTime: suggestion.recommendedTime || '09:00',
                    priorityScore: Math.min(100, Math.max(1, suggestion.priorityScore || urgency.urgencyScore)),
                    reasoning: suggestion.reasoning || 'AI-based recommendation',
                    symptomTags: urgency.symptomTags || [],
                };
            }
        } catch (err) {
            console.error('[AI SUGGEST] Groq error, falling back to rules:', err.message);
        }
    }

    // ── Rule-based fallback ──
    return generateRuleBasedSuggestion(symptomDescription, urgency, doctors);
}

/**
 * Rule-based fallback suggestion when Groq is unavailable.
 */
function generateRuleBasedSuggestion(symptomDescription, urgency, doctors) {
    const text = (symptomDescription || '').toLowerCase();

    // Match doctor by specialty keywords
    let bestDoctor = doctors[2] || doctors[0]; // Default: General Medicine
    let bestScore = 0;

    for (const doc of doctors) {
        if (!doc.specialties) continue;
        let score = 0;
        for (const spec of doc.specialties) {
            if (text.includes(spec)) score += 2;
        }
        if (score > bestScore) {
            bestScore = score;
            bestDoctor = doc;
        }
    }

    // Critical → Emergency, ASAP
    if (urgency.emergencyDetected || urgency.urgencyLevel === 'critical') {
        return {
            recommendedDoctor: bestDoctor.name,
            recommendedDepartment: 'Emergency',
            recommendedTime: 'ASAP',
            priorityScore: 95,
            reasoning: 'Critical symptoms detected — immediate medical attention recommended.',
            symptomTags: urgency.symptomTags || [],
        };
    }

    const timeMap = { high: '09:00', medium: '10:00', low: '14:00' };

    return {
        recommendedDoctor: bestDoctor.name,
        recommendedDepartment: bestDoctor.department,
        recommendedTime: timeMap[urgency.urgencyLevel] || '10:00',
        priorityScore: urgency.urgencyScore,
        reasoning: `Based on symptom analysis: ${urgency.category} (${urgency.urgencyLevel} urgency). Matched to ${bestDoctor.department}.`,
        symptomTags: urgency.symptomTags || [],
    };
}

module.exports = {
    classifyUrgency,
    generateAppointmentSuggestion,
    URGENCY_SCORE_MAP,
};
