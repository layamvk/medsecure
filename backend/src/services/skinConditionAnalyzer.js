/**
 * Skin Condition Analysis Module
 * Detects possible skin conditions from uploaded images using
 * colour-distribution, texture, and pattern analysis.
 *
 * Detectable conditions:
 *   - rash / dermatitis
 *   - possible infection (cellulitis-like)
 *   - discoloration / pigmentation anomaly
 *   - lesion or growth
 */

const sharp = require('sharp');
const { computeColorStats, computeEdgeDensity } = require('./imagePreprocessor');

/**
 * Compute skin-specific colour distribution.
 * @param {Buffer} buffer – Preprocessed PNG
 */
async function computeSkinHistogram(buffer) {
  const { data } = await sharp(buffer)
    .resize(128, 128, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = 128 * 128;
  let redDominant = 0, pinkPixels = 0, darkSpots = 0, normalSkin = 0;

  for (let i = 0; i < data.length; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Red dominant (irritation/rash)
    if (r > g + 25 && r > b + 25 && r > 100) redDominant++;
    // Pink tones (mild irritation)
    if (r > 150 && g > 80 && g < 160 && b > 80 && b < 160) pinkPixels++;
    // Dark spots (possible lesions/moles)
    if (lum < 70 && r < 100) darkSpots++;
    // Normal skin tones (reference)
    if (r > 120 && g > 80 && b > 60 && r < 230 && Math.abs(r - g) < 60) normalSkin++;
  }

  return {
    redDominantRatio: redDominant / pixels,
    pinkRatio: pinkPixels / pixels,
    darkSpotRatio: darkSpots / pixels,
    normalSkinRatio: normalSkin / pixels,
  };
}

/**
 * Analyse an image for skin conditions.
 *
 * @param {Buffer} processedBuffer – Preprocessed PNG
 * @param {object} metadata – From imagePreprocessor
 * @returns {Promise<{imageType: string, findings: Array, primaryFinding: string, confidence: number, details: object}>}
 */
async function analyzeSkinCondition(processedBuffer, metadata) {
  const findings = [];
  const edgeDensity = await computeEdgeDensity(processedBuffer);
  const colorStats = await computeColorStats(processedBuffer);
  const skinHist = await computeSkinHistogram(processedBuffer);

  // ── Rash / Dermatitis ──
  if (skinHist.redDominantRatio > 0.10 && skinHist.pinkRatio > 0.05) {
    const rashConf = parseFloat(Math.min(0.45 + skinHist.redDominantRatio * 1.0, 0.90).toFixed(2));
    findings.push({
      finding: 'possible rash or dermatitis detected',
      confidence: rashConf,
      indicators: ['red-dominant skin regions', 'pink irritation patches'],
    });
  }

  // ── Infection (cellulitis-like) ──
  if (skinHist.redDominantRatio > 0.20 && colorStats.avgR > 150 && edgeDensity < 0.25) {
    const infConf = parseFloat(Math.min(0.40 + skinHist.redDominantRatio * 0.8, 0.85).toFixed(2));
    findings.push({
      finding: 'possible skin infection — diffuse redness with warmth pattern',
      confidence: infConf,
      indicators: ['widespread redness', 'smooth texture', 'warmth signature'],
    });
  }

  // ── Discoloration / Pigmentation anomaly ──
  if (skinHist.darkSpotRatio > 0.08) {
    const discConf = parseFloat(Math.min(0.38 + skinHist.darkSpotRatio * 1.5, 0.85).toFixed(2));
    findings.push({
      finding: 'pigmentation anomaly or discolored area detected',
      confidence: discConf,
      indicators: ['dark spot clusters', 'pigment variation'],
    });
  }

  // ── Lesion or growth ──
  // Small dark concentrated area + high edge contrast
  if (skinHist.darkSpotRatio > 0.03 && skinHist.darkSpotRatio < 0.20 && edgeDensity > 0.15) {
    const lesionConf = parseFloat(Math.min(0.35 + edgeDensity * 0.5 + skinHist.darkSpotRatio * 2, 0.85).toFixed(2));
    findings.push({
      finding: 'possible lesion or growth detected — further evaluation recommended',
      confidence: lesionConf,
      indicators: ['localised dark region', 'defined edges'],
    });
  }

  // ── No significant skin abnormality ──
  if (findings.length === 0) {
    findings.push({
      finding: 'no significant skin abnormality detected',
      confidence: 0.55,
      indicators: [],
    });
  }

  findings.sort((a, b) => b.confidence - a.confidence);
  const primary = findings[0];

  return {
    imageType: 'skin_condition',
    findings,
    primaryFinding: primary.finding,
    confidence: primary.confidence,
    details: {
      edgeDensity: parseFloat(edgeDensity.toFixed(3)),
      brightness: parseFloat(colorStats.brightness.toFixed(1)),
      redDominantRatio: parseFloat(skinHist.redDominantRatio.toFixed(3)),
      pinkRatio: parseFloat(skinHist.pinkRatio.toFixed(3)),
      darkSpotRatio: parseFloat(skinHist.darkSpotRatio.toFixed(3)),
      normalSkinRatio: parseFloat(skinHist.normalSkinRatio.toFixed(3)),
    },
  };
}

module.exports = { analyzeSkinCondition };
