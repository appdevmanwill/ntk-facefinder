import { compareFaces } from '@/hooks/useFaceDetection';

export interface FaceItem {
  id: string;
  descriptor: Float32Array;
  photoId: string;
}

export interface FaceCluster {
  id: string;
  faces: FaceItem[];
  representativeDescriptor: Float32Array;
}

// Simple agglomerative hierarchical clustering algorithm
export function clusterFaces(faces: FaceItem[], similarityThreshold: number = 60): FaceCluster[] {
  const clusters: FaceCluster[] = [];

  for (const face of faces) {
    let bestCluster: FaceCluster | null = null;
    let bestSimilarity = -1;

    for (const cluster of clusters) {
      const similarity = compareFaces(face.descriptor, cluster.representativeDescriptor);
      if (similarity >= similarityThreshold && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestCluster = cluster;
      }
    }

    if (bestCluster) {
      bestCluster.faces.push(face);
      // Update representative descriptor (moving average)
      const n = bestCluster.faces.length;
      for (let i = 0; i < face.descriptor.length; i++) {
        bestCluster.representativeDescriptor[i] = 
          ((bestCluster.representativeDescriptor[i] * (n - 1)) + face.descriptor[i]) / n;
      }
    } else {
      // Create new cluster
      clusters.push({
        id: Math.random().toString(36).substr(2, 9),
        faces: [face],
        representativeDescriptor: new Float32Array(face.descriptor),
      });
    }
  }

  // Sort clusters by size descending
  return clusters.sort((a, b) => b.faces.length - a.faces.length);
}
