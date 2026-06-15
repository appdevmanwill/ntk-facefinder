import { env, pipeline, AutoTokenizer, AutoProcessor, RawImage, Tensor } from '@xenova/transformers';

// Configure transformers.js to load models from the official CDN
env.allowLocalModels = false;
env.useBrowserCache = true;

let imageProcessor: any = null;
let textTokenizer: any = null;
let model: any = null;
let modelsLoaded = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, id, data } = e.data;

  if (type === 'INIT') {
    if (modelsLoaded) {
      self.postMessage({ type: 'INIT_DONE' });
      return;
    }
    try {
      // Use a lightweight CLIP model
      const modelId = 'Xenova/clip-vit-base-patch32';
      
      model = await pipeline('zero-shot-image-classification', modelId);
      // Wait, pipeline is heavy. We just need the feature extraction.
      imageProcessor = await AutoProcessor.from_pretrained(modelId);
      textTokenizer = await AutoTokenizer.from_pretrained(modelId);
      
      // We'll use the feature-extraction pipeline or pipeline('zero-shot-image-classification') 
      // Actually, let's use the explicit model approach for embeddings
      const { CLIPTextModelWithProjection, CLIPVisionModelWithProjection } = await import('@xenova/transformers');
      
      const visionModel = await CLIPVisionModelWithProjection.from_pretrained(modelId);
      const textModel = await CLIPTextModelWithProjection.from_pretrained(modelId);

      modelsLoaded = true;
      self.postMessage({ type: 'INIT_DONE' });
      
      // Save to global for later
      (self as any).visionModel = visionModel;
      (self as any).textModel = textModel;

    } catch (err) {
      self.postMessage({ type: 'INIT_ERROR', error: String(err) });
    }
  }

  if (type === 'EMBED_IMAGE') {
    if (!modelsLoaded) {
      self.postMessage({ id, type: 'ERROR', error: 'Models not loaded' });
      return;
    }
    try {
      const { imageUrl } = data; // Could be a data URL or blob URL
      const image = await RawImage.fromURL(imageUrl);
      
      const inputs = await imageProcessor(image);
      const { image_embeds } = await (self as any).visionModel(inputs);
      
      const normalized = image_embeds.normalize().tolist()[0];
      self.postMessage({ id, type: 'EMBED_DONE', embedding: normalized });
    } catch (err) {
      self.postMessage({ id, type: 'ERROR', error: String(err) });
    }
  }

  if (type === 'EMBED_TEXT') {
    if (!modelsLoaded) {
      self.postMessage({ id, type: 'ERROR', error: 'Models not loaded' });
      return;
    }
    try {
      const { text } = data;
      const inputs = textTokenizer(text, { padding: true, truncation: true });
      const { text_embeds } = await (self as any).textModel(inputs);
      
      const normalized = text_embeds.normalize().tolist()[0];
      self.postMessage({ id, type: 'EMBED_DONE', embedding: normalized });
    } catch (err) {
      self.postMessage({ id, type: 'ERROR', error: String(err) });
    }
  }
};
