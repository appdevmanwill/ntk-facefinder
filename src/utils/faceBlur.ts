import * as faceapi from '@vladmandic/face-api';

// This runs on the main thread for export jobs.
// It assumes models are already loaded.
export async function anonymizeImage(
  imageSource: HTMLImageElement,
  knownDescriptors: number[][], // The VIP people we do NOT want to blur
  blurRadius: number = 15
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = imageSource.naturalWidth || imageSource.width;
  canvas.height = imageSource.naturalHeight || imageSource.height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');

  // Draw original image
  ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);

  // Detect all faces
  const detections = await faceapi.detectAllFaces(
    imageSource, 
    new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
  ).withFaceLandmarks().withFaceDescriptors();

  // For each face, see if it matches any known VIP
  const UNKNOWN_THRESHOLD = 0.5; // distance > 0.5 is unknown

  for (const det of detections) {
    const desc = Array.from(det.descriptor);
    
    // Find min distance to known VIPs
    let isVIP = false;
    if (knownDescriptors.length > 0) {
      let minDistance = Infinity;
      for (const vipDesc of knownDescriptors) {
        const dist = faceapi.euclideanDistance(new Float32Array(desc), new Float32Array(vipDesc));
        if (dist < minDistance) minDistance = dist;
      }
      if (minDistance <= UNKNOWN_THRESHOLD) {
        isVIP = true;
      }
    }

    if (!isVIP) {
      // Blur this face!
      const box = det.detection.box;
      
      // We pixelate the face by drawing it tiny, then scaling it up without smoothing
      const faceCanvas = document.createElement('canvas');
      const fctx = faceCanvas.getContext('2d');
      if (!fctx) continue;

      const scaleDown = 0.05; // 5% size
      faceCanvas.width = box.width * scaleDown;
      faceCanvas.height = box.height * scaleDown;
      
      // Draw the face onto the tiny canvas
      fctx.drawImage(
        canvas, 
        box.x, box.y, box.width, box.height, 
        0, 0, faceCanvas.width, faceCanvas.height
      );

      // Disable smoothing and draw it back scaled up
      ctx.imageSmoothingEnabled = false;
      
      // Optional: add a slight padding to the box to cover hair/edges
      const pad = 10;
      ctx.drawImage(
        faceCanvas,
        0, 0, faceCanvas.width, faceCanvas.height,
        Math.max(0, box.x - pad), 
        Math.max(0, box.y - pad), 
        box.width + pad*2, 
        box.height + pad*2
      );
      
      // Re-enable smoothing
      ctx.imageSmoothingEnabled = true;
    }
  }

  // Return base64 blurred image
  return canvas.toDataURL('image/jpeg', 0.95);
}
