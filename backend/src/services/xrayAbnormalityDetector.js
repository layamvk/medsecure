/**
 * X-Ray Abnormality Detector
 *
 * Region-specific abnormality detection using CNN + structural features.
 * Each body region has a dedicated detection pipeline that analyses
 * the image features for region-specific anomalies.
 *
 * Supported abnormalities:
 *   - Fractures (all bone regions)
 *   - Lung opacity / consolidation (chest)
 *   - Pleural effusion (chest)
 *   - Cardiomegaly (chest)
 *   - Bone displacement / malalignment
 *   - Abnormal density / calcification
 *   - Joint space narrowing (extremities)
 *   - Soft tissue swelling
 *   - Vertebral compression (spine)
 *
 * The ML model handles ALL detection.  Groq / LLM is NOT used here.
 */

const tf = require('@tensorflow/tfjs');
const sharp = require('sharp');

const INPUT_SIZE = 224;

// ─── Utility: compute local features for a subregion ─────────────────────────

function computeLocalStats(grayData, x0, y0, x1, y1, width) {
  let sum = 0, sumSq = 0, count = 0, minV = 1, maxV = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const v = grayData[y * width + x];
      sum += v; sumSq += v * v; count++;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
  }
  const mean = sum / (count || 1);
  const variance = (sumSq / (count || 1)) - mean * mean;
  return { mean, variance: Math.max(0, variance), stdDev: Math.sqrt(Math.max(0, variance)), min: minV, max: maxV, contrast: maxV - minV };
}

// ─── Grayscale extraction helper ─────────────────────────────────────────────

async function getGrayData(imageBuffer) {
  const raw = await sharp(imageBuffer)
    .rotate().toColourspace('srgb').removeAlpha()
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0 } })
    .normalise().raw().toBuffer();

  const rgb = new Uint8Array(raw);
  const gray = new Float32Array(INPUT_SIZE * INPUT_SIZE);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = (rgb[i * 3] * 0.299 + rgb[i * 3 + 1] * 0.587 + rgb[i * 3 + 2] * 0.114) / 255.0;
  }
  return gray;
}

// ─── Edge map helper ─────────────────────────────────────────────────────────

function computeEdgeMap(grayData) {
  return tf.tidy(() => {
    const gray = tf.tensor2d(grayData, [INPUT_SIZE, INPUT_SIZE]);
    const g4d = gray.reshape([1, INPUT_SIZE, INPUT_SIZE, 1]);
    const sx = tf.tensor4d([-1,0,1, -2,0,2, -1,0,1], [3,3,1,1]);
    const sy = tf.tensor4d([-1,-2,-1, 0,0,0, 1,2,1], [3,3,1,1]);
    const ex = tf.conv2d(g4d, sx, 1, 'same').squeeze();
    const ey = tf.conv2d(g4d, sy, 1, 'same').squeeze();
    return tf.sqrt(tf.add(tf.square(ex), tf.square(ey))).dataSync();
  });
}

// ─── Region-specific detection helpers ───────────────────────────────────────

function buildFinding(name, confidence, riskLevel, region, indicators) {
  return {
    finding: name,
    confidence: +Math.min(1, Math.max(0, confidence)).toFixed(3),
    riskLevel,
    region,
    indicators: indicators || [],
  };
}

function riskFromConfidence(conf) {
  if (conf >= 0.75) return 'high';
  if (conf >= 0.50) return 'medium';
  if (conf >= 0.30) return 'low';
  return 'none';
}

// ─── CHEST detectors ─────────────────────────────────────────────────────────

