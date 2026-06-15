// Utility to find visually similar photos by computing the dot product 
// of their 512-dimensional CLIP embeddings (cosine similarity).
// Since CLIP vectors are typically normalized, dot product = cosine similarity.

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Function to rank a library of photos against a query embedding
export function rankSimilarPhotos(
  queryEmbedding: number[], 
  library: { id: string, embedding?: number[] }[],
  limit: number = 20
) {
  const scored = library
    .filter(item => item.embedding && item.embedding.length > 0)
    .map(item => ({
      id: item.id,
      score: cosineSimilarity(queryEmbedding, item.embedding!)
    }));
    
  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, limit);
}
