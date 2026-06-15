import { useState, useEffect, useCallback, useRef } from 'react';

export function useSemanticSearch() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  
  const workerRef = useRef<Worker | null>(null);
  const resolves = useRef<Record<string, (val: any) => void>>({});
  const rejects = useRef<Record<string, (err: any) => void>>({});
  const loadAttempted = useRef(false);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/semanticSearch.worker.ts', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = (e) => {
      const { type, id, embedding, error } = e.data;
      if (type === 'INIT_DONE') {
        setModelsLoaded(true);
        setModelsLoading(false);
      } else if (type === 'INIT_ERROR') {
        setModelsError(error);
        setModelsLoading(false);
      } else if (type === 'EMBED_DONE') {
        if (id && resolves.current[id]) {
          resolves.current[id](embedding);
          delete resolves.current[id];
          delete rejects.current[id];
        }
      } else if (type === 'ERROR') {
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

  // Don't auto-load semantic search models because they are ~300MB
  // Let the user initiate it.

  const embedImage = useCallback(async (imageUrl: string): Promise<number[]> => {
    if (!modelsLoaded || !workerRef.current) throw new Error('Models not loaded');
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(2, 11);
      resolves.current[id] = resolve;
      rejects.current[id] = reject;
      workerRef.current?.postMessage({ type: 'EMBED_IMAGE', id, data: { imageUrl } });
    });
  }, [modelsLoaded]);

  const embedText = useCallback(async (text: string): Promise<number[]> => {
    if (!modelsLoaded || !workerRef.current) throw new Error('Models not loaded');
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(2, 11);
      resolves.current[id] = resolve;
      rejects.current[id] = reject;
      workerRef.current?.postMessage({ type: 'EMBED_TEXT', id, data: { text } });
    });
  }, [modelsLoaded]);

  const cosineSimilarity = useCallback((vecA: number[], vecB: number[]) => {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }, []);

  return {
    modelsLoaded,
    modelsLoading,
    modelsError,
    loadModels,
    embedImage,
    embedText,
    cosineSimilarity,
  };
}