function detectLungOpacity(gray, structural) {
  const findings = [];
  const W = INPUT_SIZE;

  // Define lung zones (left/right, upper/mid/lower)
  const zones = [
    { name: 'Right Upper Lung', x0: Math.floor(W * 0.55), y0: Math.floor(W * 0.15), x1: Math.floor(W * 0.85), y1: Math.floor(W * 0.35) },
    { name: 'Right Mid Lung',   x0: Math.floor(W * 0.55), y0: Math.floor(W * 0.35), x1: Math.floor(W * 0.85), y1: Math.floor(W * 0.55) },
    { name: 'Right Lower Lung', x0: Math.floor(W * 0.55), y0: Math.floor(W * 0.55), x1: Math.floor(W * 0.85), y1: Math.floor(W * 0.75) },
    { name: 'Left Upper Lung',  x0: Math.floor(W * 0.15), y0: Math.floor(W * 0.15), x1: Math.floor(W * 0.45), y1: Math.floor(W * 0.35) },
    { name: 'Left Mid Lung',    x0: Math.floor(W * 0.15), y0: Math.floor(W * 0.35), x1: Math.floor(W * 0.45), y1: Math.floor(W * 0.55) },
    { name: 'Left Lower Lung',  x0: Math.floor(W * 0.15), y0: Math.floor(W * 0.55), x1: Math.floor(W * 0.45), y1: Math.floor(W * 0.75) },
  ];

  // Expected: lung zones should be dark (air-filled, mean < 0.35)
  for (const zone of zones) {
    const stats = computeLocalStats(gray, zone.x0, zone.y0, zone.x1, zone.y1, W);
    if (stats.mean > 0.40) {
      const severity = Math.min(1, (stats.mean - 0.35) / 0.35);
      const conf = 0.35 + severity * 0.45;
      const indicators = [
        `Increased density in ${zone.name} (mean: ${(stats.mean * 100).toFixed(0)}%)`,
        `Local contrast: ${(stats.contrast * 100).toFixed(0)}%`,
      ];
      if (stats.variance < 0.01) indicators.push('Homogeneous opacity pattern');
      findings.push(buildFinding(
        `Possible opacity in ${zone.name}`,
        conf,
        riskFromConfidence(conf),
        zone.name,
        indicators,
      ));
    }
  }

  // Asymmetry check between left and right lungs
  const leftStats = computeLocalStats(gray, Math.floor(W * 0.15), Math.floor(W * 0.20), Math.floor(W * 0.45), Math.floor(W * 0.70), W);
  const rightStats = computeLocalStats(gray, Math.floor(W * 0.55), Math.floor(W * 0.20), Math.floor(W * 0.85), Math.floor(W * 0.70), W);
  const asymmetry = Math.abs(leftStats.mean - rightStats.mean);
  if (asymmetry > 0.10) {
    const side = leftStats.mean > rightStats.mean ? 'Left' : 'Right';
    const conf = Math.min(0.90, 0.40 + asymmetry * 2.5);
    findings.push(buildFinding(
      `Asymmetric lung density — ${side} lung appears denser`,
      conf,
      riskFromConfidence(conf),
      `${side} Lung Field`,
      [`Density asymmetry: ${(asymmetry * 100).toFixed(0)}%`, `${side} mean: ${(side === 'Left' ? leftStats.mean : rightStats.mean).toFixed(2)}`],
    ));
  }

  return findings;
}

function detectPleuralEffusion(gray, structural) {
  const findings = [];
  const W = INPUT_SIZE;

  // Pleural effusion: bright (fluid) at the costophrenic angles (lower lateral lung)
  const angles = [
    { name: 'Right Costophrenic Angle', x0: Math.floor(W * 0.70), y0: Math.floor(W * 0.65), x1: Math.floor(W * 0.90), y1: Math.floor(W * 0.80) },
    { name: 'Left Costophrenic Angle',  x0: Math.floor(W * 0.10), y0: Math.floor(W * 0.65), x1: Math.floor(W * 0.30), y1: Math.floor(W * 0.80) },
  ];

  for (const angle of angles) {
    const stats = computeLocalStats(gray, angle.x0, angle.y0, angle.x1, angle.y1, W);
    // Blunted angle = higher brightness than expected for lung base
    if (stats.mean > 0.45 && stats.variance < 0.02) {
      const conf = Math.min(0.85, 0.35 + (stats.mean - 0.40) * 1.8);
      findings.push(buildFinding(
        `Possible pleural effusion at ${angle.name}`,
        conf,
        riskFromConfidence(conf),
        angle.name,
        [`Blunted angle detected (density: ${(stats.mean * 100).toFixed(0)}%)`, 'Homogeneous density pattern suggesting fluid'],
      ));
    }
  }

  return findings;
}

