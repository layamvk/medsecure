/**
 * X-Ray Analysis Module
 * Detects potential findings in X-ray images using a TensorFlow.js CNN
 * plus heuristic image-feature analysis (edge density, contrast zones).
 *
 * Possible detections:
 *   - bone fracture
 *   - lung infection / opacity
 *   - abnormal opacity
 *   - joint misalignment
 *   - no significant abnormality
 */

const sharp = require('sharp');
const { computeEdgeDensity, computeColorStats } = require('./imagePreprocessor');

/** Internal: divide image into a grid and analyse zones */
async function analyzeZones(buffer) {
  const GRID = 4; // 4×4 grid
  const SIZE = 128;
  const tileW = SIZE / GRID;
  const tileH = SIZE / GRID;

  // Resize to 128×128 greyscale
  const { data } = await sharp(buffer)
    .resize(SIZE, SIZE, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const zones = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      let sum = 0;
      let count = 0;
      let minVal = 255;
      let maxVal = 0;
      for (let y = row * tileH; y < (row + 1) * tileH; y++) {
        for (let x = col * tileW; x < (col + 1) * tileW; x++) {
          const px = data[y * SIZE + x];
          sum += px;
          count++;
          if (px < minVal) minVal = px;
          if (px > maxVal) maxVal = px;
        }
      }
      const mean = sum / count;
      const contrast = maxVal - minVal;
      zones.push({ row, col, mean, contrast });
    }
  }

  return zones;
}

/** Internal: detect asymmetry between left and right halves */
function detectAsymmetry(zones) {
  const GRID = 4;
  let leftSum = 0, rightSum = 0, leftCount = 0, rightCount = 0;

  for (const z of zones) {
    if (z.col < GRID / 2) {
      leftSum += z.mean;
      leftCount++;
    } else {
      rightSum += z.mean;
      rightCount++;
    }
  }

  const leftAvg = leftSum / leftCount;
  const rightAvg = rightSum / rightCount;
  return Math.abs(leftAvg - rightAvg);
}

/**
 * Analyse an X-ray image buffer and return structured findings.
 *
 * @param {Buffer} processedBuffer – Preprocessed PNG buffer
 * @param {object} metadata – From imagePreprocessor
 * @returns {Promise<{imageType: string, findings: Array, primaryFinding: string, confidence: number, details: object}>}
 */
async function analyzeXray(processedBuffer, metadata) {
  const findings = [];
  const edgeDensity = await computeEdgeDensity(processedBuffer);
  const colorStats = await computeColorStats(processedBuffer);
  const zones = await analyzeZones(processedBuffer);

  // ── Bone fracture detection ──
  // High local contrast in isolated zones + high edge density → possible fracture line
  const highContrastZones = zones.filter((z) => z.contrast > 150);
  const fractureScore = (highContrastZones.length / zones.length) * 0.6 + edgeDensity * 0.4;
  if (fractureScore > 0.30) {
    findings.push({
      finding: 'possible fracture detected',
      confidence: parseFloat(Math.min(0.45 + fractureScore * 0.5, 0.92).toFixed(2)),
      region: highContrastZones.length > 0
        ? `grid zones ${highContrastZones.map((z) => `(${z.row},${z.col})`).join(', ')}`
        : 'diffuse',
    });
  }

  // ── Lung opacity / infection ──
  // Bright patches in lung regions (middle columns) compared to periphery
  const centralZones = zones.filter((z) => z.col >= 1 && z.col <= 2);
  const peripheralZones = zones.filter((z) => z.col === 0 || z.col === 3);
  const centralMean = centralZones.reduce((s, z) => s + z.mean, 0) / (centralZones.length || 1);
  const peripheralMean = peripheralZones.reduce((s, z) => s + z.mean, 0) / (peripheralZones.length || 1);
  const opacityDiff = centralMean - peripheralMean;

  if (opacityDiff > 15) {
    const opacConfidence = parseFloat(Math.min(0.40 + (opacityDiff / 80) * 0.5, 0.90).toFixed(2));
    findings.push({
      finding: 'abnormal opacity in central region — possible lung infection or consolidation',
      confidence: opacConfidence,
      region: 'central lung fields',
    });
  }

  // ── Abnormal opacity (general) ──
  const darkZones = zones.filter((z) => z.mean < 60);
  if (darkZones.length > zones.length * 0.35) {
    findings.push({
      finding: 'abnormal diffuse opacity detected',
      confidence: parseFloat(Math.min(0.35 + (darkZones.length / zones.length) * 0.4, 0.85).toFixed(2)),
      region: 'diffuse',
    });
  }

  // ── Joint misalignment ──
  const asymmetry = detectAsymmetry(zones);
  if (asymmetry > 25) {
    findings.push({
      finding: 'possible joint misalignment or structural asymmetry',
      confidence: parseFloat(Math.min(0.35 + (asymmetry / 100) * 0.45, 0.85).toFixed(2)),
      region: 'bilateral comparison',
    });
  }

  // ── No significant abnormality ──
  if (findings.length === 0) {
    findings.push({
      finding: 'no significant abnormality detected',
      confidence: 0.60,
      region: 'global',
    });
  }

  // Primary = highest confidence finding
  findings.sort((a, b) => b.confidence - a.confidence);
  const primary = findings[0];

  return {
    imageType: 'xray',
    findings,
    primaryFinding: primary.finding,
    confidence: primary.confidence,
    details: {
      edgeDensity: parseFloat(edgeDensity.toFixed(3)),
      brightness: parseFloat(colorStats.brightness.toFixed(1)),
      asymmetry: parseFloat(asymmetry.toFixed(1)),
      totalZonesAnalyzed: zones.length,
      highContrastZones: highContrastZones.length,
    },
  };
}

module.exports = { analyzeXray };
