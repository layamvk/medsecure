/**
 * X-Ray ML Engine
 *
 * Core machine-learning engine for X-ray image analysis.
 * Uses TensorFlow.js with MobileNet V2 for CNN feature extraction,
 * and raw TF.js convolution operations for structural feature analysis.
 *
 * This module does NOT use Groq / LLM for detection — all detection
 * is performed by the CNN and signal-processing layers here.
 */

const tf = require('@tensorflow/tfjs');
const sharp = require('sharp');

// ─── Constants ───────────────────────────────────────────────────────────────
const INPUT_SIZE = 224;           // MobileNet V2 input resolution
const HEATMAP_GRID = 14;          // 14×14 heatmap grid (matching MobileNet spatial dim)
const MOBILENET_FEATURE_DIM = 1280;
const FALLBACK_FEATURE_DIM = 256;

// MobileNet V2 feature-vector model (no top — returns 1280-dim embedding)
const MOBILENET_URLS = [
  'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v2_100_224/feature_vector/3/default/1',
];

// ─── Singleton Engine ────────────────────────────────────────────────────────
class XRayMLEngine {
  constructor() {
    this.model = null;
    this.modelType = null;        // 'mobilenet' | 'fallback'
    this.featureDim = 0;
    this.isReady = false;
    this._initPromise = null;
  }

  /* ── Initialisation (lazy, called once) ──────────────────────────────────── */

