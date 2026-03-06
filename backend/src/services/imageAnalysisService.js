/**
 * Image Analysis Service — Orchestrator
 *
 * Pipeline:
 *   1. Preprocess image (resize, normalise, denoise)
 *   2. Detect image type (xray | prescription | injury | skin_condition | unknown)
 *   3. Route to specialised analyser module
 *   4. Return unified result consumed by aiResponseService + AI routes
 */

const { preprocessImage } = require('./imagePreprocessor');
const { detectImageType } = require('./imageTypeDetector');
const { analyzeXray } = require('./xrayAnalyzer');
const { analyzePrescription } = require('./prescriptionAnalyzer');
const { analyzeInjury } = require('./injuryAnalyzer');
const { analyzeSkinCondition } = require('./skinConditionAnalyzer');

const LOW_CONFIDENCE_THRESHOLD = 0.40;

/**
 * Full medical-image analysis pipeline.
 *
 * @param {Express.Multer.File} file – Uploaded file (memory storage, buffer in file.buffer)
 * @returns {Promise<object>} – Unified analysis result
 */
async function analyzeImage(file) {
  if (!file || !file.buffer) {
    return {
      imageType: null,
      visualFinding: null,
      confidence: 0,
      lowConfidence: true,
      findings: [],
      details: null,
    };
  }

  const originalName = file.originalname || '';
  console.log(`[IMAGE-ANALYSIS] Starting pipeline for "${originalName}" (${(file.size / 1024).toFixed(1)} KB)`);

  // ── Step 1: Preprocess ──
  let processed, metadata;
  try {
    ({ processed, metadata } = await preprocessImage(file.buffer, 'default'));
    console.log('[IMAGE-ANALYSIS] Preprocessing complete:', JSON.stringify(metadata));
  } catch (err) {
    console.error('[IMAGE-ANALYSIS] Preprocessing failed:', err?.message || err);
    return {
      imageType: 'unknown',
      visualFinding: 'image could not be processed',
      confidence: 0,
      lowConfidence: true,
      findings: [],
      details: null,
      error: err?.message,
    };
  }

  // ── Step 2: Detect type ──
  let typeResult;
  try {
    typeResult = await detectImageType(processed, metadata, originalName);
    console.log('[IMAGE-ANALYSIS] Type detected:', typeResult.imageType, `(${typeResult.confidence})`);
  } catch (err) {
    console.error('[IMAGE-ANALYSIS] Type detection failed:', err?.message || err);
    typeResult = { imageType: 'unknown', confidence: 0, scores: {} };
  }

  // Re-preprocess with correct pipeline hint if needed
  if (typeResult.imageType !== 'unknown' && typeResult.imageType !== 'default') {
    try {
      ({ processed, metadata } = await preprocessImage(file.buffer, typeResult.imageType === 'skin_condition' ? 'skin' : typeResult.imageType));
    } catch (_) { /* keep original preprocessing */ }
  }

  // ── Step 3: Route to specialised analyser ──
  let analysisResult;
  try {
    switch (typeResult.imageType) {
      case 'xray':
        analysisResult = await analyzeXray(processed, metadata);
        break;
      case 'prescription':
        analysisResult = await analyzePrescription(processed, metadata);
        break;
      case 'injury':
        analysisResult = await analyzeInjury(processed, metadata);
        break;
      case 'skin_condition':
        analysisResult = await analyzeSkinCondition(processed, metadata);
        break;
      default:
        // Run injury analyser as generic fallback (covers widest range)
        analysisResult = await analyzeInjury(processed, metadata);
        analysisResult.imageType = 'unknown';
        break;
    }
    console.log('[IMAGE-ANALYSIS] Analysis complete:', analysisResult.imageType, '—', analysisResult.primaryFinding || analysisResult.medications?.length + ' meds');
  } catch (err) {
    console.error('[IMAGE-ANALYSIS] Analysis module error:', err?.message || err);
    analysisResult = {
      imageType: typeResult.imageType,
      primaryFinding: 'analysis could not be completed',
      confidence: 0,
      findings: [],
    };
  }

  // ── Step 4: Build unified result ──
  const confidence = analysisResult.confidence || typeResult.confidence || 0;
  const lowConfidence = confidence < LOW_CONFIDENCE_THRESHOLD;

  // Build a human-readable visualFinding summary for the LLM & UI
  let visualFinding;
  if (analysisResult.imageType === 'prescription') {
    const medNames = (analysisResult.medications || []).map((m) => m.name).join(', ');
    visualFinding = medNames
      ? `Prescription detected — medications found: ${medNames}`
      : 'Prescription detected — could not extract medication names';
    if (analysisResult.dosageSummary) {
      visualFinding += ` (${analysisResult.dosageSummary})`;
    }
  } else {
    visualFinding = analysisResult.primaryFinding || 'analysis inconclusive';
  }

  const unified = {
    imageType: analysisResult.imageType || typeResult.imageType || 'unknown',
    visualFinding,
    confidence,
    lowConfidence,
    findings: analysisResult.findings || [],
    medications: analysisResult.medications || null,
    rawText: analysisResult.rawText || null,
    dosageSummary: analysisResult.dosageSummary || null,
    instructions: analysisResult.instructions || null,
    details: analysisResult.details || null,
    typeScores: typeResult.scores || null,
    preprocessMeta: metadata,
  };

  if (lowConfidence) {
    unified.warning = 'Image analysis confidence is low. Please consult a healthcare professional for accurate evaluation.';
  }

  console.log('[IMAGE-ANALYSIS] Pipeline result:', JSON.stringify({
    imageType: unified.imageType,
    visualFinding: unified.visualFinding,
    confidence: unified.confidence,
    lowConfidence: unified.lowConfidence,
    findingsCount: unified.findings?.length,
  }));

  return unified;
}

module.exports = { analyzeImage };
