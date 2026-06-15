import { useEffect, useRef, useState, useCallback } from 'react';

type TagResult = string[];

export function useAutoTagger() {
  const [isReady, setIsReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const resolversRef = useRef<Map<string, { resolve: (res: TagResult) => void, reject: (err: any) => void }>>(new Map());

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/autoTagger.worker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e: MessageEvent) => {
      const { type, id, result, error } = e.data;
      if (type === 'INIT_DONE') {
        setIsReady(true);
      } else if (type === 'INIT_ERROR') {
        console.error('AutoTagger Init Error:', error);
      } else if (type === 'TAG_DONE' || type === 'TAG_ERROR') {
        const promiseState = resolversRef.current.get(id);
        if (promiseState) {
          if (type === 'TAG_DONE') promiseState.resolve(result);
          else promiseState.reject(new Error(error));
          resolversRef.current.delete(id);
        }
      }
    };

    workerRef.current.postMessage({ type: 'INIT' });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const tagImage = useCallback(async (imageUrl: string): Promise<TagResult> => {
    if (!isReady || !workerRef.current) {
      throw new Error('AutoTagger not ready');
    }
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(7);
      resolversRef.current.set(id, { resolve, reject });
      workerRef.current!.postMessage({ type: 'TAG', id, data: { imageUrl } });
    });
  }, [isReady]);

  return { isReady, tagImage };
}
