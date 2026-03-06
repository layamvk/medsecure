/**
 * X-Ray Analysis Routes — ML-Powered Pipeline
 *
 * POST /api/xray/analyze
 *   1. Receive multipart/form-data image
 *   2. Run ML pipeline (CNN features → body region → abnormalities → heatmap)
 *   3. Build structured findings summary
 *   4. Send ONLY structured data to Groq for human-readable explanation
 *   5. Return complete result to frontend
 *
 * The LLM never sees the raw image — detection is pure ML.
 */

const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { protect } = require('../middleware/auth');
const { analyzeXrayAdvanced } = require('../services/xrayAdvancedAnalyzer');
const { generateAIResponse } = require('../services/aiResponseService');

const router = express.Router();

// ─── Multer config (up to 15 MB) ────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff', 'image/dicom'];
    cb(allowed.includes(file.mimetype) ? null : new Error('Invalid file type. Accepted: JPEG, PNG, WEBP, TIFF.'), allowed.includes(file.mimetype));
  },
});

// ─── Result cache (5 min TTL, max 50 entries) ───────────────────────────────
const analysisCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 50;

function cacheKey(buf) {
  const len = buf.length;
  const head = buf.slice(0, 64).toString('hex');
  const tail = buf.slice(Math.max(0, len - 64)).toString('hex');
  return `${len}_${head}_${tail}`;
}

function getCached(key) {
  const e = analysisCache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) { analysisCache.delete(key); return null; }
  return e.data;
}

function setCache(key, data) {
  if (analysisCache.size >= MAX_CACHE_SIZE) analysisCache.delete(analysisCache.keys().next().value);
  analysisCache.set(key, { data, ts: Date.now() });
}

// ─── Build Groq prompt from STRUCTURED ML results (no raw image) ─────────────
function buildXrayGroqPrompt(analysisResult, userRole) {
  const { bodyRegion, findings, quality, riskLevel, status } = analysisResult;

  const lines = [
    'You are a radiology AI assistant explaining X-ray analysis results to a healthcare user.',
    `The user's role is: ${userRole}.`,
    '',
    '── X-Ray ML Analysis Results ──',
    '',
    `Body Region Detected: ${bodyRegion.label} (confidence: ${(bodyRegion.confidence * 100).toFixed(1)}%)`,
    `Overall Risk Level: ${riskLevel}`,
    `Analysis Status: ${status}`,
    `Image Quality: ${(quality.quality * 100).toFixed(0)}%`,
  ];

  if (quality.issues.length > 0) {
    lines.push(`Quality Issues: ${quality.issues.join('; ')}`);
  }

  lines.push('');

  if (findings.length === 0) {
    lines.push('Findings: No significant abnormalities detected by the ML model.');
  } else {
    lines.push(`Findings (${findings.length}):`);
    findings.forEach((f, i) => {
      lines.push(`  ${i + 1}. ${f.finding}`);
      lines.push(`     Confidence: ${(f.confidence * 100).toFixed(0)}%`);
      lines.push(`     Risk: ${f.riskLevel}`);
      lines.push(`     Location: ${f.region}`);
      if (f.indicators?.length) {
        lines.push(`     Evidence: ${f.indicators.join('; ')}`);
      }
    });
  }

  lines.push('');
  lines.push('── Instructions ──');
  lines.push('1. Explain the body region identification and what it means.');
  lines.push('2. For each finding, explain in clear language appropriate for the user role.');
  lines.push('3. If any finding has confidence below 50%, clearly state it is uncertain.');
  lines.push('4. Provide clinical significance and recommended next steps.');
  lines.push('5. Note the overall risk level and urgency.');
  if (status === 'uncertain') {
    lines.push('6. IMPORTANT: The analysis is flagged as UNCERTAIN. Emphasise that professional review is strongly recommended.');
  }
  lines.push('7. End with: "This is an AI-assisted analysis and not a medical diagnosis. Please consult a qualified medical professional."');

  return lines.join('\n');
}

