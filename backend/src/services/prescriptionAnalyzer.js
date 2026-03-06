/**
 * Prescription Analysis Module
 * Uses Tesseract.js OCR to extract text from prescription images,
 * then parses structured medication data (names, dosages, instructions).
 */

const Tesseract = require('tesseract.js');

/** Common medication name patterns (generic + brand) */
const KNOWN_MEDICATIONS = [
  'amoxicillin', 'paracetamol', 'acetaminophen', 'ibuprofen', 'aspirin',
  'metformin', 'amlodipine', 'atorvastatin', 'lisinopril', 'omeprazole',
  'losartan', 'gabapentin', 'sertraline', 'metoprolol', 'albuterol',
  'prednisone', 'levothyroxine', 'azithromycin', 'ciprofloxacin', 'cephalexin',
  'doxycycline', 'clindamycin', 'hydrochlorothiazide', 'furosemide', 'warfarin',
  'insulin', 'montelukast', 'cetirizine', 'loratadine', 'ranitidine',
  'pantoprazole', 'clopidogrel', 'diazepam', 'alprazolam', 'tramadol',
  'codeine', 'morphine', 'naproxen', 'meloxicam', 'diclofenac',
  'fluconazole', 'metronidazole', 'acyclovir', 'hydroxychloroquine',
  'prednisolone', 'betamethasone', 'salbutamol', 'atenolol', 'captopril',
];

/**
 * Dosage pattern: number + unit (mg, ml, mcg, g, iu, units, %, etc.)
 * Also captures frequency phrases.
 */
const DOSAGE_REGEX = /(\d+(?:\.\d+)?)\s*(mg|ml|mcg|µg|g|iu|units?|%|cc|tab(?:let)?s?|cap(?:sule)?s?)/gi;
const FREQUENCY_REGEX = /(?:once|twice|thrice|one|two|three|four|\d)\s*(?:time[s]?\s*)?(?:daily|a day|per day|times? daily|times? a day|hourly|weekly|every\s+\d+\s*(?:hours?|hrs?))/gi;
const INSTRUCTION_REGEX = /(?:before|after|with)\s+(?:meals?|food|breakfast|lunch|dinner|bedtime|sleep)|on\s+empty\s+stomach|as\s+needed|as\s+directed|do\s+not\s+crush|take\s+with\s+water/gi;

/**
 * Run OCR on a preprocessed prescription image and parse medications.
 *
 * @param {Buffer} processedBuffer – Preprocessed PNG buffer
 * @param {object} metadata – From imagePreprocessor
 * @returns {Promise<{imageType: string, rawText: string, medications: Array, dosages: Array, instructions: Array, confidence: number}>}
 */
async function analyzePrescription(processedBuffer, metadata) {
  console.log('[PRESCRIPTION-OCR] Starting Tesseract OCR…');
  const start = Date.now();

  let rawText = '';
  let ocrConfidence = 0;

  try {
    const result = await Tesseract.recognize(processedBuffer, 'eng', {
      logger: () => {},  // silence progress logs
    });

    rawText = (result.data?.text || '').trim();
    ocrConfidence = (result.data?.confidence || 0) / 100; // normalise to 0-1
  } catch (err) {
    console.error('[PRESCRIPTION-OCR] Tesseract error:', err?.message || err);
    return {
      imageType: 'prescription',
      rawText: '',
      medications: [],
      dosages: [],
      instructions: [],
      confidence: 0,
      error: 'OCR processing failed',
    };
  }

  const elapsed = Date.now() - start;
  console.log(`[PRESCRIPTION-OCR] OCR completed in ${elapsed}ms – extracted ${rawText.length} chars (confidence: ${(ocrConfidence * 100).toFixed(0)}%)`);

  // ── Extract medications ──
  const textLower = rawText.toLowerCase();
  const medications = [];
  for (const med of KNOWN_MEDICATIONS) {
    if (textLower.includes(med)) {
      // Try to find the dosage right after the medication name
      const idx = textLower.indexOf(med);
      const nearby = rawText.substring(idx, idx + 80);
      const dosageMatch = nearby.match(DOSAGE_REGEX);
      medications.push({
        name: med.charAt(0).toUpperCase() + med.slice(1),
        dosage: dosageMatch ? dosageMatch[0] : null,
      });
    }
  }

  // ── Extract dosages overall ──
  const dosages = [...new Set((rawText.match(DOSAGE_REGEX) || []).map((d) => d.trim()))];

  // ── Extract frequency / instructions ──
  const frequencies = [...new Set((rawText.match(FREQUENCY_REGEX) || []).map((f) => f.trim().toLowerCase()))];
  const instructions = [...new Set((rawText.match(INSTRUCTION_REGEX) || []).map((i) => i.trim().toLowerCase()))];

  // Build a combined dosage/instruction summary
  const dosageSummary = dosages.length
    ? dosages.join(', ') + (frequencies.length ? ` — ${frequencies.join(', ')}` : '')
    : frequencies.length
      ? frequencies.join(', ')
      : null;

  const confidence = parseFloat(
    Math.min(
      ocrConfidence * 0.6 + (medications.length > 0 ? 0.25 : 0) + (dosages.length > 0 ? 0.15 : 0),
      0.95
    ).toFixed(2)
  );

  return {
    imageType: 'prescription',
    rawText: rawText.substring(0, 2000), // cap for safety
    medications: medications.slice(0, 15),
    dosages,
    dosageSummary,
    instructions: [...instructions, ...frequencies],
    confidence,
  };
}

module.exports = { analyzePrescription };