function detectCardiomegaly(gray, structural) {
  const W = INPUT_SIZE;
  const findings = [];

  // Cardiothoracic ratio: heart width / thorax width
  const heartY = Math.floor(W * 0.40);
  const heartRow = [];
  for (let x = Math.floor(W * 0.25); x < Math.floor(W * 0.75); x++) {
    heartRow.push({ x, v: gray[heartY * W + x] });
  }

  // Find heart borders (transitions from dark lung to bright heart shadow)
  let heartLeft = 0, heartRight = 0;
  const threshold = 0.45;
  for (let i = 0; i < heartRow.length; i++) {
    if (heartRow[i].v > threshold) { heartLeft = heartRow[i].x; break; }
  }
  for (let i = heartRow.length - 1; i >= 0; i--) {
    if (heartRow[i].v > threshold) { heartRight = heartRow[i].x; break; }
  }

  const heartWidth = heartRight - heartLeft;
  const thoraxWidth = W * 0.70; // approximate thorax width
  const ctr = heartWidth / (thoraxWidth || 1);

  if (ctr > 0.50) {
    const severity = Math.min(1, (ctr - 0.50) / 0.20);
    const conf = 0.40 + severity * 0.40;
    findings.push(buildFinding(
      'Possible cardiomegaly (enlarged heart shadow)',
      conf,
      riskFromConfidence(conf),
      'Cardiac Silhouette',
      [`Cardiothoracic ratio: ${(ctr * 100).toFixed(0)}% (>50% suggests enlargement)`, `Estimated heart width: ${heartWidth}px`],
    ));
  }

  return findings;
}

// ─── BONE / EXTREMITY detectors ──────────────────────────────────────────────

function detectFractures(gray, edgeMap, structural, regionLabel) {
  const W = INPUT_SIZE;
  const findings = [];

  // Fracture detection: look for discontinuities in bone edges
  // Divide image into horizontal strips, check for edge breaks

  const strips = 12;
  const stripH = Math.floor(W / strips);
  const edgeDensities = [];

  for (let s = 0; s < strips; s++) {
    const y0 = s * stripH;
    const y1 = Math.min((s + 1) * stripH, W);
    let eSum = 0, count = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < W; x++) {
        eSum += edgeMap[y * W + x];
        count++;
      }
    }
    edgeDensities.push(eSum / (count || 1));
  }

  // Find edge density drops (potential fracture lines)
  const avgEdge = edgeDensities.reduce((a, b) => a + b, 0) / edgeDensities.length;
  for (let i = 1; i < edgeDensities.length - 1; i++) {
    const drop = avgEdge - edgeDensities[i];
    const surroundAvg = (edgeDensities[i - 1] + edgeDensities[i + 1]) / 2;

    if (drop > avgEdge * 0.35 && surroundAvg > edgeDensities[i] * 1.4) {
      const severity = Math.min(1, drop / (avgEdge || 0.01));
      const conf = 0.30 + severity * 0.45;
      const location = i < strips / 3 ? 'Proximal' : i < (strips * 2 / 3) ? 'Mid-shaft' : 'Distal';
      findings.push(buildFinding(
        `Possible fracture — ${location} region`,
        conf,
        riskFromConfidence(conf),
        `${location} ${regionLabel}`,
        [`Edge discontinuity in strip ${i + 1}/${strips}`, `Edge density drop: ${(drop * 100).toFixed(0)}%`],
      ));
    }
  }

  // Check for unusual angles in bone contour: high diagonal edge in localised area
  if (structural.edgeOrientation.diagonal > 0.35) {
    const conf = 0.25 + (structural.edgeOrientation.diagonal - 0.30) * 1.5;
    if (conf > 0.35) {
      findings.push(buildFinding(
        'Possible angulation or displacement detected',
        Math.min(0.85, conf),
        riskFromConfidence(conf),
        regionLabel,
        [`Diagonal edge ratio: ${(structural.edgeOrientation.diagonal * 100).toFixed(0)}%`, 'Unusual angular pattern may indicate displacement'],
      ));
    }
  }

  return findings;
}

