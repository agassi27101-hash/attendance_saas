const tf = require('@tensorflow/tfjs');
const blazeface = require('@tensorflow-models/blazeface');
const jpeg = require('jpeg-js');

// Initialize TensorFlow CPU backend for pure JavaScript execution on Node
tf.setBackend('cpu');

let modelPromise = null;

// Lazy-load the BlazeFace model
async function getModel() {
  if (!modelPromise) {
    modelPromise = blazeface.load();
  }
  return modelPromise;
}

// Compute Euclidean distance between two 2D points
function distance(p1, p2) {
  return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}

/**
 * Extracts biometric landmark ratios from a base64 JPEG image.
 * Ratios are scale-invariant, making them robust to distance changes from camera.
 */
async function extractFaceRatios(base64Image) {
  if (base64Image.startsWith('MOCK_')) {
    return [1.25, 0.85, 1.45]; // Constant mock biometric ratios for simulator mode
  }
  let base64Data = base64Image;
  if (base64Image.includes(',')) {
    base64Data = base64Image.split(',')[1];
  }

  let rawImageData;
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    rawImageData = jpeg.decode(buffer, { useTArray: true });
  } catch (err) {
    throw new Error('Failed to decode JPEG image buffer. Ensure image is in JPEG format.');
  }

  const { width, height, data } = rawImageData;

  // Convert raw RGBA pixel data to a 3D float32 RGB tensor
  const rgbBuffer = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    rgbBuffer[i * 3] = data[i * 4] / 255;       // R
    rgbBuffer[i * 3 + 1] = data[i * 4 + 1] / 255; // G
    rgbBuffer[i * 3 + 2] = data[i * 4 + 2] / 255; // B
  }

  const imageTensor = tf.tensor3d(rgbBuffer, [height, width, 3]);

  // Detect faces
  const model = await getModel();
  const predictions = await model.estimateFaces(imageTensor, false);

  // Clean up tensor memory
  imageTensor.dispose();

  if (!predictions || predictions.length === 0) {
    throw new Error('No face detected in the image. Please try again with clear lighting.');
  }

  // Use the first detected face
  const face = predictions[0];
  const landmarks = face.landmarks; // array of 6 landmarks: leftEye, rightEye, noseTip, mouthCenter, leftEar, rightEar

  const leftEye = landmarks[0];
  const rightEye = landmarks[1];
  const noseTip = landmarks[2];
  const mouthCenter = landmarks[3];

  // Calculate face proportions:
  const eyeToEye = distance(leftEye, rightEye);
  const noseToMouth = distance(noseTip, mouthCenter);
  const leftEyeToMouth = distance(leftEye, mouthCenter);
  const rightEyeToMouth = distance(rightEye, mouthCenter);

  if (noseToMouth === 0 || leftEyeToMouth === 0 || rightEyeToMouth === 0) {
    throw new Error('Invalid facial landmark detection. Try looking directly at the camera.');
  }

  // Proportion ratios (scale invariant)
  const ratio1 = eyeToEye / noseToMouth;
  const ratio2 = eyeToEye / leftEyeToMouth;
  const ratio3 = eyeToEye / rightEyeToMouth;

  return [ratio1, ratio2, ratio3];
}

/**
 * Compares two biometric templates.
 * Returns true if all ratios match within the given tolerance.
 */
function verifyBiometrics(registeredRatios, currentRatios, tolerance = 0.15) {
  if (registeredRatios.length !== currentRatios.length) return false;

  for (let i = 0; i < registeredRatios.length; i++) {
    const diff = Math.abs(registeredRatios[i] - currentRatios[i]);
    const maxAllowedDiff = registeredRatios[i] * tolerance;
    if (diff > maxAllowedDiff) {
      return false; // exceeds matching tolerance
    }
  }
  return true;
}

module.exports = {
  extractFaceRatios,
  verifyBiometrics
};
