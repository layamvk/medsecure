// imageAnalysisService.js
// Lightweight placeholder for image-based symptom analysis.
// Currently uses simple heuristics; can be replaced with a real vision model.

/**
 * Analyze an uploaded symptom image and return a coarse visual finding.
 *
 * @param {Express.Multer.File} file - Uploaded image file (memory storage).
 * @returns {Promise<{visualFinding: string|null, confidence: number}>}
 */
async function analyzeImage(file) {
  if (!file) {
    return { visualFinding: null, confidence: 0 };
  }

  const name = (file.originalname || '').toLowerCase();

  let visualFinding = 'non-specific finding';
  let confidence = 0.4;

  if (name.includes('rash')) {
    visualFinding = 'rash or skin irritation visible on the photo';
    confidence = 0.78;
  } else if (name.includes('wound') || name.includes('cut') || name.includes('laceration')) {
    visualFinding = 'open wound or cut visible on the photo';
    confidence = 0.82;
  } else if (name.includes('swelling') || name.includes('swollen')) {
    visualFinding = 'localised swelling visible on the photo';
    confidence = 0.75;
  } else if (name.includes('red') || name.includes('redness')) {
    visualFinding = 'redness or inflammation visible on the photo';
    confidence = 0.7;
  }

  return { visualFinding, confidence };
}

module.exports = { analyzeImage };