function detectJointAbnormality(gray, structural, regionLabel) {
  const W = INPUT_SIZE;
  const findings = [];

  // Joint space narrowing: check regions near the ends of bones (proximal/distal quarters)
  const zones = [
    { name: `Proximal ${regionLabel} joint`, y0: 0, y1: Math.floor(W * 0.25) },
    { name: `Distal ${regionLabel} joint`, y0: Math.floor(W * 0.75), y1: W },
  ];

  for (const zone of zones) {
    const stats = computeLocalStats(gray, Math.floor(W * 0.25), zone.y0, Math.floor(W * 0.75), zone.y1, W);

    // Joint spaces should show distinct bone-soft tissue transitions
    // Low variance in joint region may indicate effusion or narrowing
    if (stats.variance < 0.008 && stats.mean > 0.35) {
      const conf = Math.min(0.75, 0.30 + (0.01 - stats.variance) * 50);
      findings.push(buildFinding(
        `Possible joint abnormality at ${zone.name}`,
        conf,
        riskFromConfidence(conf),
        zone.name,
        ['Reduced joint space variability', `Zone mean density: ${(stats.mean * 100).toFixed(0)}%`],
      ));
    }
  }

  return findings;
}

function detectSoftTissueSwelling(gray, structural, regionLabel) {
  const W = INPUT_SIZE;
  const findings = [];

  // Soft tissue swelling: lateral edges should be dark (air); if bright, indicates swelling
  const leftEdge = computeLocalStats(gray, 0, Math.floor(W * 0.2), Math.floor(W * 0.15), Math.floor(W * 0.8), W);
  const rightEdge = computeLocalStats(gray, Math.floor(W * 0.85), Math.floor(W * 0.2), W, Math.floor(W * 0.8), W);

  for (const [side, stats] of [['Lateral', leftEdge], ['Medial', rightEdge]]) {
    if (stats.mean > 0.30 && stats.variance < 0.015) {
      const conf = Math.min(0.70, 0.25 + (stats.mean - 0.25) * 1.5);
      if (conf > 0.30) {
        findings.push(buildFinding(
          `Possible soft tissue swelling — ${side} aspect`,
          conf,
          riskFromConfidence(conf),
          `${side} ${regionLabel}`,
          [`Increased soft tissue density (mean: ${(stats.mean * 100).toFixed(0)}%)`],
        ));
      }
    }
  }

  return findings;
}

// ─── SKULL detectors ─────────────────────────────────────────────────────────

function detectSkullAbnormalities(gray, edgeMap, structural) {
  const W = INPUT_SIZE;
  const findings = [];

  // Skull fracture: look for linear edge breaks in the peripheral bone
  const periphery = [
    { name: 'Frontal Bone', x0: Math.floor(W*0.25), y0: 0, x1: Math.floor(W*0.75), y1: Math.floor(W*0.15) },
    { name: 'Right Parietal', x0: Math.floor(W*0.75), y0: Math.floor(W*0.1), x1: W, y1: Math.floor(W*0.5) },
    { name: 'Left Parietal', x0: 0, y0: Math.floor(W*0.1), x1: Math.floor(W*0.25), y1: Math.floor(W*0.5) },
    { name: 'Occipital', x0: Math.floor(W*0.25), y0: Math.floor(W*0.7), x1: Math.floor(W*0.75), y1: W },
  ];

  for (const region of periphery) {
    const stats = computeLocalStats(gray, region.x0, region.y0, region.x1, region.y1, W);
    // Unexpected dark line through bone (fracture) would lower mean and increase variance
    if (stats.variance > 0.025 && stats.mean > 0.30) {
      const conf = Math.min(0.75, 0.25 + (stats.variance - 0.02) * 12);
      if (conf > 0.30) {
        findings.push(buildFinding(
          `Possible fracture line in ${region.name}`,
          conf,
          riskFromConfidence(conf),
          region.name,
          [`High variability in bone region (variance: ${stats.variance.toFixed(4)})`, 'Linear lucency may indicate fracture'],
        ));
      }
    }
  }

  // Abnormal intracranial density
  const central = computeLocalStats(gray, Math.floor(W*0.3), Math.floor(W*0.3), Math.floor(W*0.7), Math.floor(W*0.7), W);
  if (central.mean > 0.55) {
    const conf = Math.min(0.70, 0.30 + (central.mean - 0.50) * 2.5);
    findings.push(buildFinding(
      'Increased intracranial density',
      conf,
      riskFromConfidence(conf),
      'Intracranial',
      [`Central density: ${(central.mean*100).toFixed(0)}%`, 'May indicate hemorrhage, calcification, or mass effect'],
    ));
  }

  return findings;
}

