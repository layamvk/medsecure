/**
 * X-Ray Analysis Routes
 *
 * Dedicated endpoint for the X-Ray Analysis page.
 * Separate from the general AI chat endpoint.
 *
 * POST /api/xray/analyze
 *   - Accepts multipart/form-data with field `image`
 *   - Runs advanced X-ray preprocessing + analysis
 *   - Sends findings to Groq LLM for medical explanation
 *   - Returns structured results with confidence & risk levels
 */

const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { protect } = require('../middleware/auth');
const { analyzeXrayAdvanced } = require('../services/xrayAdvancedAnalyzer');
const { generateAIResponse } = require('../services/aiResponseService');
const { analyzeQuery } = require('../services/mlClassifier');

const router = express.Router();

// ─── Multer config for X-ray uploads (up to 15 MB) ──────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff', 'image/dicom'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Accepted: JPEG, PNG, WEBP, TIFF.'), false);
    }
  },
});

// ─── Image cache for repeated analyses ───────────────────────────────────────
const analysisCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50;

function getCacheKey(buffer) {
  // Simple hash based on buffer length + first/last bytes
  const len = buffer.length;
  const head = buffer.slice(0, Math.min(64, len)).toString('hex');
  const tail = buffer.slice(Math.max(0, len - 64)).toString('hex');
  return `${len}_${head}_${tail}`;
}

function getCached(key) {
  const entry = analysisCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    analysisCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  if (analysisCache.size >= MAX_CACHE_SIZE) {
    // Evict oldest
    const oldest = analysisCache.keys().next().value;
    analysisCache.delete(oldest);
  }
  analysisCache.set(key, { data, timestamp: Date.now() });
}

// ─── X-ray specific preprocessing ───────────────────────────────────────────
async function preprocessXray(buffer) {
  const rawMeta = await sharp(buffer).metadata();

  // Step 1: High-resolution resize (preserve detail)
  const targetSize = 1024;

  const processed = await sharp(buffer)
    .rotate()                          // auto-orient via EXIF
    .toColourspace('srgb')
    .removeAlpha()
    .resize(targetSize, targetSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0 },
    })
    .median(3)                         // light denoise
    .normalise()                       // auto-level brightness/contrast
    .sharpen({ sigma: 1.0 })           // enhance edges slightly
    .png({ compressionLevel: 6 })
    .toBuffer();

  // Step 2: Create a contrast-enhanced version for analysis
  const contrastEnhanced = await sharp(buffer)
    .rotate()
    .toColourspace('srgb')
    .removeAlpha()
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0 } })
    .normalise()
    .linear(1.3, -20)                  // contrast boost
    .median(3)
    .png({ compressionLevel: 6 })
    .toBuffer();

  const metadata = {
    originalWidth: rawMeta.width,
    originalHeight: rawMeta.height,
    originalFormat: rawMeta.format,
    channels: rawMeta.channels,
    processedWidth: targetSize,
    processedHeight: targetSize,
    processedFormat: 'png',
    aspectRatio: rawMeta.width && rawMeta.height ? (rawMeta.width / rawMeta.height).toFixed(2) : 'unknown',
    fileSizeKB: (buffer.length / 1024).toFixed(1),
  };

  return { processed, contrastEnhanced, metadata };
}

// ─── Build Groq prompt specifically for X-ray ────────────────────────────────
function buildXrayPrompt(findings, quality, userRole) {
  const lines = [
    'You are analysing chest/skeletal X-ray findings from an automated image analysis system.',
    `User role: ${userRole}`,
    '',
    `Image quality score: ${quality.quality}/1.0`,
  ];

  if (quality.issues.length > 0) {
    lines.push(`Quality issues: ${quality.issues.join('; ')}`);
  }

  lines.push('');
  lines.push('Detected findings:');

  findings.forEach((f, i) => {
    lines.push(`  ${i + 1}. ${f.finding}`);
    lines.push(`     Confidence: ${(f.confidence * 100).toFixed(0)}%`);
    lines.push(`     Risk level: ${f.riskLevel}`);
    lines.push(`     Region: ${f.region}`);
    if (f.indicators && f.indicators.length > 0) {
      lines.push(`     Indicators: ${f.indicators.join(', ')}`);
    }
  });

  lines.push('');
  lines.push('Task:');
  lines.push('1. Explain each finding in clear, non-technical language suitable for the user role.');
  lines.push('2. If confidence is below 60%, clearly state the finding is uncertain.');
  lines.push('3. Provide clinical significance in simple terms.');
  lines.push('4. Recommend appropriate next steps (specialist consultation, follow-up imaging, etc.).');
  lines.push('5. Note the overall risk level and urgency.');
  lines.push('6. Always end with: "This analysis is informational and not a medical diagnosis. Please consult a qualified medical professional."');

  return lines.join('\n');
}

