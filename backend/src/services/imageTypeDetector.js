/**
 * Image Type Detector
 * Classifies an uploaded medical image into one of:
 *   xray | prescription | injury | skin_condition | unknown
 *
 * Uses a multi-signal heuristic cascade:
 *   1. Filename keyword hints
 *   2. Colour-histogram features (greyscale vs colour, red-channel dominance)
 *   3. Edge-density analysis
 *   4. Aspect-ratio / size heuristics
 *
 * Each signal produces a score per category; final label = highest aggregate.
 */

const { computeColorStats, computeEdgeDensity } = require('./imagePreprocessor');

/**
 * @param {Buffer}  processedBuffer – Preprocessed PNG buffer
 * @param {object}  metadata        – From imagePreprocessor
 * @param {string}  originalName    – Original filename (for keyword hints)
 * @returns {Promise<{imageType: string, confidence: number, scores: object}>}
 */
async function detectImageType(processedBuffer, metadata, originalName = '') {
  const scores = { xray: 0, prescription: 0, injury: 0, skin_condition: 0 };
  const name = (originalName || '').toLowerCase();

  // ── 1. Filename keyword hints ──
  const fileKeywords = {
    xray: ['xray', 'x-ray', 'radiograph', 'chest', 'bone', 'scan', 'ct', 'mri'],
    prescription: ['prescription', 'rx', 'medicine', 'label', 'dose', 'tablet', 'pharmacy', 'receipt'],
    injury: ['injury', 'wound', 'cut', 'burn', 'bruise', 'laceration', 'bleeding', 'fracture'],
    skin_condition: ['rash', 'skin', 'acne', 'eczema', 'psoriasis', 'derma', 'mole', 'lesion'],
  };

  for (const [type, keywords] of Object.entries(fileKeywords)) {
    for (const kw of keywords) {
      if (name.includes(kw)) {
        scores[type] += 0.35;
      }
    }
  }

  // ── 2. Colour-histogram analysis ──
  const { avgR, avgG, avgB, brightness } = await computeColorStats(processedBuffer);

  // X-rays tend to be near-greyscale with moderate brightness
  const colourVariance = Math.abs(avgR - avgG) + Math.abs(avgG - avgB) + Math.abs(avgR - avgB);
  const isGreyscale = colourVariance < 30;

  if (isGreyscale) {
    scores.xray += 0.30;
    scores.prescription += 0.10;
  }

  // Prescriptions typically have very bright background (white paper)
  if (brightness > 180 && colourVariance < 50) {
    scores.prescription += 0.25;
  }

  // Injuries often have red-channel dominance
  const redRatio = avgR / (avgG + avgB + 1);
  if (redRatio > 0.65) {
    scores.injury += 0.25;
    scores.skin_condition += 0.15;
  }

  // Skin conditions: moderate colour, not extremely bright or dark
  if (!isGreyscale && brightness > 80 && brightness < 200 && colourVariance > 20) {
    scores.skin_condition += 0.20;
  }

  // ── 3. Edge-density ──
  const edgeDensity = await computeEdgeDensity(processedBuffer);

  // X-rays have moderate edge density (bone edges)
  if (edgeDensity > 0.15 && edgeDensity < 0.45 && isGreyscale) {
    scores.xray += 0.20;
  }

  // Prescriptions have high edge density (text lines)
  if (edgeDensity > 0.30) {
    scores.prescription += 0.15;
  }

  // Injuries: lower structured edges, more organic
  if (edgeDensity > 0.08 && edgeDensity < 0.35) {
    scores.injury += 0.10;
  }

  // ── 4. Aspect-ratio hints ──
  const ar = (metadata.originalWidth || 1) / (metadata.originalHeight || 1);
  // Prescriptions are often portrait orientation
  if (ar < 0.85) {
    scores.prescription += 0.10;
  }

  // ── Determine winner ──
  let bestType = 'unknown';
  let bestScore = 0;

  for (const [type, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  // Normalise to [0, 1] confidence; cap at 0.95 because heuristic
  const maxPossible = 0.90;
  const confidence = Math.min(parseFloat((bestScore / maxPossible).toFixed(2)), 0.95);

  // If no signal at all, mark unknown
  if (bestScore < 0.15) {
    bestType = 'unknown';
  }

  console.log('[IMAGE-TYPE] scores:', JSON.stringify(scores), '→', bestType, `(${confidence})`);
  return { imageType: bestType, confidence, scores };
}

module.exports = { detectImageType };