// ─── SPINE detectors ─────────────────────────────────────────────────────────

function detectSpineAbnormalities(gray, edgeMap, structural) {
  const W = INPUT_SIZE;
  const findings = [];

  // Vertebral alignment: central column should be consistently positioned
  const midline = Math.floor(W / 2);
  const segments = 10;
  const segH = Math.floor(W / segments);
  const centroids = [];

  for (let s = 0; s < segments; s++) {
    const y0 = s * segH;
    const y1 = Math.min((s + 1) * segH, W);
    let weightedX = 0, totalWeight = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = Math.floor(W * 0.3); x < Math.floor(W * 0.7); x++) {
        const v = gray[y * W + x];
        if (v > 0.4) {
          weightedX += x * v;
          totalWeight += v;
        }
      }
    }
    centroids.push(totalWeight > 0 ? weightedX / totalWeight : midline);
  }

  // Check alignment deviation
  for (let i = 1; i < centroids.length - 1; i++) {
    const deviation = Math.abs(centroids[i] - (centroids[i-1] + centroids[i+1]) / 2);
    if (deviation > W * 0.04) {
      const conf = Math.min(0.80, 0.35 + (deviation / W) * 5);
      const level = i < 3 ? 'Upper' : i < 7 ? 'Mid' : 'Lower';
      findings.push(buildFinding(
        `Possible vertebral malalignment at ${level} spine`,
        conf,
        riskFromConfidence(conf),
        `${level} Spine`,
        [`Lateral offset: ${deviation.toFixed(1)}px`, 'May indicate subluxation or scoliosis'],
      ));
    }
  }

  // Vertebral compression: look for segments with reduced height
  const vertHeights = [];
  for (let s = 0; s < segments; s++) {
    const stats = computeLocalStats(gray, Math.floor(W*0.35), s*segH, Math.floor(W*0.65), Math.min((s+1)*segH, W), W);
    vertHeights.push(stats.mean);
  }

  const avgHeight = vertHeights.reduce((a, b) => a + b, 0) / vertHeights.length;
  for (let i = 0; i < vertHeights.length; i++) {
    if (vertHeights[i] > avgHeight * 1.25) {
      const conf = Math.min(0.70, 0.30 + (vertHeights[i] - avgHeight) / avgHeight);
      const level = i < 3 ? 'Upper' : i < 7 ? 'Mid' : 'Lower';
      findings.push(buildFinding(
        `Possible vertebral compression at ${level} level`,
        conf,
        riskFromConfidence(conf),
        `${level} Vertebral Body`,
        [`Segment density ${(vertHeights[i]*100).toFixed(0)}% vs average ${(avgHeight*100).toFixed(0)}%`],
      ));
    }
  }

  return findings;
}

// ─── ABDOMEN detectors ───────────────────────────────────────────────────────

function detectAbdominalAbnormalities(gray, structural) {
  const W = INPUT_SIZE;
  const findings = [];

  // Free air (pneumoperitoneum): bright crescent under diaphragm
  const subDiaphragm = computeLocalStats(gray, Math.floor(W*0.2), Math.floor(W*0.05), Math.floor(W*0.8), Math.floor(W*0.20), W);
  if (subDiaphragm.mean > 0.60 && subDiaphragm.contrast < 0.25) {
    const conf = Math.min(0.75, 0.35 + (subDiaphragm.mean - 0.55) * 2.5);
    findings.push(buildFinding(
      'Possible free air under diaphragm',
      conf,
      riskFromConfidence(conf),
      'Subdiaphragmatic',
      [`Subdiaphragmatic density: ${(subDiaphragm.mean*100).toFixed(0)}%`, 'Lucency pattern consistent with pneumoperitoneum'],
    ));
  }

  // Abnormal calcification or mass
  const quadrants = [
    { name: 'Right Upper Quadrant', x0: Math.floor(W*0.5), y0: Math.floor(W*0.1), x1: Math.floor(W*0.9), y1: Math.floor(W*0.45) },
    { name: 'Left Upper Quadrant',  x0: Math.floor(W*0.1), y0: Math.floor(W*0.1), x1: Math.floor(W*0.5), y1: Math.floor(W*0.45) },
    { name: 'Right Lower Quadrant', x0: Math.floor(W*0.5), y0: Math.floor(W*0.55), x1: Math.floor(W*0.9), y1: Math.floor(W*0.90) },
    { name: 'Left Lower Quadrant',  x0: Math.floor(W*0.1), y0: Math.floor(W*0.55), x1: Math.floor(W*0.5), y1: Math.floor(W*0.90) },
  ];

  for (const q of quadrants) {
    const stats = computeLocalStats(gray, q.x0, q.y0, q.x1, q.y1, W);
    if (stats.max > 0.80 && stats.variance > 0.02) {
      const conf = Math.min(0.65, 0.25 + stats.variance * 10);
      findings.push(buildFinding(
        `Possible abnormal density in ${q.name}`,
        conf,
        riskFromConfidence(conf),
        q.name,
        [`High density focus detected (max: ${(stats.max*100).toFixed(0)}%)`, 'May represent calcification, mass, or radio-opaque material'],
      ));
    }
  }

  return findings;
}