  async initialize() {
    if (this.isReady) return;
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  async _doInit() {
    // Attempt to load MobileNet V2
    for (const url of MOBILENET_URLS) {
      try {
        console.log(`[ML-ENGINE] Loading MobileNet V2 from ${url.slice(0, 60)}…`);
        this.model = await tf.loadGraphModel(url, { fromTFHub: true });
        this.modelType = 'mobilenet';
        this.featureDim = MOBILENET_FEATURE_DIM;

        // Warm-up inference (first call is slow due to JIT)
        const dummy = tf.zeros([1, INPUT_SIZE, INPUT_SIZE, 3]);
        const warmup = this.model.predict(dummy);
        warmup.dispose();
        dummy.dispose();

        console.log('[ML-ENGINE] MobileNet V2 loaded & warmed up');
        this.isReady = true;
        return;
      } catch (err) {
        console.warn(`[ML-ENGINE] MobileNet load failed: ${err.message}`);
      }
    }

    // Fallback: lightweight custom CNN
    console.log('[ML-ENGINE] Building fallback CNN feature extractor…');
    this.model = this._buildFallbackCNN();
    this.modelType = 'fallback';
    this.featureDim = FALLBACK_FEATURE_DIM;
    this.isReady = true;
    console.log('[ML-ENGINE] Fallback CNN ready');
  }

  /**
   * Build a small custom CNN entirely in TF.js layers API.
   * Uses random initialisation — the features capture structural patterns
   * (edges, textures, shapes) which are useful for body-region classification
   * when combined with the hand-crafted structural features below.
   */
  _buildFallbackCNN() {
    const model = tf.sequential();
    model.add(tf.layers.conv2d({
      inputShape: [INPUT_SIZE, INPUT_SIZE, 3],
      filters: 32, kernelSize: 5, strides: 2,
      padding: 'same', activation: 'relu',
    }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
    model.add(tf.layers.conv2d({ filters: 64, kernelSize: 3, padding: 'same', activation: 'relu' }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
    model.add(tf.layers.conv2d({ filters: 128, kernelSize: 3, padding: 'same', activation: 'relu' }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
    model.add(tf.layers.conv2d({ filters: FALLBACK_FEATURE_DIM, kernelSize: 3, padding: 'same', activation: 'relu' }));
    model.add(tf.layers.globalAveragePooling2d());
    return model;
  }

  /* ── Image Preprocessing (sharp → raw RGB buffer) ────────────────────────── */

  async _toRawRGB(buffer) {
    const raw = await sharp(buffer)
      .rotate()                         // auto EXIF orientation
      .toColourspace('srgb')
      .removeAlpha()
      .resize(INPUT_SIZE, INPUT_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0 },
      })
      .normalise()                     // auto-level brightness/contrast
      .raw()
      .toBuffer();
    return new Uint8Array(raw);
  }

  async _getImageMetadata(buffer) {
    const meta = await sharp(buffer).metadata();
    return {
      originalWidth: meta.width || 0,
      originalHeight: meta.height || 0,
      format: meta.format || 'unknown',
      channels: meta.channels || 0,
      aspectRatio: meta.width && meta.height
        ? +(meta.width / meta.height).toFixed(3)
        : 1.0,
    };
  }

  /* ── CNN Feature Extraction ──────────────────────────────────────────────── */

  async extractCNNFeatures(imageBuffer) {
    await this.initialize();
    const raw = await this._toRawRGB(imageBuffer);

    const features = tf.tidy(() => {
      const tensor = tf.tensor3d(raw, [INPUT_SIZE, INPUT_SIZE, 3]);
      const normalised = tensor.toFloat().div(255.0);
      const batched = normalised.expandDims(0);
      const featureVec = this.model.predict(batched);
      return featureVec.dataSync();       // Float32Array
    });

    return Array.from(features);
  }

  /* ── Structural Feature Extraction (hand-crafted, using TF.js ops) ──────── */

  async extractStructuralFeatures(imageBuffer) {
    const raw = await this._toRawRGB(imageBuffer);
    const meta = await this._getImageMetadata(imageBuffer);

    const features = tf.tidy(() => {
      const tensor = tf.tensor3d(raw, [INPUT_SIZE, INPUT_SIZE, 3]);
      const norm = tensor.toFloat().div(255.0);

      // Grayscale [H, W]
      const gray = tf.mean(norm, 2);
      const grayData = gray.dataSync();
      const N = INPUT_SIZE * INPUT_SIZE;

      // ── 1. Intensity statistics ──
      let sum = 0, sumSq = 0;
      for (let i = 0; i < N; i++) { sum += grayData[i]; sumSq += grayData[i] ** 2; }
      const mean = sum / N;
      const variance = (sumSq / N) - (mean ** 2);
      const stdDev = Math.sqrt(Math.max(0, variance));

      // ── 2. Intensity histogram (10 bins) ──
      const histogram = new Float32Array(10);
      for (let i = 0; i < N; i++) {
        const bin = Math.min(9, Math.floor(grayData[i] * 10));
        histogram[bin]++;
      }
      for (let b = 0; b < 10; b++) histogram[b] /= N;

      // ── 3. Bone density ratio (bright pixels > 0.7) ──
      let bonePixels = 0;
      for (let i = 0; i < N; i++) if (grayData[i] > 0.7) bonePixels++;
      const boneDensityRatio = bonePixels / N;

      // ── 4. Air / dark ratio (< 0.2) ──
      let darkPixels = 0;
      for (let i = 0; i < N; i++) if (grayData[i] < 0.2) darkPixels++;
      const airRatio = darkPixels / N;

      // ── 5. Left-right symmetry ──
      const half = INPUT_SIZE / 2;
      let symDiff = 0;
      for (let y = 0; y < INPUT_SIZE; y++) {
        for (let x = 0; x < half; x++) {
          const L = grayData[y * INPUT_SIZE + x];
          const R = grayData[y * INPUT_SIZE + (INPUT_SIZE - 1 - x)];
          symDiff += Math.abs(L - R);
        }
      }
      const symmetryScore = 1.0 - (symDiff / (N / 2));

      // ── 6. Top-bottom symmetry ──
      const halfV = INPUT_SIZE / 2;
      let symDiffV = 0;
      for (let y = 0; y < halfV; y++) {
        for (let x = 0; x < INPUT_SIZE; x++) {
          const T = grayData[y * INPUT_SIZE + x];
          const B = grayData[(INPUT_SIZE - 1 - y) * INPUT_SIZE + x];
          symDiffV += Math.abs(T - B);
        }
      }
      const topBottomSymmetry = 1.0 - (symDiffV / (N / 2));

      // ── 7. Sobel edge detection ──
      const gray4d = gray.reshape([1, INPUT_SIZE, INPUT_SIZE, 1]);
      const sobelXK = tf.tensor4d([-1,0,1, -2,0,2, -1,0,1], [3, 3, 1, 1]);
      const sobelYK = tf.tensor4d([-1,-2,-1, 0,0,0, 1,2,1], [3, 3, 1, 1]);

      const edgesX = tf.conv2d(gray4d, sobelXK, 1, 'same').squeeze();
      const edgesY = tf.conv2d(gray4d, sobelYK, 1, 'same').squeeze();
      const edgeMag = tf.sqrt(tf.add(tf.square(edgesX), tf.square(edgesY)));
      const edgeDensity = tf.mean(edgeMag).dataSync()[0];

      const exData = edgesX.dataSync();
      const eyData = edgesY.dataSync();
      let hEdge = 0, vEdge = 0, dEdge = 0;
      for (let i = 0; i < N; i++) {
        const mag = Math.sqrt(exData[i] ** 2 + eyData[i] ** 2);
        if (mag > 0.04) {
          const angle = Math.atan2(Math.abs(eyData[i]), Math.abs(exData[i]));
          if (angle < Math.PI / 6) hEdge += mag;
          else if (angle > Math.PI / 3) vEdge += mag;
          else dEdge += mag;
        }
      }
      const totalEdge = hEdge + vEdge + dEdge + 1e-8;

      // ── 8. 4×4 regional density grid ──
      const regionSize = INPUT_SIZE / 4;
      const regionalDensity = [];
      for (let gy = 0; gy < 4; gy++) {
        for (let gx = 0; gx < 4; gx++) {
          let rSum = 0, rCount = 0;
          for (let y = gy * regionSize; y < (gy + 1) * regionSize; y++) {
            for (let x = gx * regionSize; x < (gx + 1) * regionSize; x++) {
              rSum += grayData[y * INPUT_SIZE + x];
              rCount++;
            }
          }
          regionalDensity.push(rSum / rCount);
        }
      }

      // ── 9. Central vs peripheral brightness ──
      const quarter = INPUT_SIZE / 4;
      let centralSum = 0, centralCount = 0;
      let peripheralSum = 0, peripheralCount = 0;
      for (let y = 0; y < INPUT_SIZE; y++) {
        for (let x = 0; x < INPUT_SIZE; x++) {
          const v = grayData[y * INPUT_SIZE + x];
          if (x >= quarter && x < 3 * quarter && y >= quarter && y < 3 * quarter) {
            centralSum += v; centralCount++;
          } else {
            peripheralSum += v; peripheralCount++;
          }
        }
      }
      const centralBrightness = centralSum / (centralCount || 1);
      const peripheralBrightness = peripheralSum / (peripheralCount || 1);

      // ── 10. Compactness (ratio of bright area to total) ──
      const foregroundThresh = 0.15;
      let fgPixels = 0, fgMinX = INPUT_SIZE, fgMaxX = 0, fgMinY = INPUT_SIZE, fgMaxY = 0;
      for (let y = 0; y < INPUT_SIZE; y++) {
        for (let x = 0; x < INPUT_SIZE; x++) {
          if (grayData[y * INPUT_SIZE + x] > foregroundThresh) {
            fgPixels++;
            if (x < fgMinX) fgMinX = x;
            if (x > fgMaxX) fgMaxX = x;
            if (y < fgMinY) fgMinY = y;
            if (y > fgMaxY) fgMaxY = y;
          }
        }
      }
      const fgWidth = fgMaxX - fgMinX + 1;
      const fgHeight = fgMaxY - fgMinY + 1;
      const fgAspectRatio = fgWidth / (fgHeight || 1);
      const fillRatio = fgPixels / (fgWidth * fgHeight || 1);

      // ── 11. Edge spatial distribution (quadrant edge density) ──
      const edgeMagData = edgeMag.dataSync();
      const quadrantEdge = [0, 0, 0, 0]; // TL, TR, BL, BR
      for (let y = 0; y < INPUT_SIZE; y++) {
        for (let x = 0; x < INPUT_SIZE; x++) {
          const idx = y * INPUT_SIZE + x;
          const qIdx = (y < half ? 0 : 2) + (x < half ? 0 : 1);
          quadrantEdge[qIdx] += edgeMagData[idx];
        }
      }
      const qTotal = quadrantEdge.reduce((a, b) => a + b, 0) || 1;
      const quadrantEdgeRatio = quadrantEdge.map(q => q / qTotal);

      return {
        mean,
        variance,
        stdDev,
        histogram: Array.from(histogram),
        boneDensityRatio,
        airRatio,
        symmetryScore,
        topBottomSymmetry,
        edgeDensity,
        edgeOrientation: {
          horizontal: hEdge / totalEdge,
          vertical: vEdge / totalEdge,
          diagonal: dEdge / totalEdge,
        },
        regionalDensity,
        centralBrightness,
        peripheralBrightness,
        fgAspectRatio,
        fillRatio,
        quadrantEdgeRatio,
        originalAspectRatio: meta.aspectRatio,
      };
    });

    return features;
  }

  /* ── Heatmap — regional deviation from expected pattern ─────────────────── */

  async generateHeatmap(imageBuffer) {
    const raw = await this._toRawRGB(imageBuffer);
    const gridSize = HEATMAP_GRID;
    const cellSize = Math.floor(INPUT_SIZE / gridSize);

    const heatmapData = tf.tidy(() => {
      const tensor = tf.tensor3d(raw, [INPUT_SIZE, INPUT_SIZE, 3]);
      const norm = tensor.toFloat().div(255.0);
      const gray = tf.mean(norm, 2);
      const grayData = gray.dataSync();

      // Sobel edge magnitude
      const gray4d = gray.reshape([1, INPUT_SIZE, INPUT_SIZE, 1]);
      const sx = tf.tensor4d([-1,0,1, -2,0,2, -1,0,1], [3,3,1,1]);
      const sy = tf.tensor4d([-1,-2,-1, 0,0,0, 1,2,1], [3,3,1,1]);
      const ex = tf.conv2d(gray4d, sx, 1, 'same').squeeze();
      const ey = tf.conv2d(gray4d, sy, 1, 'same').squeeze();
      const eMag = tf.sqrt(tf.add(tf.square(ex), tf.square(ey)));
      const eMagData = eMag.dataSync();

      const cells = [];
      for (let gy = 0; gy < gridSize; gy++) {
        for (let gx = 0; gx < gridSize; gx++) {
          let iSum = 0, eSum = 0, cnt = 0;
          for (let y = gy * cellSize; y < Math.min((gy + 1) * cellSize, INPUT_SIZE); y++) {
            for (let x = gx * cellSize; x < Math.min((gx + 1) * cellSize, INPUT_SIZE); x++) {
              const idx = y * INPUT_SIZE + x;
              iSum += grayData[idx];
              eSum += eMagData[idx];
              cnt++;
            }
          }
          // Combine intensity + edge activity → activation score
          const avgIntensity = iSum / (cnt || 1);
          const avgEdge = eSum / (cnt || 1);
          cells.push(avgEdge * 0.6 + avgIntensity * 0.4);
        }
      }

      // Normalise to [0, 1]
      const max = Math.max(...cells);
      const min = Math.min(...cells);
      const range = max - min || 1;
      return cells.map(v => +((v - min) / range).toFixed(4));
    });

    return { width: gridSize, height: gridSize, data: heatmapData };
  }

  /* ── Quality Assessment ─────────────────────────────────────────────────── */

  async assessQuality(imageBuffer) {
    const raw = await this._toRawRGB(imageBuffer);
    const meta = await this._getImageMetadata(imageBuffer);

    const assessment = tf.tidy(() => {
      const tensor = tf.tensor3d(raw, [INPUT_SIZE, INPUT_SIZE, 3]);
      const norm = tensor.toFloat().div(255.0);
      const gray = tf.mean(norm, 2);
      const grayData = gray.dataSync();
      const N = grayData.length;

      // Brightness / exposure
      let sum = 0;
      for (let i = 0; i < N; i++) sum += grayData[i];
      const meanBrightness = sum / N;

      // Contrast
      let min = 1, max = 0;
      for (let i = 0; i < N; i++) {
        if (grayData[i] < min) min = grayData[i];
        if (grayData[i] > max) max = grayData[i];
      }
      const contrast = max - min;

      // Sharpness (Laplacian variance)
      const lap = tf.tensor4d([0,-1,0, -1,4,-1, 0,-1,0], [3,3,1,1]);
      const gray4d = gray.reshape([1, INPUT_SIZE, INPUT_SIZE, 1]);
      const lapResult = tf.conv2d(gray4d, lap, 1, 'same').squeeze();
      const lapData = lapResult.dataSync();
      let lapSum = 0, lapSumSq = 0;
      for (let i = 0; i < N; i++) { lapSum += lapData[i]; lapSumSq += lapData[i] ** 2; }
      const lapMean = lapSum / N;
      const sharpness = Math.min(1, (lapSumSq / N - lapMean ** 2) * 150);

      return { meanBrightness, contrast, sharpness, originalRes: meta.originalWidth * meta.originalHeight };
    });

    const issues = [];
    let quality = 1.0;

    if (assessment.meanBrightness < 0.15) { issues.push('Image appears underexposed (too dark)'); quality -= 0.2; }
    if (assessment.meanBrightness > 0.85) { issues.push('Image appears overexposed (too bright)'); quality -= 0.2; }
    if (assessment.contrast < 0.3) { issues.push('Low contrast — details may be lost'); quality -= 0.15; }
    if (assessment.sharpness < 0.2) { issues.push('Image may be blurry or low resolution'); quality -= 0.15; }
    if (assessment.originalRes < 100 * 100) { issues.push('Very low resolution source image'); quality -= 0.25; }

    return {
      quality: Math.max(0, Math.min(1, +quality.toFixed(2))),
      issues,
      metrics: {
        brightness: +assessment.meanBrightness.toFixed(3),
        contrast: +assessment.contrast.toFixed(3),
        sharpness: +assessment.sharpness.toFixed(3),
      },
    };
  }

  /* ── Convenience — full feature extraction in one call ──────────────────── */

  async extractAllFeatures(imageBuffer) {
    const [cnnFeatures, structural, heatmap, quality] = await Promise.all([
      this.extractCNNFeatures(imageBuffer),
      this.extractStructuralFeatures(imageBuffer),
      this.generateHeatmap(imageBuffer),
      this.assessQuality(imageBuffer),
    ]);
    const meta = await this._getImageMetadata(imageBuffer);
    return { cnnFeatures, structural, heatmap, quality, metadata: meta };
  }
}

// Export singleton
module.exports = new XRayMLEngine();
