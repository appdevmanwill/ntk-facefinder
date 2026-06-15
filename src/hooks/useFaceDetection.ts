import { useState, useEffect, useCallback, useRef } from 'react';

export interface DetectedFace {
  box: { x: number; y: number; width: number; height: number };
  descriptor?: Float32Array;
  score: number;
  blurScore?: number;
}

export interface UseFaceDetectionResult {
  modelsLoaded: boolean;
  modelsLoading: boolean;
  modelsError: string | null;
  loadModels: () => Promise<void>;
  detectFaces: (imageElement: HTMLImageElement | HTMLCanvasElement) => Promise<DetectedFace[]>;
  drawDetections: (canvas: HTMLCanvasElement, image: HTMLImageElement, detections: DetectedFace[], selectedIndex?: number) => void;
}

export function useFaceDetection(): UseFaceDetectionResult {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  
  const workerRef = useRef<Worker | null>(null);
  const resolves = useRef<Record<string, (val: any) => void>>({});
  const rejects = useRef<Record<string, (err: any) => void>>({});
  const loadAttempted = useRef(false);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/faceDetection.worker.ts', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = (e) => {
      const { type, id, result, error } = e.data;
      if (type === 'INIT_DONE') {
        setModelsLoaded(true);
        setModelsLoading(false);
      } else if (type === 'INIT_ERROR') {
        setModelsError(error);
        setModelsLoading(false);
      } else if (type === 'DETECT_DONE') {
        if (id && resolves.current[id]) {
          const faces = result.map((f: any) => ({
             ...f,
             descriptor: new Float32Array(f.descriptor)
          }));
          resolves.current[id](faces);
          delete resolves.current[id];
          delete rejects.current[id];
        }
      } else if (type === 'DETECT_ERROR') {
        if (id && rejects.current[id]) {
          rejects.current[id](new Error(error));
          delete resolves.current[id];
          delete rejects.current[id];
        }
      }
    };
    
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const loadModels = useCallback(async () => {
    if (modelsLoaded || modelsLoading || loadAttempted.current) return;
    
    loadAttempted.current = true;
    setModelsLoading(true);
    setModelsError(null);
    workerRef.current?.postMessage({ type: 'INIT' });
  }, [modelsLoaded, modelsLoading]);

  // Auto-load models on mount
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const detectFaces = useCallback(async (imageElement: HTMLImageElement | HTMLCanvasElement): Promise<DetectedFace[]> => {
    if (!modelsLoaded || !workerRef.current) {
      throw new Error('Models not loaded yet');
    }

    let imageData: ImageData;
    if (imageElement instanceof HTMLCanvasElement) {
      const ctx = imageElement.getContext('2d');
      if (!ctx) return [];
      imageData = ctx.getImageData(0, 0, imageElement.width, imageElement.height);
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = imageElement.naturalWidth || imageElement.width;
      canvas.height = imageElement.naturalHeight || imageElement.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return [];
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(2, 11);
      resolves.current[id] = resolve;
      rejects.current[id] = reject;
      workerRef.current?.postMessage({ type: 'DETECT', id, data: { imageData } });
    });
  }, [modelsLoaded]);

  const drawDetections = useCallback((
    canvas: HTMLCanvasElement,
    image: HTMLImageElement,
    detections: DetectedFace[],
    selectedIndex?: number
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match image
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;

    // Draw the image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Draw detection boxes
    detections.forEach((face, idx) => {
      const isSelected = idx === selectedIndex;
      const color = isSelected ? '#10b981' : '#6366f1';
      
      // Draw box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(face.box.x, face.box.y, face.box.width, face.box.height);

      // Draw number label
      const labelSize = 24;
      ctx.fillStyle = color;
      ctx.fillRect(face.box.x, face.box.y - labelSize, labelSize, labelSize);
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(idx + 1), face.box.x + labelSize / 2, face.box.y - labelSize / 2);

      // Draw confidence score
      const scoreText = `${Math.round(face.score * 100)}%`;
      ctx.font = '12px sans-serif';
      ctx.fillStyle = color;
      const scoreWidth = ctx.measureText(scoreText).width + 8;
      ctx.fillRect(face.box.x + face.box.width - scoreWidth, face.box.y + face.box.height, scoreWidth, 20);
      ctx.fillStyle = 'white';
      ctx.textAlign = 'right';
      ctx.fillText(scoreText, face.box.x + face.box.width - 4, face.box.y + face.box.height + 10);
    });
  }, []);

  return {
    modelsLoaded,
    modelsLoading,
    modelsError,
    loadModels,
    detectFaces,
    drawDetections,
  };
}

// Utility to crop a face from an image
export function cropFaceFromImage(
  image: HTMLImageElement,
  faceBox: { x: number; y: number; width: number; height: number },
  padding: number = 0.2
): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Add padding around the face
  const padX = faceBox.width * padding;
  const padY = faceBox.height * padding;
  
  const x = Math.max(0, faceBox.x - padX);
  const y = Math.max(0, faceBox.y - padY);
  const width = Math.min(image.naturalWidth - x, faceBox.width + padX * 2);
  const height = Math.min(image.naturalHeight - y, faceBox.height + padY * 2);

  canvas.width = width;
  canvas.height = height;
  
  ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
  
  return canvas.toDataURL('image/jpeg', 0.9);
}

// Compare two face descriptors
export function compareFaces(descriptor1: Float32Array, descriptor2: Float32Array): number {
  if (descriptor1.length !== descriptor2.length) return 0;
  
  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  
  const distance = Math.sqrt(sum);
  // Convert distance to similarity percentage (0.6 distance = ~40% match, 0 distance = 100% match)
  const similarity = Math.max(0, Math.min(100, (1 - distance / 1.2) * 100));
  return similarity;
}