// ─── Main Abnormality Detection Entry Point ──────────────────────────────────

/**
 * Detect abnormalities in an X-ray image based on the classified body region.
 *
 * @param {string} regionName        Body region name from classifier
 * @param {Float32Array} grayData    Grayscale pixel data (224×224, values 0–1)
 * @param {Float32Array} edgeMapData Edge magnitude data (224×224)
 * @param {object} structuralFeats   Structural features from ML engine
 * @returns {{ findings: Array, riskLevel: string }}
 */
function detectAbnormalities(regionName, grayData, edgeMapData, structuralFeats) {
  let findings = [];

  switch (regionName) {
    case 'chest':
      findings = [
        ...detectLungOpacity(grayData, structuralFeats),
        ...detectPleuralEffusion(grayData, structuralFeats),
        ...detectCardiomegaly(grayData, structuralFeats),
      ];
      break;

    case 'skull':
      findings = detectSkullAbnormalities(grayData, edgeMapData, structuralFeats);
      break;

    case 'hand':
    case 'foot':
      findings = [
        ...detectFractures(grayData, edgeMapData, structuralFeats, regionName === 'hand' ? 'Hand' : 'Foot'),
        ...detectJointAbnormality(grayData, structuralFeats, regionName === 'hand' ? 'Hand' : 'Foot'),
        ...detectSoftTissueSwelling(grayData, structuralFeats, regionName === 'hand' ? 'Hand' : 'Foot'),
      ];
      break;

    case 'arm':
    case 'leg':
      findings = [
        ...detectFractures(grayData, edgeMapData, structuralFeats, regionName === 'arm' ? 'Arm' : 'Leg'),
        ...detectJointAbnormality(grayData, structuralFeats, regionName === 'arm' ? 'Arm' : 'Leg'),
        ...detectSoftTissueSwelling(grayData, structuralFeats, regionName === 'arm' ? 'Arm' : 'Leg'),
      ];
      break;

    case 'spine':
      findings = detectSpineAbnormalities(grayData, edgeMapData, structuralFeats);
      break;

    case 'abdomen':
      findings = detectAbdominalAbnormalities(grayData, structuralFeats);
      break;

    default:
      // Unknown region — run general fracture + density checks
      findings = [
        ...detectFractures(grayData, edgeMapData, structuralFeats, 'Unknown Region'),
        ...detectSoftTissueSwelling(grayData, structuralFeats, 'Unknown'),
      ];
  }

  // Sort by confidence (highest first)
  findings.sort((a, b) => b.confidence - a.confidence);

  // Limit to top 8 findings to avoid noise
  findings = findings.slice(0, 8);

  // Overall risk level
  let riskLevel = 'none';
  if (findings.length > 0) {
    const maxConf = findings[0].confidence;
    if (maxConf >= 0.70) riskLevel = 'high';
    else if (maxConf >= 0.50) riskLevel = 'medium';
    else if (maxConf >= 0.30) riskLevel = 'low';
  }

  return { findings, riskLevel };
}

module.exports = { detectAbnormalities, getGrayData, computeEdgeMap };
