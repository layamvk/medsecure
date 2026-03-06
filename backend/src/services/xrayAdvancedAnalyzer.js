/**
 * Advanced X-Ray Analyzer — High-Accuracy Medical Image Analysis
 *
 * Significantly improves upon the basic xrayAnalyzer with:
 *   - Higher-resolution grid analysis (8×8 instead of 4×4)
 *   - Multi-scale feature extraction
 *   - Region-of-interest detection (lung fields, bone regions, mediastinum)
 *   - Histogram-based texture analysis
 *   - Pneumonia-specific pattern detection
 *   - Pleural effusion detection
 *   - Cardiomegaly estimation
 *   - Confidence calibration based on image quality
 */

const sharp = require('sharp');

// ─── Constants ───────────────────────────────────────────────────────────────
const ANALYSIS_SIZE = 256;          // Higher res for dedicated analysis
const GRID_FINE = 8;                // Fine grid (8×8 = 64 zones)
const GRID_COARSE = 4;             // Coarse grid for large structure detection
const QUALITY_THRESHOLD = 0.25;     // Minimum quality score to trust results

// ─── Lung Region Mapping (approximate for PA chest X-ray) ────────────────────
// On an 8×8 grid, approximate lung field positions
const LUNG_LEFT_ZONES  = [[1,2],[1,3],[2,2],[2,3],[3,2],[3,3],[4,2],[4,3],[5,2],[5,3]];
const LUNG_RIGHT_ZONES = [[1,4],[1,5],[2,4],[2,5],[3,4],[3,5],[4,4],[4,5],[5,4],[5,5]];
const MEDIASTINUM_ZONES = [[1,3],[1,4],[2,3],[2,4],[3,3],[3,4]];
const UPPER_ZONES = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6]];
const LOWER_ZONES = [[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[6,1],[6,2],[6,3],[6,4],[6,5],[6,6]];
const BONE_ZONES = [[0,0],[0,1],[0,6],[0,7],[1,0],[1,1],[1,6],[1,7],[6,0],[6,7],[7,0],[7,7]]; // periphery

/**
 * Analyse an X-ray image buffer at 256×256 with fine grid
 */
async function analyzeGrid(buffer, gridSize) {
  const TILE = Math.floor(ANALYSIS_SIZE / gridSize);

  const { data } = await sharp(buffer)
    .resize(ANALYSIS_SIZE, ANALYSIS_SIZE, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const zones = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      let sum = 0, sumSq = 0, count = 0, minVal = 255, maxVal = 0;
      const hist = new Array(256).fill(0);

      for (let y = row * TILE; y < Math.min((row + 1) * TILE, ANALYSIS_SIZE); y++) {
        for (let x = col * TILE; x < Math.min((col + 1) * TILE, ANALYSIS_SIZE); x++) {
          const px = data[y * ANALYSIS_SIZE + x];
          sum += px;
          sumSq += px * px;
          count++;
          if (px < minVal) minVal = px;
          if (px > maxVal) maxVal = px;
          hist[px]++;
        }
      }

      const mean = sum / count;
      const variance = (sumSq / count) - (mean * mean);
      const stdDev = Math.sqrt(Math.max(0, variance));
      const contrast = maxVal - minVal;

      // Compute entropy (texture complexity)
      let entropy = 0;
      for (let i = 0; i < 256; i++) {
        if (hist[i] > 0) {
          const p = hist[i] / count;
          entropy -= p * Math.log2(p);
        }
      }

      zones.push({ row, col, mean, stdDev, contrast, minVal, maxVal, entropy, hist });
    }
  }

  return zones;
}

/**
 * Compute colour statistics from the original (non-greyscale) image
 */
