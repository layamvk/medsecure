/**
 * Injury / Wound Analysis Module
 * Detects visible injury features from uploaded images using
 * colour-histogram analysis, edge features, and region heuristics.
 *
 * Detectable features:
 *   - bleeding
 *   - bruising
 *   - swelling
 *   - cuts / lacerations
 *   - infection signs (redness + warmth)
 */

const sharp = require('sharp');
const { computeColorStats, computeEdgeDensity } = require('./imagePreprocessor');

/**
 * Compute per-channel histograms for injury-specific colour analysis.
 * @param {Buffer} buffer – Preprocessed PNG
 * @returns {Promise<{redPeak: number, redSpread: number, greenDeficit: number, darkPixelRatio: number, brightPixelRatio: number}>}
 */
async function computeInjuryHistogram(buffer) {
  const { data } = await sharp(buffer)
    .resize(128, 128, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = 128 * 128;
  let redSum = 0, greenSum = 0, blueSum = 0;
  let darkPixels = 0, brightPixels = 0;
  let highRedPixels = 0;

  for (let i = 0; i < data.length; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    redSum += r;
    greenSum += g;
    blueSum += b;

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 60) darkPixels++;
    if (lum > 200) brightPixels++;
    if (r > g + 30 && r > b + 30) highRedPixels++;
  }

  return {
    redPeak: redSum / pixels,
    greenDeficit: (redSum - greenSum) / pixels,
    darkPixelRatio: darkPixels / pixels,
    brightPixelRatio: brightPixels / pixels,
    highRedRatio: highRedPixels / pixels,
  };
}

/**
 * Analyse an image for injury/wound features.
 *
 * @param {Buffer} processedBuffer – Preprocessed PNG
 * @param {object} metadata – From imagePreprocessor
 * @returns {Promise<{imageType: string, findings: Array, primaryFinding: string, confidence: number, details: object}>}
 */
async function analyzeInjury(processedBuffer, metadata) {
  const findings = [];
  const edgeDensity = await computeEdgeDensity(processedBuffer);
  const colorStats = await computeColorStats(processedBuffer);
  const histogram = await computeInjuryHistogram(processedBuffer);

  // ── Bleeding detection ──
  // High red ratio + high red-to-green channel difference
  if (histogram.highRedRatio > 0.15 && histogram.greenDeficit > 20) {
    const bleedConf = parseFloat(Math.min(0.45 + histogram.highRedRatio * 1.2, 0.92).toFixed(2));
    findings.push({
      finding: 'possible bleeding detected',
      confidence: bleedConf,
      indicators: ['elevated red channel', 'red-dominant pixels'],
    });
  }

  // ── Bruising detection ──
  // Purple/blue tones → dark pixels + moderate red but high blue
  if (histogram.darkPixelRatio > 0.20 && colorStats.avgB > colorStats.avgG) {
    const bruiseConf = parseFloat(Math.min(0.40 + histogram.darkPixelRatio * 0.8, 0.88).toFixed(2));
    findings.push({
      finding: 'possible bruising detected',
      confidence: bruiseConf,
      indicators: ['dark pixel regions', 'blue-channel elevation'],
    });
  }

  // ── Swelling detection ──
  // Swollen areas are smoother (low edge density) with slightly elevated brightness
  if (edgeDensity < 0.20 && colorStats.brightness > 100 && colorStats.brightness < 190) {
    const swellConf = parseFloat(Math.min(0.38 + (1 - edgeDensity) * 0.35, 0.82).toFixed(2));
    findings.push({
      finding: 'possible swelling detected',
      confidence: swellConf,
      indicators: ['smooth texture region', 'moderate brightness'],
    });
  }

  // ── Cuts / Lacerations ──
  // Sharp edges + red near edge regions
  if (edgeDensity > 0.25 && histogram.highRedRatio > 0.08) {
    const cutConf = parseFloat(Math.min(0.42 + edgeDensity * 0.6, 0.88).toFixed(2));
    findings.push({
      finding: 'possible cut or laceration detected',
      confidence: cutConf,
      indicators: ['high edge density', 'red-channel near edges'],
    });
  }

  // ── Infection signs ──
  // Redness spread (high red average) + warmth (overall brightness elevated)
  if (histogram.greenDeficit > 15 && colorStats.avgR > 140 && colorStats.brightness > 110) {
    const infConf = parseFloat(Math.min(0.35 + (histogram.greenDeficit / 60) * 0.4, 0.82).toFixed(2));
    findings.push({
      finding: 'signs of possible infection — redness and warmth indicators',
      confidence: infConf,
      indicators: ['diffuse redness', 'elevated warmth signature'],
    });
  }

  // ── No clear injury ──
  if (findings.length === 0) {
    findings.push({
      finding: 'no clear injury features detected',
      confidence: 0.55,
      indicators: [],
    });
  }

  findings.sort((a, b) => b.confidence - a.confidence);
  const primary = findings[0];

  return {
    imageType: 'injury',
    findings,
    primaryFinding: primary.finding,
    confidence: primary.confidence,
    details: {
      edgeDensity: parseFloat(edgeDensity.toFixed(3)),
      brightness: parseFloat(colorStats.brightness.toFixed(1)),
      highRedRatio: parseFloat(histogram.highRedRatio.toFixed(3)),
      darkPixelRatio: parseFloat(histogram.darkPixelRatio.toFixed(3)),
      greenDeficit: parseFloat(histogram.greenDeficit.toFixed(1)),
    },
  };
}

module.exports = { analyzeInjury };