// ─── POST /api/xray/analyze ──────────────────────────────────────────────────
router.post('/analyze', protect, upload.single('image'), async (req, res) => {
  const startTime = Date.now();

  if (!req.file) {
    return res.status(400).json({
      error: 'X-ray image is required',
      hint: 'Send a multipart/form-data request with field name "image"',
    });
  }

  console.log(`[XRAY-ROUTE] Received X-ray: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

  try {
    // Check cache first
    const cacheKey = getCacheKey(req.file.buffer);
    const cached = getCached(cacheKey);
    if (cached) {
      console.log('[XRAY-ROUTE] Cache hit — returning cached result');
      return res.json({ ...cached, cached: true });
    }

    // Step 1: X-ray specific preprocessing
    const { processed, contrastEnhanced, metadata } = await preprocessXray(req.file.buffer);
    console.log('[XRAY-ROUTE] Preprocessing complete:', JSON.stringify(metadata));

    // Step 2: Run advanced analysis (use contrast-enhanced version for better accuracy)
    const analysisResult = await analyzeXrayAdvanced(contrastEnhanced, metadata);
    console.log(`[XRAY-ROUTE] Analysis: ${analysisResult.findings.length} finding(s), primary: "${analysisResult.primaryFinding}"`);

    // Step 3: Generate AI explanation via Groq
    const userRole = req.user?.role || 'patient';
    let aiExplanation = '';
    try {
      const xrayPrompt = buildXrayPrompt(analysisResult.findings, analysisResult.quality, userRole);
      const mlAnalysis = analyzeQuery('analyze this xray image');

      aiExplanation = await generateAIResponse(
        xrayPrompt,
        { ...mlAnalysis, category: 'radiology', severity: analysisResult.riskLevel === 'high' ? 'high' : 'medium' },
        [],
        userRole,
        {
          imageType: 'xray',
          visualFinding: analysisResult.primaryFinding,
          confidence: analysisResult.confidence,
          findings: analysisResult.findings,
          lowConfidence: analysisResult.confidence < 0.5,
        }
      );
    } catch (aiErr) {
      console.error('[XRAY-ROUTE] Groq AI explanation failed:', aiErr?.message);
      aiExplanation = `Analysis detected: ${analysisResult.primaryFinding}. Confidence: ${(analysisResult.confidence * 100).toFixed(0)}%. Please consult a medical professional for proper diagnosis. This analysis is informational and not a medical diagnosis.`;
    }

    // Step 4: Classify confidence level
    let confidenceLevel;
    if (analysisResult.confidence < 0.5) {
      confidenceLevel = 'uncertain';
    } else if (analysisResult.confidence <= 0.8) {
      confidenceLevel = 'moderate';
    } else {
      confidenceLevel = 'high';
    }

    const processingTime = Date.now() - startTime;

    const responsePayload = {
      success: true,

      // Primary result
      primaryFinding: analysisResult.primaryFinding,
      confidence: analysisResult.confidence,
      confidenceLevel,
      riskLevel: analysisResult.riskLevel,

      // All findings
      findings: analysisResult.findings,

      // AI explanation
      aiExplanation,

      // Image quality
      quality: analysisResult.quality,

      // Technical details
      details: analysisResult.details,
      metadata,

      // Performance
      processingTimeMs: processingTime,
      cached: false,

      // Safety
      disclaimer: 'This analysis is informational and not a medical diagnosis. Please consult a qualified medical professional for accurate evaluation.',
    };

    // Cache the result
    setCache(cacheKey, responsePayload);

    console.log(`[XRAY-ROUTE] Response sent in ${processingTime}ms`);
    res.json(responsePayload);
  } catch (error) {
    console.error('[XRAY-ROUTE] Analysis error:', error?.message || error);
    res.status(500).json({
      error: 'X-ray analysis failed',
      details: error?.message || 'Unknown error',
      disclaimer: 'This analysis is informational and not a medical diagnosis.',
    });
  }
});

// ─── GET /api/xray/health — quick health/readiness check ────────────────────
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'xray-analysis',
    cacheSize: analysisCache.size,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
