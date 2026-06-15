import { useState, useCallback } from 'react';
import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

// Since doing full WebCodecs is highly complex for this demo, 
// we will use a hidden <video> element and Canvas 2D to extract frames.
export function useVideoScanner() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const scanVideo = useCallback(async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    
    return new Promise<{ time: number; tags: string[] }[]>((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.src = url;
      video.muted = true;
      video.playsInline = true;

      const timestamps: { time: number; tags: string[] }[] = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.onloadedmetadata = async () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const duration = video.duration;
        let currentTime = 0;
        const interval = 3; // Scan a frame every 3 seconds

        // Initialize VLM
        const classifier = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');
        const candidateLabels = ['beach', 'party', 'wedding', 'dog', 'cat', 'mountain', 'snow', 'city', 'night', 'water', 'food', 'car'];

        video.onseeked = async () => {
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          try {
            const results = await classifier(dataUrl, candidateLabels) as any[];
            // Filter tags with high confidence
            const tags = results.filter((r: any) => r.score > 0.15).map((r: any) => r.label);
            
            timestamps.push({ time: currentTime, tags });
            
            setProgress(Math.round((currentTime / duration) * 100));
            
            currentTime += interval;
            if (currentTime <= duration) {
              video.currentTime = currentTime;
            } else {
              // Done
              URL.revokeObjectURL(url);
              setIsProcessing(false);
              resolve(timestamps);
            }
          } catch (e) {
            console.error('Video frame analysis error', e);
            currentTime += interval;
            if (currentTime <= duration) {
              video.currentTime = currentTime;
            } else {
              URL.revokeObjectURL(url);
              setIsProcessing(false);
              resolve(timestamps);
            }
          }
        };

        // Start scanning
        video.currentTime = currentTime;
      };

      video.onerror = (e) => {
        URL.revokeObjectURL(url);
        setIsProcessing(false);
        reject(e);
      };
    });
  }, []);

  return { scanVideo, isProcessing, progress };
}
