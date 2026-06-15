import * as faceapi from '@vladmandic/face-api';
import '@tensorflow/tfjs-backend-webgpu';

// Utility to calculate variance of Laplacian (blur detection)
function getBlurScore(imageData: ImageData, box: {x: number, y: number, width: number, height: number}): number {
  const { data, width: imgW } = imageData;
  const x0 = Math.max(0, Math.floor(box.x));
  const y0 = Math.max(0, Math.floor(box.y));
  const w = Math.min(imgW - x0, Math.floor(box.width));
  const h = Math.min(imageData.height - y0, Math.floor(box.height));

  if (w <= 0 || h <= 0) return 0;

  // Convert to grayscale
  const gray = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = ((y0 + y) * imgW + (x0 + x)) * 4;
      gray[y * w + x] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
  }

  // Laplacian kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0]
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const val = 
        gray[idx - w] + 
        gray[idx - 1] - 4 * gray[idx] + gray[idx + 1] + 
        gray[idx + w];
        
      sum += val;
      sumSq += val * val;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  const variance = (sumSq / count) - (mean * mean);
  return variance;
}

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
let modelsLoaded = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, id, data } = e.data;

  if (type === 'INIT') {
    if (modelsLoaded) {
      self.postMessage({ type: 'INIT_DONE' });
      return;
    }
    try {
      try {
         await (faceapi.tf as any).setBackend('webgpu');
         await (faceapi.tf as any).ready();
         console.log('Using WebGPU backend');
      } catch (e) {
         console.warn('WebGPU not available, falling back to default', e);
      }

      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      modelsLoaded = true;
      self.postMessage({ type: 'INIT_DONE' });
    } catch (err) {
      self.postMessage({ type: 'INIT_ERROR', error: String(err) });
    }
  }

  if (type === 'DETECT') {
    if (!modelsLoaded) {
      self.postMessage({ id, type: 'DETECT_ERROR', error: 'Models not loaded' });
      return;
    }
    try {
      const { imageData } = data;
      const tensor = faceapi.tf.browser.fromPixels(imageData);
      
      const detections = await faceapi
        .detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceExpressions()
        .withFaceDescriptors();
        
      tensor.dispose();

      const serializableDetections = detections.map(det => {
        const box = {
          x: det.detection.box.x,
          y: det.detection.box.y,
          width: det.detection.box.width,
          height: det.detection.box.height,
        };
        const blurScore = getBlurScore(imageData, box);
        return {
          box,
          descriptor: Array.from(det.descriptor), // convert Float32Array to array for serialization
          score: det.detection.score,
          blurScore,
          expressions: det.expressions,
        };
      });

      self.postMessage({ id, type: 'DETECT_DONE', result: serializableDetections });
    } catch (err) {
      self.postMessage({ id, type: 'DETECT_ERROR', error: String(err) });
    }
  }
};