// ─── POST /api/xray/analyze ──────────────────────────────────────────────────
router.post('/analyze', protect, upload.single('image'), async (req, res) => {
  const startTime = Date.now();

  if (!req.file) {
    return res.status(400).json({
      error: 'X-ray image is required',
      hint: 'Send multipart/form-data with field name "image"',
    });
  }

  console.log(`[XRAY-ROUTE] Received: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

  try {
    // ── Cache check ──
    const key = cacheKey(req.file.buffer);
    const cached = getCached(key);
    if (cached) {
      console.log('[XRAY-ROUTE] Cache hit');
      return res.json({ ...cached, cached: true });
    }

    // ── Step 1: ML Analysis Pipeline ──
    // (CNN feature extraction → body region classification →
    //  abnormality detection → heatmap → quality assessment)
    const analysisResult = await analyzeXrayAdvanced(req.file.buffer, {
      originalName: req.file.originalname,
      fileSizeKB: +(req.file.size / 1024).toFixed(1),
    });

    console.log(`[XRAY-ROUTE] ML analysis complete: ${analysisResult.bodyRegion.label}, ${analysisResult.findings.length} finding(s)`);

    // ── Step 2: Groq LLM Explanation (receives ONLY structured data) ──
    const userRole = req.user?.role || 'patient';
    let aiExplanation = '';

    try {
      const prompt = buildXrayGroqPrompt(analysisResult, userRole);
      aiExplanation = await generateAIResponse(
        prompt,
        { category: 'radiology', severity: analysisResult.riskLevel === 'high' ? 'high' : 'medium' },
        [],
        userRole,
        {
          imageType: 'xray',
          bodyRegion: analysisResult.bodyRegion.label,
          visualFinding: analysisResult.primaryFinding,
          confidence: analysisResult.confidence,
          findings: analysisResult.findings,
          lowConfidence: analysisResult.confidence < 0.5,
        },
      );
    } catch (aiErr) {
      console.error('[XRAY-ROUTE] Groq explanation failed:', aiErr?.message);
      aiExplanation = [
        `Body region detected: ${analysisResult.bodyRegion.label} (${(analysisResult.bodyRegion.confidence * 100).toFixed(0)}% confidence).`,
        `Primary finding: ${analysisResult.primaryFinding}.`,
        `Confidence: ${(analysisResult.confidence * 100).toFixed(0)}%.`,
        'Please consult a medical professional for proper diagnosis.',
        'This analysis is informational and not a medical diagnosis.',
      ].join(' ');
    }

    // ── Step 3: Classify confidence level ──
    let confidenceLevel;
    if (analysisResult.confidence < 0.5) confidenceLevel = 'uncertain';
    else if (analysisResult.confidence <= 0.8) confidenceLevel = 'moderate';
    else confidenceLevel = 'high';

    const processingTime = Date.now() - startTime;

    const payload = {
      success: true,

      // Body region (NEW)
      bodyRegion: analysisResult.bodyRegion,

      // Primary result
      primaryFinding: analysisResult.primaryFinding,
      confidence: analysisResult.confidence,
      confidenceLevel,
      riskLevel: analysisResult.riskLevel,
      status: analysisResult.status,

      // All findings
      findings: analysisResult.findings,

      // AI explanation
      aiExplanation,

      // Heatmap (NEW)
      heatmap: analysisResult.heatmap,

      // Image quality
      quality: analysisResult.quality,

      // Technical details
      details: analysisResult.details,
      metadata: analysisResult.metadata,

      // Performance
      processingTimeMs: processingTime,
      cached: false,

      // Safety
      disclaimer: 'This is an AI-assisted analysis and not a medical diagnosis. Please consult a qualified medical professional for accurate evaluation.',
    };

    setCache(key, payload);
    console.log(`[XRAY-ROUTE] Response sent in ${processingTime}ms`);
    res.json(payload);
  } catch (error) {
    console.error('[XRAY-ROUTE] Analysis error:', error?.message || error);
    res.status(500).json({
      error: 'X-ray analysis failed',
      details: error?.message || 'Unknown error',
      status: 'uncertain',
      disclaimer: 'This analysis is informational and not a medical diagnosis.',
    });
  }
});

// ─── Health check ────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'xray-analysis-ml',
    cacheSize: analysisCache.size,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
