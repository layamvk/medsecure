/**
 * Advanced X-Ray Analyzer — ML-Powered Medical Image Analysis
 *
 * Complete redesign: replaces static pixel-heuristic analysis with a
 * real ML pipeline:
 *
 *   1. CNN Feature Extraction  (MobileNet V2 via TensorFlow.js)
 *   2. Body Region Classification (scoring classifier on CNN + structural features)
 *   3. Abnormality Detection     (region-specific CNN-based detectors)
 *   4. Heatmap Generation        (activation / edge-deviation map)
 *   5. Quality Assessment        (exposure, contrast, sharpness)
 *
 * The LLM (Groq) is NOT used for detection — only for explanation downstream.
 *
 * Exports:
 *   analyzeXrayAdvanced(imageBuffer, metadata) → structured result
 */

const mlEngine = require('./xrayMLEngine');
const { classifyBodyRegion } = require('./xrayBodyRegionClassifier');
const { detectAbnormalities, getGrayData, computeEdgeMap } = require('./xrayAbnormalityDetector');

/**
 * Full ML-powered X-ray analysis pipeline.
 *
 * @param {Buffer} imageBuffer   Raw image file buffer (JPEG/PNG/etc.)
 * @param {object} [metadata]    Optional metadata from preprocessing
 * @returns {Promise<object>}    Structured analysis result
 *
 * Result shape:
 * {
 *   imageType:       'xray',
 *   bodyRegion:      { name, label, description, confidence, allScores },
 *   findings:        [{ finding, confidence, riskLevel, region, indicators }],
 *   primaryFinding:  string,
 *   confidence:      number (0-1),
 *   riskLevel:       'none' | 'low' | 'medium' | 'high',
 *   quality:         { quality, issues, metrics },
 *   heatmap:         { width, height, data[] },
 *   details:         { modelType, featureDim, regionScores, structuralSummary },
 *   status:          'complete' | 'uncertain',
 * }
 */
async function analyzeXrayAdvanced(imageBuffer, metadata = {}) {
  const startTime = Date.now();

  // ── Step 1: Extract all features in parallel ──
  console.log('[XRAY-ANALYZER] Starting ML feature extraction…');

  const [cnnFeatures, structural, heatmap, quality] = await Promise.all([
    mlEngine.extractCNNFeatures(imageBuffer),
    mlEngine.extractStructuralFeatures(imageBuffer),
    mlEngine.generateHeatmap(imageBuffer),
    mlEngine.assessQuality(imageBuffer),
  ]);

  const featureTime = Date.now() - startTime;
  console.log(`[XRAY-ANALYZER] Features extracted in ${featureTime}ms (model: ${mlEngine.modelType})`);

  // ── Step 2: Classify body region ──
  const bodyRegion = classifyBodyRegion(cnnFeatures, structural);
  console.log(`[XRAY-ANALYZER] Body region: ${bodyRegion.label} (${(bodyRegion.confidence * 100).toFixed(1)}%)`);

  // ── Step 3: Get grayscale + edge data for abnormality detection ──
  const grayData = await getGrayData(imageBuffer);
  const edgeMapData = computeEdgeMap(grayData);

  // ── Step 4: Detect abnormalities (region-specific) ──
  const { findings, riskLevel } = detectAbnormalities(
    bodyRegion.name, grayData, edgeMapData, structural,
  );
  console.log(`[XRAY-ANALYZER] ${findings.length} finding(s), risk: ${riskLevel}`);

  // ── Step 5: Determine primary finding ──
  let primaryFinding = 'No significant abnormality detected';
  let confidence = bodyRegion.confidence;
  let status = 'complete';

  if (findings.length > 0) {
    primaryFinding = findings[0].finding;
    confidence = findings[0].confidence;
  }

  // Mark as uncertain if quality is poor or confidence is very low
  if (quality.quality < 0.35 || (findings.length > 0 && confidence < 0.35)) {
    status = 'uncertain';
  }

  // If body region confidence is very low, flag uncertainty
  if (bodyRegion.confidence < 0.20) {
    status = 'uncertain';
    primaryFinding = 'Unable to reliably classify body region — ' + primaryFinding;
  }

  const totalTime = Date.now() - startTime;

  return {
    imageType: 'xray',
    bodyRegion,
    findings,
    primaryFinding,
    confidence,
    riskLevel,
    quality,
    heatmap,
    details: {
      modelType: mlEngine.modelType,
      featureDim: mlEngine.featureDim,
      regionScores: bodyRegion.allScores,
      structuralSummary: {
        symmetry: +structural.symmetryScore.toFixed(3),
        boneDensity: +structural.boneDensityRatio.toFixed(3),
        airRatio: +structural.airRatio.toFixed(3),
        edgeDensity: +structural.edgeDensity.toFixed(3),
        edgeOrientation: structural.edgeOrientation,
        fgAspectRatio: +structural.fgAspectRatio.toFixed(3),
        centralBrightness: +structural.centralBrightness.toFixed(3),
      },
      processingMs: totalTime,
    },
    status,
    metadata: metadata || {},
  };
}

// Pre-initialize the ML engine at module load (non-blocking)
mlEngine.initialize().catch(err => {
  console.error('[XRAY-ANALYZER] ML engine pre-init failed:', err.message);
});

module.exports = { analyzeXrayAdvanced };
