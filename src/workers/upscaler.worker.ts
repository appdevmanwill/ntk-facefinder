import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;
// Enable WebGPU for intensive models if available
env.backends.onnx.wasm.numThreads = 4;

let upscalerPipeline: any = null;

self.onmessage = async (e) => {
  const { type, imageBase64, id } = e.data;

  if (type === 'INIT') {
    try {
      if (!upscalerPipeline) {
        self.postMessage({ type: 'STATUS', status: 'Loading Super Resolution Model (~50MB)...' });
        // Use an image-to-image pipeline for super resolution
        upscalerPipeline = await pipeline('image-to-image', 'Xenova/swin2SR-classical-sr-x2-64');
      }
      self.postMessage({ type: 'READY' });
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: (err as Error).message });
    }
    return;
  }

  if (type === 'UPSCALE') {
    try {
      self.postMessage({ type: 'STATUS', id, status: 'Enhancing image resolution...' });
      
      // Perform inference
      const result = await upscalerPipeline(imageBase64);
      
      // result should contain the upscaled image data (depending on pipeline output format, often it's an object with `data` or a PIL Image equivalent)
      // Since Transformers.js image-to-image returns a RawImage, we can save it as a Blob/DataURL
      
      // Assuming result is a RawImage:
      const upscaledBlob = await result.toBlob('image/jpeg');
      
      const reader = new FileReader();
      reader.readAsDataURL(upscaledBlob);
      reader.onloadend = () => {
        const enhancedBase64 = reader.result as string;
        self.postMessage({ type: 'RESULT', id, enhancedBase64 });
      };
      
    } catch (err) {
      self.postMessage({ type: 'ERROR', id, error: (err as Error).message });
    }
  }
};
