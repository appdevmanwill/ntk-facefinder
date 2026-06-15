import { pipeline, env } from '@xenova/transformers';

// Disable local models, fetch directly from HF Hub
env.allowLocalModels = false;

// We will use zero-shot image classification with CLIP
let taggerPipeline: any = null;

// Common personal photo tags
const CANDIDATE_LABELS = [
  "beach", "wedding", "party", "birthday", "dog", "cat", 
  "nature", "mountain", "city", "food", "night", "snow", 
  "concert", "indoor", "car", "sports"
];

self.onmessage = async (e: MessageEvent) => {
  const { type, id, data } = e.data;

  if (type === 'INIT') {
    if (taggerPipeline) {
      self.postMessage({ type: 'INIT_DONE' });
      return;
    }
    try {
      // Load the CLIP pipeline
      taggerPipeline = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');
      self.postMessage({ type: 'INIT_DONE' });
    } catch (err) {
      self.postMessage({ type: 'INIT_ERROR', error: String(err) });
    }
  }

  if (type === 'TAG') {
    if (!taggerPipeline) {
      self.postMessage({ id, type: 'TAG_ERROR', error: 'Pipeline not loaded' });
      return;
    }
    try {
      const { imageUrl } = data;
      
      // Predict tags
      const output = await taggerPipeline(imageUrl, CANDIDATE_LABELS);
      
      // Filter tags with confidence > 0.2
      const tags = output
        .filter((res: any) => res.score > 0.2)
        .map((res: any) => res.label);

      self.postMessage({ id, type: 'TAG_DONE', result: tags });
    } catch (err) {
      self.postMessage({ id, type: 'TAG_ERROR', error: String(err) });
    }
  }
};
