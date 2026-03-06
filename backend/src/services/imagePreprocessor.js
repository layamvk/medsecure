/**
 * Image Preprocessor Service
 * Resizes, normalizes, denoises, and extracts region-of-interest metadata
 * from uploaded medical images before they reach analysis modules.
 *
 * Uses `sharp` for all manipulations (no native OpenCV dependency).
 */

const sharp = require('sharp');

/** Standard dimensions for each analysis pipeline */
const TARGET_SIZES = {
  xray: { width: 512, height: 512 },
  prescription: { width: 1024, height: 1024 },
  injury: { width: 512, height: 512 },
  skin: { width: 512, height: 512 },
  default: { width: 512, height: 512 },
};

/**
 * Preprocess a raw image buffer for downstream analysis.
 *
 * Steps:
 *  1. Decode & extract metadata (width, height, channels, format)
 *  2. Convert to sRGB colour space, strip alpha
 *  3. Resize to target dimensions (preserving aspect via `contain`)
 *  4. Median denoise (3×3 kernel)
 *  5. Normalise (auto-level brightness/contrast)
 *  6. Export as PNG buffer for deterministic downstream consumption
 *
 * @param {Buffer} buffer  – Raw image bytes (JPEG, PNG, WEBP, TIFF accepted)
 * @param {string} [pipelineHint='default'] – One of xray|prescription|injury|skin|default
 * @returns {Promise<{processed: Buffer, metadata: object}>}
 */
async function preprocessImage(buffer, pipelineHint = 'default') {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('preprocessImage: expected a Buffer');
  }

  const rawMeta = await sharp(buffer).metadata();

  const { width: tw, height: th } = TARGET_SIZES[pipelineHint] || TARGET_SIZES.default;

  const processed = await sharp(buffer)
    .rotate()                         // auto-orient via EXIF
    .toColourspace('srgb')
    .removeAlpha()
    .resize(tw, th, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0 },
    })
    .median(3)                        // light denoise
    .normalise()                      // auto-level brightness/contrast
    .png({ compressionLevel: 6 })
    .toBuffer();

  const metadata = {
    originalWidth: rawMeta.width,
    originalHeight: rawMeta.height,
    originalFormat: rawMeta.format,
    channels: rawMeta.channels,
    processedWidth: tw,
    processedHeight: th,
    processedFormat: 'png',
  };

  return { processed, metadata };
}

/**
 * Lightweight colour-histogram analysis used by the image-type detector
 * and injury module. Returns average R/G/B and brightness.
 *
 * @param {Buffer} buffer – Preprocessed PNG buffer (sRGB, no alpha).
 * @returns {Promise<{avgR: number, avgG: number, avgB: number, brightness: number}>}
 */
async function computeColorStats(buffer) {
  const { data, info } = await sharp(buffer)
    .resize(64, 64, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let totalR = 0, totalG = 0, totalB = 0;
  const pixels = info.width * info.height;

  for (let i = 0; i < data.length; i += 3) {
    totalR += data[i];
    totalG += data[i + 1];
    totalB += data[i + 2];
  }

  const avgR = totalR / pixels;
  const avgG = totalG / pixels;
  const avgB = totalB / pixels;
  const brightness = (avgR + avgG + avgB) / 3;

  return { avgR, avgG, avgB, brightness };
}

/**
 * Extract edge-density score (approximates amount of structure/detail).
 * Used by X-ray and injury detectors.
 *
 * @param {Buffer} buffer – Preprocessed PNG buffer.
 * @returns {Promise<number>} – Value between 0 and 1.
 */
async function computeEdgeDensity(buffer) {
  // Greyscale → Laplacian-approximation via sharpen convolution
  const { data, info } = await sharp(buffer)
    .resize(128, 128, { fit: 'fill' })
    .greyscale()
    .convolve({
      width: 3,
      height: 3,
      kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0],
      scale: 1,
      offset: 128,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += Math.abs(data[i] - 128);
  }
  const density = sum / (data.length * 128);
  return Math.min(density, 1);
}

module.exports = {
  preprocessImage,
  computeColorStats,
  computeEdgeDensity,
  TARGET_SIZES,
};
