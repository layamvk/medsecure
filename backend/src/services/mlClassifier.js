/**
 * ML Classifier Service
 * Hybrid keyword + weighted scoring triage for healthcare chat.
 * Outputs triage fields required by AI prompting and UI rendering.
 */

const CATEGORY_KEYWORDS = {
    emergency: {
        keywords: [
            'chest pain', 'heart attack', 'difficulty breathing', 'cant breathe',
            'cannot breathe', 'severe bleeding', 'blood loss', 'unconscious',
            'loss of consciousness', 'stroke', 'face drooping', 'paralysis',
            'seizure', 'anaphylaxis', 'choking', 'suicidal', 'suicide',
        ],
        weight: 12,
    },
    symptoms: {
        keywords: [
            'fever', 'temperature', 'cough', 'cold', 'flu', 'headache', 'migraine',
            'nausea', 'vomiting', 'dizziness', 'fatigue', 'tired', 'sore throat',
            'runny nose', 'shortness of breath', 'breathless', 'diarrhea', 'pain',
            'abdominal pain', 'back pain', 'stomach pain', 'rash', 'swelling',
        ],
        weight: 7,
    },
    medication: {
        keywords: [
            'medicine', 'medication', 'drug', 'pill', 'tablet', 'capsule',
            'prescription', 'refill', 'dosage', 'dose', 'side effect', 'allergy',
            'antibiotic', 'ibuprofen', 'paracetamol', 'insulin', 'metformin',
            'missed dose', 'pharmacy',
        ],
        weight: 7,
    },
    general_question: {
        keywords: [
            'appointment', 'schedule', 'reschedule', 'book', 'booking', 'visit',
            'consultation', 'follow up', 'availability', 'time slot',
            'bill', 'billing', 'insurance', 'payment', 'claim', 'cost',
            'question', 'advice', 'guidance', 'help', 'what should i do',
        ],
        weight: 5,
    },
};

const SEVERITY_SIGNALS = {
    critical: [
        'chest pain', 'cannot breathe', 'cant breathe', 'difficulty breathing',
        'severe bleeding', 'unconscious', 'stroke', 'seizure', 'anaphylaxis',
        'suicidal', 'suicide', 'call ambulance', '911',
    ],
    high: [
        'severe', 'unbearable', 'very bad', 'high fever', 'vomiting blood',
        'blood in stool', 'blood in urine', 'rapid heartbeat', 'chest tightness',
        'sudden', 'worsening', 'getting worse',
    ],
    medium: [
        'moderate', 'persistent', 'for a few days', 'several days',
        'concerned', 'worried', 'not improving', 'recurring', 'dizziness',
        'nausea', 'vomiting', 'fever', 'headache',
    ],
    low: [
        'mild', 'slight', 'minor', 'occasional', 'quick question',
        'general question',
    ],
};

const RECOMMENDED_ACTION_MAP = {
    low: 'self care',
    medium: 'monitor symptoms',
    high: 'schedule appointment',
    critical: 'urgent medical attention',
};

const PRIORITY_MAP = {
    critical: 'critical',
    high: 'urgent',
    medium: 'normal',
    low: 'normal',
};

// Intent keyword map for high-level assistant actions
const INTENT_KEYWORDS = {
    symptom_query: [
        'i have', 'i am having', 'i feel', 'i am feeling',
        'pain', 'fever', 'cough', 'cold', 'headache', 'vomiting', 'dizzy',
    ],
    book_appointment: [
        'book appointment', 'book an appointment', 'schedule appointment',
        'schedule a visit', 'see a doctor', 'need an appointment',
        'make an appointment', 'consultation', 'follow up appointment',
    ],
    check_appointment: [
        'my appointments', 'what appointments', 'upcoming appointments',
        'next appointment', 'do i have an appointment', 'when is my appointment',
    ],
    buy_medicine: [
        'buy medicine', 'order medicine', 'order drugs', 'medicine store',
        'pharmacy', 'refill', 'refill prescription',
    ],
    insurance_info: [
        'insurance', 'coverage', 'policy', 'copay', 'co-pay', 'claim',
        'reimbursement', 'insurance information', 'health plan',
    ],
    general_health_question: [
        'question', 'advice', 'guidance', 'help', 'what should i do',
    ],
};

