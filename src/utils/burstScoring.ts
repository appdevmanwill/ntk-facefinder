interface FaceExpression {
  neutral?: number;
  happy?: number;
  sad?: number;
  angry?: number;
  fearful?: number;
  disgusted?: number;
  surprised?: number;
}

export interface BurstPhoto {
  id: string;
  filePath: string;
  lastModified: number; // timestamp
  faces: Array<{
    score: number; // confidence
    blurScore: number;
    expressions?: FaceExpression;
  }>;
}

export interface BurstGroup {
  id: string;
  photos: BurstPhoto[];
  bestPhotoId: string;
}

/**
 * Groups photos into bursts if they were taken within the threshold (default 3000ms).
 */
export function groupPhotosIntoBursts(photos: BurstPhoto[], timeThresholdMs = 3000): BurstGroup[] {
  if (photos.length === 0) return [];

  // Sort photos chronologically
  const sorted = [...photos].sort((a, b) => a.lastModified - b.lastModified);
  
  const groups: BurstGroup[] = [];
  let currentGroup: BurstPhoto[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const photo = sorted[i];
    const prevPhoto = sorted[i - 1];

    if (photo.lastModified - prevPhoto.lastModified <= timeThresholdMs) {
      currentGroup.push(photo);
    } else {
      groups.push(createGroup(currentGroup));
      currentGroup = [photo];
    }
  }
  
  if (currentGroup.length > 0) {
    groups.push(createGroup(currentGroup));
  }

  return groups;
}

function createGroup(photos: BurstPhoto[]): BurstGroup {
  // Calculate score for each photo and pick the best one
  let bestId = photos[0].id;
  let highestScore = -Infinity;

  for (const photo of photos) {
    const score = calculatePhotoScore(photo);
    if (score > highestScore) {
      highestScore = score;
      bestId = photo.id;
    }
  }

  return {
    id: `burst_${photos[0].id}`,
    photos,
    bestPhotoId: bestId
  };
}

/**
 * Scores a photo based on:
 * 1. Number of faces detected (more faces = better if it's a group shot)
 * 2. Smile confidence (happy)
 * 3. Open eyes (usually correlated with neutral/happy expressions and high face detection confidence)
 * 4. Image sharpness (lower blurScore is better)
 */
export function calculatePhotoScore(photo: BurstPhoto): number {
  if (photo.faces.length === 0) return 0;

  let totalScore = 0;
  
  // Base score for simply having faces (we want the photo with the most faces in a burst)
  totalScore += photo.faces.length * 10;

  for (const face of photo.faces) {
    // Confidence penalty (poorly aligned or obscured faces lower the score)
    totalScore += face.score * 5;

    // Blur penalty (higher blur variance is better, meaning sharper)
    if (face.blurScore > 100) {
      totalScore += 2; // Sharp
    } else if (face.blurScore < 20) {
      totalScore -= 5; // Blurry
    }

    // Expression bonuses
    if (face.expressions) {
      const happy = face.expressions.happy || 0;
      const neutral = face.expressions.neutral || 0;
      const sad = face.expressions.sad || 0;
      const angry = face.expressions.angry || 0;
      const surprised = face.expressions.surprised || 0;

      totalScore += happy * 10;     // Huge bonus for smiling
      totalScore += neutral * 2;    // Good if just neutral/eyes open
      totalScore -= sad * 5;        // Penalty for sad
      totalScore -= angry * 5;      // Penalty for angry
      totalScore += surprised * 3;  // Mild bonus for surprised/candid
    }
  }

  return totalScore;
}