async function computeColorAnalysis(buffer) {
  const { data, info } = await sharp(buffer)
    .resize(128, 128, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let totalR = 0, totalG = 0, totalB = 0;
  let greyPixels = 0;
  const pixels = info.width * info.height;
  const channels = info.channels || 3;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    totalR += r;
    totalG += g;
    totalB += b;
    // A pixel is "grey" if R/G/B are within 15 of each other
    if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15) {
      greyPixels++;
    }
  }

  return {
    avgR: totalR / pixels,
    avgG: totalG / pixels,
    avgB: totalB / pixels,
    brightness: (totalR + totalG + totalB) / (3 * pixels),
    greyscaleRatio: greyPixels / pixels,
  };
}

/**
 * Compute Laplacian-based edge density at higher resolution
 */
async function computeEdgeDensityAdvanced(buffer) {
  const { data } = await sharp(buffer)
    .resize(ANALYSIS_SIZE, ANALYSIS_SIZE, { fit: 'fill' })
    .greyscale()
    .convolve({
      width: 3, height: 3,
      kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0],
      scale: 1, offset: 128,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0, highEdge = 0;
  for (let i = 0; i < data.length; i++) {
    const v = Math.abs(data[i] - 128);
    sum += v;
    if (v > 40) highEdge++;
  }

  return {
    density: Math.min(sum / (data.length * 128), 1),
    strongEdgeRatio: highEdge / data.length,
  };
}

/**
 * Assess image quality for X-ray analysis
 */
function assessImageQuality(zones, colorAnalysis, edgeInfo) {
  let score = 0;
  const issues = [];

  // High greyscale ratio = likely actual X-ray
  if (colorAnalysis.greyscaleRatio > 0.7) {
    score += 0.3;
  } else if (colorAnalysis.greyscaleRatio > 0.4) {
    score += 0.15;
    issues.push('image appears partially coloured — may not be a standard X-ray');
  } else {
    issues.push('image has significant colour content — may not be an X-ray');
  }

  // Good dynamic range
  const globalContrast = zones.reduce((s, z) => s + z.contrast, 0) / zones.length;
  if (globalContrast > 80) {
    score += 0.25;
  } else if (globalContrast > 40) {
    score += 0.15;
    issues.push('low contrast — image quality may affect accuracy');
  } else {
    score += 0.05;
    issues.push('very low contrast — results may be unreliable');
  }

  // Reasonable brightness (not over/under-exposed)
  if (colorAnalysis.brightness > 40 && colorAnalysis.brightness < 200) {
    score += 0.2;
  } else {
    score += 0.05;
    issues.push('brightness outside normal range for X-ray');
  }

  // Some structure present (edge density)
  if (edgeInfo.density > 0.05) {
    score += 0.25;
  } else if (edgeInfo.density > 0.02) {
    score += 0.15;
    issues.push('low structural detail');
  } else {
    score += 0.05;
    issues.push('very little structural detail — image may be blank or low quality');
  }

  return { quality: parseFloat(score.toFixed(2)), issues };
}

/**
 * Get zone values from a specific list of [row, col] coordinates
 */
function getRegionZones(allZones, gridSize, regionCoords) {
  return regionCoords
    .filter(([r, c]) => r < gridSize && c < gridSize)
    .map(([r, c]) => allZones[r * gridSize + c])
    .filter(Boolean);
}

/**
 * Detect pneumonia patterns — consolidation, ground glass opacity, air bronchograms
 */
function detectPneumonia(fineZones) {
  const lungLeft = getRegionZones(fineZones, GRID_FINE, LUNG_LEFT_ZONES);
  const lungRight = getRegionZones(fineZones, GRID_FINE, LUNG_RIGHT_ZONES);
  const allLung = [...lungLeft, ...lungRight];

  if (allLung.length === 0) return null;

  const avgLungBrightness = allLung.reduce((s, z) => s + z.mean, 0) / allLung.length;
  const avgLungStdDev = allLung.reduce((s, z) => s + z.stdDev, 0) / allLung.length;

  // Consolidation: bright patches (higher mean) in lung zones with reduced variance
  const brightLungZones = allLung.filter(z => z.mean > avgLungBrightness + 15);
  const lowVarBrightZones = brightLungZones.filter(z => z.stdDev < avgLungStdDev * 0.8);

  const consolidationScore = allLung.length > 0
    ? (lowVarBrightZones.length / allLung.length) * 0.6 + (brightLungZones.length / allLung.length) * 0.4
    : 0;

  // Determine laterality
  const leftBright = lungLeft.filter(z => z.mean > avgLungBrightness + 15).length;
  const rightBright = lungRight.filter(z => z.mean > avgLungBrightness + 15).length;
  let laterality = 'bilateral';
  if (leftBright > rightBright * 2) laterality = 'left lung';
  else if (rightBright > leftBright * 2) laterality = 'right lung';

  if (consolidationScore > 0.12) {
    return {
      finding: 'possible pneumonia — consolidation or ground-glass opacity detected',
      confidence: parseFloat(Math.min(0.50 + consolidationScore * 0.45, 0.92).toFixed(2)),
      region: laterality,
      riskLevel: consolidationScore > 0.25 ? 'high' : 'medium',
      indicators: [
        `${brightLungZones.length} elevated-brightness lung zones`,
        `consolidation pattern in ${laterality}`,
        `average lung brightness: ${avgLungBrightness.toFixed(1)}`,
      ],
    };
  }

  return null;
}

/**
 * Detect pleural effusion — fluid collection at lung bases
 */
function detectPleuralEffusion(fineZones) {
  const lowerLeft = getRegionZones(fineZones, GRID_FINE, [[5,2],[5,3],[6,2],[6,3],[7,2],[7,3]]);
  const lowerRight = getRegionZones(fineZones, GRID_FINE, [[5,4],[5,5],[6,4],[6,5],[7,4],[7,5]]);
  const upperLung = getRegionZones(fineZones, GRID_FINE, [[1,2],[1,3],[1,4],[1,5],[2,2],[2,3],[2,4],[2,5]]);

  if (lowerLeft.length === 0 || upperLung.length === 0) return null;

  const lowerAvg = [...lowerLeft, ...lowerRight].reduce((s, z) => s + z.mean, 0) / (lowerLeft.length + lowerRight.length);
  const upperAvg = upperLung.reduce((s, z) => s + z.mean, 0) / upperLung.length;
  const lowerEntropy = [...lowerLeft, ...lowerRight].reduce((s, z) => s + z.entropy, 0) / (lowerLeft.length + lowerRight.length);

  // Effusion: base of lungs brighter than upper, with low texture (fluid = homogeneous)
  const brightDiff = lowerAvg - upperAvg;
  const isLowTexture = lowerEntropy < 5.5;

  if (brightDiff > 10 && isLowTexture) {
    const effusionScore = (brightDiff / 60) * 0.5 + (isLowTexture ? 0.3 : 0) + 0.2;

    // Laterality
    const leftAvg = lowerLeft.reduce((s, z) => s + z.mean, 0) / (lowerLeft.length || 1);
    const rightAvg = lowerRight.reduce((s, z) => s + z.mean, 0) / (lowerRight.length || 1);
    let side = 'bilateral';
    if (leftAvg > rightAvg + 15) side = 'left';
    else if (rightAvg > leftAvg + 15) side = 'right';

    return {
      finding: `possible pleural effusion — ${side} lung base`,
      confidence: parseFloat(Math.min(0.45 + effusionScore * 0.4, 0.88).toFixed(2)),
      region: `${side} costophrenic angle`,
      riskLevel: effusionScore > 0.6 ? 'high' : 'medium',
      indicators: [
        `base-to-upper brightness difference: ${brightDiff.toFixed(1)}`,
        `low texture entropy at base: ${lowerEntropy.toFixed(2)}`,
      ],
    };
  }

  return null;
}

/**
 * Detect cardiomegaly — enlarged cardiac silhouette
 */
function detectCardiomegaly(fineZones) {
  // Cardiac silhouette: central-lower region of chest
  const cardiacZones = getRegionZones(fineZones, GRID_FINE, [
    [3,3],[3,4],[4,3],[4,4],[5,3],[5,4],
  ]);
  // Thorax width reference zones
  const thoraxZones = getRegionZones(fineZones, GRID_FINE, [
    [3,1],[3,2],[3,3],[3,4],[3,5],[3,6],
    [4,1],[4,2],[4,3],[4,4],[4,5],[4,6],
  ]);

  if (cardiacZones.length === 0 || thoraxZones.length === 0) return null;

  // Dense (brighter) cardiac area vs aerated lung
  const cardiacMean = cardiacZones.reduce((s, z) => s + z.mean, 0) / cardiacZones.length;
  const thoraxMean = thoraxZones.reduce((s, z) => s + z.mean, 0) / thoraxZones.length;
  const cardiacStd = cardiacZones.reduce((s, z) => s + z.stdDev, 0) / cardiacZones.length;

  // Large bright centre = possible enlarged heart
  const densityDiff = cardiacMean - thoraxMean;
  const isHomogeneous = cardiacStd < 30;

  if (densityDiff > 12 && isHomogeneous) {
    const score = (densityDiff / 50) * 0.5 + (isHomogeneous ? 0.25 : 0) + 0.15;
    return {
      finding: 'possible cardiomegaly — enlarged cardiac silhouette',
      confidence: parseFloat(Math.min(0.40 + score * 0.45, 0.85).toFixed(2)),
      region: 'mediastinum / cardiac',
      riskLevel: 'medium',
      indicators: [
        `cardiac density difference: ${densityDiff.toFixed(1)}`,
        `cardiac homogeneity: ${isHomogeneous ? 'high' : 'moderate'}`,
      ],
    };
  }

  return null;
}

/**
 * Detect bone fracture with improved multi-zone analysis
 */
function detectFractures(fineZones, edgeInfo) {
  // Look for lines of high contrast crossing zones (fracture lines)
  const highContrastZones = fineZones.filter(z => z.contrast > 140);
  const veryHighContrastZones = fineZones.filter(z => z.contrast > 180);

  // Check for linear patterns in high-contrast zones (consecutive in rows/cols)
  let linearScore = 0;
  const hcCoords = highContrastZones.map(z => [z.row, z.col]);
  for (const [r, c] of hcCoords) {
    // Check if adjacent zone is also high contrast (linear continuity)
    const hasAdjacentHC = hcCoords.some(([r2, c2]) =>
      (Math.abs(r - r2) <= 1 && Math.abs(c - c2) <= 1) && !(r === r2 && c === c2)
    );
    if (hasAdjacentHC) linearScore += 1;
  }
  linearScore = linearScore / Math.max(fineZones.length, 1);

  const fractureScore = (highContrastZones.length / fineZones.length) * 0.35
    + (veryHighContrastZones.length / fineZones.length) * 0.25
    + edgeInfo.strongEdgeRatio * 0.2
    + linearScore * 0.2;

  if (fractureScore > 0.15) {
    // Determine affected region
    const affectedRows = [...new Set(highContrastZones.map(z => z.row))];
    const affectedCols = [...new Set(highContrastZones.map(z => z.col))];
    let region = 'multiple regions';
    if (affectedRows.every(r => r <= 2)) region = 'upper region (clavicle/shoulder area)';
    else if (affectedRows.every(r => r >= 5)) region = 'lower region (rib/pelvis area)';
    else if (affectedCols.every(c => c <= 2)) region = 'left lateral region';
    else if (affectedCols.every(c => c >= 5)) region = 'right lateral region';

    return {
      finding: 'possible fracture — high-contrast linear discontinuity detected',
      confidence: parseFloat(Math.min(0.45 + fractureScore * 0.5, 0.90).toFixed(2)),
      region,
      riskLevel: fractureScore > 0.3 ? 'high' : 'medium',
      indicators: [
        `${highContrastZones.length} high-contrast zones (${veryHighContrastZones.length} very high)`,
        `linear continuity score: ${linearScore.toFixed(3)}`,
        `strong edge ratio: ${(edgeInfo.strongEdgeRatio * 100).toFixed(1)}%`,
      ],
    };
  }

  return null;
}

/**
 * Detect abnormal opacity patterns
 */
function detectAbnormalOpacity(fineZones) {
  const lungZones = getRegionZones(fineZones, GRID_FINE, [...LUNG_LEFT_ZONES, ...LUNG_RIGHT_ZONES]);
  if (lungZones.length === 0) return null;

  const avgBrightness = lungZones.reduce((s, z) => s + z.mean, 0) / lungZones.length;
  const avgEntropy = lungZones.reduce((s, z) => s + z.entropy, 0) / lungZones.length;

  // Diffuse opacity: many zones with elevated brightness and reduced texture
  const opaqueZones = lungZones.filter(z => z.mean > avgBrightness + 20 && z.entropy < avgEntropy);
  const darkZones = lungZones.filter(z => z.mean < 50);

  if (opaqueZones.length > lungZones.length * 0.3) {
    return {
      finding: 'diffuse abnormal opacity in lung fields',
      confidence: parseFloat(Math.min(0.40 + (opaqueZones.length / lungZones.length) * 0.45, 0.88).toFixed(2)),
      region: 'bilateral lung fields',
      riskLevel: 'medium',
      indicators: [
        `${opaqueZones.length}/${lungZones.length} zones with elevated opacity`,
        `average lung brightness: ${avgBrightness.toFixed(1)}`,
      ],
    };
  }

  if (darkZones.length > lungZones.length * 0.5) {
    return {
      finding: 'diffuse hyperaeration or emphysematous changes',
      confidence: parseFloat(Math.min(0.35 + (darkZones.length / lungZones.length) * 0.35, 0.80).toFixed(2)),
      region: 'bilateral lung fields',
      riskLevel: 'low',
      indicators: [
        `${darkZones.length}/${lungZones.length} hyperlucent zones`,
      ],
    };
  }

  return null;
}

/**
 * Detect structural asymmetry
 */
function detectAsymmetry(fineZones) {
  const leftZones = fineZones.filter(z => z.col < GRID_FINE / 2);
  const rightZones = fineZones.filter(z => z.col >= GRID_FINE / 2);

  const leftAvg = leftZones.reduce((s, z) => s + z.mean, 0) / (leftZones.length || 1);
  const rightAvg = rightZones.reduce((s, z) => s + z.mean, 0) / (rightZones.length || 1);
  const leftStd = leftZones.reduce((s, z) => s + z.stdDev, 0) / (leftZones.length || 1);
  const rightStd = rightZones.reduce((s, z) => s + z.stdDev, 0) / (rightZones.length || 1);

  const asymmetry = Math.abs(leftAvg - rightAvg);
  const textureAsymmetry = Math.abs(leftStd - rightStd);

  if (asymmetry > 20 || textureAsymmetry > 15) {
    const denser = leftAvg > rightAvg ? 'left' : 'right';
    return {
      finding: `structural asymmetry — ${denser} side appears denser`,
      confidence: parseFloat(Math.min(0.35 + (asymmetry / 80) * 0.4, 0.82).toFixed(2)),
      region: 'bilateral comparison',
      riskLevel: 'low',
      indicators: [
        `brightness asymmetry: ${asymmetry.toFixed(1)}`,
        `texture asymmetry: ${textureAsymmetry.toFixed(1)}`,
      ],
    };
  }

  return null;
}

// ─── Main Analysis Function ──────────────────────────────────────────────────

/**
 * Advanced X-ray analysis with improved accuracy.
 *
 * @param {Buffer} processedBuffer – Preprocessed PNG buffer
 * @param {object} metadata – From imagePreprocessor
 * @returns {Promise<object>} Structured findings with confidence and risk levels
 */
async function analyzeXrayAdvanced(processedBuffer, metadata) {
  console.log('[XRAY-ADV] Starting advanced X-ray analysis...');

  // Run all analyses in parallel for performance
  const [fineZones, colorAnalysis, edgeInfo] = await Promise.all([
    analyzeGrid(processedBuffer, GRID_FINE),
    computeColorAnalysis(processedBuffer),
    computeEdgeDensityAdvanced(processedBuffer),
  ]);

  // Assess image quality
  const quality = assessImageQuality(fineZones, colorAnalysis, edgeInfo);
  console.log(`[XRAY-ADV] Image quality: ${quality.quality} (issues: ${quality.issues.length})`);

  // Run all detectors
  const findings = [];

  const pneumoniaResult = detectPneumonia(fineZones);
  if (pneumoniaResult) findings.push(pneumoniaResult);

  const effusionResult = detectPleuralEffusion(fineZones);
  if (effusionResult) findings.push(effusionResult);

  const cardiomegalyResult = detectCardiomegaly(fineZones);
  if (cardiomegalyResult) findings.push(cardiomegalyResult);

  const fractureResult = detectFractures(fineZones, edgeInfo);
  if (fractureResult) findings.push(fractureResult);

  const opacityResult = detectAbnormalOpacity(fineZones);
  if (opacityResult) findings.push(opacityResult);

  const asymmetryResult = detectAsymmetry(fineZones);
  if (asymmetryResult) findings.push(asymmetryResult);

  // Apply quality-based confidence adjustment
  if (quality.quality < QUALITY_THRESHOLD) {
    findings.forEach(f => {
      f.confidence = parseFloat((f.confidence * 0.6).toFixed(2));
      f.riskLevel = 'uncertain';
      f.qualityWarning = 'Low image quality — confidence reduced';
    });
  } else if (quality.quality < 0.5) {
    findings.forEach(f => {
      f.confidence = parseFloat((f.confidence * 0.8).toFixed(2));
    });
  }

  // No findings → normal result
  if (findings.length === 0) {
    findings.push({
      finding: 'no significant abnormality detected',
      confidence: parseFloat(Math.min(0.55 + quality.quality * 0.3, 0.85).toFixed(2)),
      region: 'global',
      riskLevel: 'none',
      indicators: ['all regions within normal parameters'],
    });
  }

  // Sort by confidence desc
  findings.sort((a, b) => b.confidence - a.confidence);
  const primary = findings[0];

  // Determine overall risk level
  const riskLevels = { none: 0, low: 1, medium: 2, high: 3, uncertain: 1 };
  const maxRisk = findings.reduce((max, f) => Math.max(max, riskLevels[f.riskLevel] || 0), 0);
  const overallRisk = Object.keys(riskLevels).find(k => riskLevels[k] === maxRisk) || 'none';

  const result = {
    imageType: 'xray',
    findings,
    primaryFinding: primary.finding,
    confidence: primary.confidence,
    riskLevel: overallRisk,
    quality,
    details: {
      analysisResolution: `${ANALYSIS_SIZE}×${ANALYSIS_SIZE}`,
      gridResolution: `${GRID_FINE}×${GRID_FINE} (${GRID_FINE * GRID_FINE} zones)`,
      edgeDensity: parseFloat(edgeInfo.density.toFixed(4)),
      strongEdgeRatio: parseFloat(edgeInfo.strongEdgeRatio.toFixed(4)),
      brightness: parseFloat(colorAnalysis.brightness.toFixed(1)),
      greyscaleRatio: parseFloat(colorAnalysis.greyscaleRatio.toFixed(3)),
      totalFindings: findings.length,
    },
  };

  console.log(`[XRAY-ADV] Analysis complete: ${findings.length} finding(s), primary: "${primary.finding}" (${primary.confidence}), risk: ${overallRisk}`);
  return result;
}

module.exports = { analyzeXrayAdvanced };