const normalise = (text) => text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

const scoreCategories = (text) => {
    const normalised = normalise(text);
    const scores = {};
    const matchedTags = new Set();

    for (const [category, { keywords, weight }] of Object.entries(CATEGORY_KEYWORDS)) {
        let score = 0;
        let matchCount = 0;

        for (const keyword of keywords) {
            if (normalised.includes(keyword)) {
                score += keyword.includes(' ') ? weight * 2 : weight;
                matchCount += 1;
                matchedTags.add(keyword);
            }
        }

        scores[category] = {
            rawScore: score,
            matchCount,
            normScore: keywords.length ? score / keywords.length : 0,
        };
    }

    return { scores, matchedTags: Array.from(matchedTags).slice(0, 6) };
};

const detectSeverity = (text) => {
    const normalised = normalise(text);
    const levels = ['critical', 'high', 'medium', 'low'];

    for (const level of levels) {
        for (const signal of SEVERITY_SIGNALS[level]) {
            if (normalised.includes(signal)) {
                return level;
            }
        }
    }

    return 'low';
};

const computeConfidence = (scores, topCategory) => {
    const total = Object.values(scores).reduce((sum, entry) => sum + entry.rawScore, 0);
    if (!total) return 0.55;

    const topScore = scores[topCategory]?.rawScore || 0;
    const ratio = topScore / total;
    return Math.min(0.99, Math.max(0.55, Number((0.55 + ratio * 0.44).toFixed(2))));
};

// Lightweight intent detection layered on top of category + raw text
const detectIntent = (queryText, category) => {
    const text = normalise(queryText);

    let bestIntent = 'general_health_question';
    let bestScore = 0;

    for (const [intent, phrases] of Object.entries(INTENT_KEYWORDS)) {
        let score = 0;
        for (const phrase of phrases) {
            if (text.includes(phrase)) {
                score += phrase.split(' ').length >= 2 ? 2 : 1;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestIntent = intent;
        }
    }

    // If no strong phrase match, fall back from category
    if (bestScore === 0) {
        if (category === 'symptoms' || category === 'emergency') {
            bestIntent = 'symptom_query';
        } else if (category === 'medication') {
            bestIntent = 'buy_medicine';
        } else if (category === 'general_question') {
            bestIntent = 'general_health_question';
        }
    }

    // Coarse intent confidence used mainly for UI branching
    const intentConfidence = bestScore >= 3 ? 0.9 : bestScore === 2 ? 0.78 : 0.65;

    return { intent: bestIntent, intentConfidence };
};

const analyzeQuery = (queryText) => {
    if (!queryText || typeof queryText !== 'string') {
        return {
            category: 'general_question',
            severity: 'low',
            confidence: 0.55,
            recommended_action: 'self care',
            recommendedAction: 'self care',
            recommendAppointment: false,
            priority: 'normal',
            urgency: 'low',
            emergencyDetected: false,
            symptomTags: [],
            breakdown: { scores: {} },
        };
    }

    const { scores, matchedTags } = scoreCategories(queryText);
    const severity = detectSeverity(queryText);

    const topCategory = Object.entries(scores)
        .sort((a, b) => b[1].rawScore - a[1].rawScore)[0]?.[0] || 'general_question';

    const category = severity === 'critical' ? 'emergency' : topCategory;
    const confidence = computeConfidence(scores, topCategory);
    const { intent, intentConfidence } = detectIntent(queryText, category);
    const recommendedAction = RECOMMENDED_ACTION_MAP[severity] || 'monitor symptoms';
    const recommendAppointment = severity === 'high' || severity === 'critical' || category === 'symptoms';
    const emergencyDetected = severity === 'critical' || category === 'emergency';

    return {
        category,
        severity,
        confidence,
        intent,
        intentConfidence,
        recommended_action: recommendedAction,
        recommendedAction,
        recommendAppointment,
        symptomTags: matchedTags,
        priority: PRIORITY_MAP[severity] || 'normal',
        urgency: severity,
        emergencyDetected,
        breakdown: {
            scores: Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, value.rawScore])),
        },
    };
};

module.exports = { analyzeQuery };
