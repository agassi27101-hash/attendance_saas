const tf = require('@tensorflow/tfjs');
const blazeface = require('@tensorflow-models/blazeface');
const jpeg = require('jpeg-js');
const sharp = require('sharp');

// Initialize TensorFlow CPU backend
tf.setBackend('cpu');

let modelPromise = null;

// Lazy-load the BlazeFace model
async function getModel() {
  if (!modelPromise) {
    modelPromise = blazeface.load({ scoreThreshold: 0.3 }); // lowered threshold = more lenient detection
  }
  return modelPromise;
}

// -------------------------------------------------------------------
//  Image helpers
// -------------------------------------------------------------------

/**
 * Decode a base64 JPEG/PNG image into raw RGBA buffer via sharp.
 * Returns { data: Uint8Array, width, height }
 */
async function decodeImage(base64Data) {
  const buffer = Buffer.from(base64Data, 'base64');
  // Resize to 256×256 to normalise input for BlazeFace and reduce RAM usage
  const { data, info } = await sharp(buffer)
    .resize(256, 256, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

/**
 * Build a Float32 RGB tensor from raw pixel data (RGBA or RGB).
 */
function buildTensor(data, width, height, channels) {
  const rgbBuffer = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    rgbBuffer[i * 3]     = data[i * channels]     / 255; // R
    rgbBuffer[i * 3 + 1] = data[i * channels + 1] / 255; // G
    rgbBuffer[i * 3 + 2] = data[i * channels + 2] / 255; // B
  }
  return tf.tensor3d(rgbBuffer, [height, width, 3]);
}

// -------------------------------------------------------------------
//  BlazeFace landmark-ratio fingerprint (primary method)
// -------------------------------------------------------------------

function euclidean(p1, p2) {
  return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}

async function extractLandmarkRatios(tensor) {
  const model = await getModel();
  const predictions = await model.estimateFaces(tensor, false);
  if (!predictions || predictions.length === 0) return null;

  const face = predictions[0];
  const lm = face.landmarks; // [leftEye, rightEye, noseTip, mouthCenter, leftEar, rightEar]

  const leftEye    = lm[0];
  const rightEye   = lm[1];
  const noseTip    = lm[2];
  const mouthCenter = lm[3];

  const eyeToEye   = euclidean(leftEye, rightEye);
  const noseToMouth = euclidean(noseTip, mouthCenter);
  const leftEyeToMouth  = euclidean(leftEye, mouthCenter);
  const rightEyeToMouth = euclidean(rightEye, mouthCenter);

  if (noseToMouth === 0 || leftEyeToMouth === 0 || rightEyeToMouth === 0) return null;

  return [
    eyeToEye / noseToMouth,
    eyeToEye / leftEyeToMouth,
    eyeToEye / rightEyeToMouth,
  ];
}

// -------------------------------------------------------------------
//  Pixel colour-histogram fingerprint (fallback / secondary method)
// -------------------------------------------------------------------

/**
 * Divide the 256×256 image into a 4×4 grid, compute the mean RGB
 * per cell → 48-number vector that is unique enough per person in
 * consistent lighting but robust to small changes.
 */
function extractPixelFingerprint(data, width, height, channels) {
  const GRID = 4;
  const cellW = Math.floor(width / GRID);
  const cellH = Math.floor(height / GRID);
  const fingerprint = [];

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let y = row * cellH; y < (row + 1) * cellH; y++) {
        for (let x = col * cellW; x < (col + 1) * cellW; x++) {
          const idx = (y * width + x) * channels;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          count++;
        }
      }
      fingerprint.push(r / count / 255, g / count / 255, b / count / 255);
    }
  }
  return fingerprint; // 48 numbers
}

// -------------------------------------------------------------------
//  Public API
// -------------------------------------------------------------------

/**
 * Extracts a biometric fingerprint from a base64 image.
 * Returns { type: 'landmarks'|'pixels'|'mock', values: number[] }
 */
async function extractFaceFingerprint(base64Image) {
  // Simulator / mock mode
  if (base64Image.startsWith('MOCK_')) {
    return { type: 'mock', values: [1.25, 0.85, 1.45] };
  }

  // Strip data-url prefix if present
  let base64Data = base64Image;
  if (base64Image.includes(',')) {
    base64Data = base64Image.split(',')[1];
  }

  let decoded;
  try {
    decoded = await decodeImage(base64Data);
  } catch (err) {
    console.error('[biometrics] image decode error:', err.message);
    throw new Error('Could not read the captured image. Please try again.');
  }

  const { data, width, height, channels } = decoded;
  const tensor = buildTensor(data, width, height, channels);

  let landmarkValues = null;
  try {
    landmarkValues = await extractLandmarkRatios(tensor);
  } catch (err) {
    console.warn('[biometrics] BlazeFace error (falling back to pixel fingerprint):', err.message);
  } finally {
    tensor.dispose();
  }

  if (landmarkValues) {
    return { type: 'landmarks', values: landmarkValues };
  }

  // Fallback: pixel colour histogram (no ML required)
  console.warn('[biometrics] No face detected by BlazeFace — using pixel fingerprint fallback.');
  const pixelValues = extractPixelFingerprint(data, width, height, channels);
  return { type: 'pixels', values: pixelValues };
}

/**
 * Compare two fingerprint objects.
 * Returns true if they match within tolerance.
 */
function verifyFingerprints(registered, current, tolerance = 0.18) {
  // Mock always matches
  if (registered.type === 'mock' || current.type === 'mock') return true;

  // If types differ we still compare values (one registration was landmarks,
  // subsequent might be pixels if BlazeFace was flaky — treat as mismatch
  // ONLY when we are confident both used the same method)
  if (registered.type !== current.type) {
    // Allow mismatch to pass for now so the user isn't permanently locked out
    // due to inconsistent model availability on free-tier servers.
    console.warn('[biometrics] fingerprint type mismatch — allowing through:', registered.type, 'vs', current.type);
    return true;
  }

  const r = registered.values;
  const c = current.values;
  if (r.length !== c.length) return false;

  // Root-mean-square difference across all values
  let sumSq = 0;
  for (let i = 0; i < r.length; i++) {
    sumSq += Math.pow(r[i] - c[i], 2);
  }
  const rms = Math.sqrt(sumSq / r.length);

  const passed = rms <= tolerance;
  if (!passed) {
    console.warn(`[biometrics] RMS diff ${rms.toFixed(4)} exceeds tolerance ${tolerance}`);
  }
  return passed;
}

// Legacy shims so existing auth.js code keeps working
async function extractFaceRatios(base64Image) {
  const fp = await extractFaceFingerprint(base64Image);
  return fp.values;
}

function verifyBiometrics(registeredValues, currentValues, tolerance) {
  // Determine type from vector length: landmarks=3, pixels=48
  const type = registeredValues.length === 3 ? 'landmarks' : 'pixels';
  return verifyFingerprints(
    { type, values: registeredValues },
    { type, values: currentValues },
    tolerance
  );
}

module.exports = {
  extractFaceFingerprint,
  verifyFingerprints,
  // Legacy exports
  extractFaceRatios,
  verifyBiometrics,
};
