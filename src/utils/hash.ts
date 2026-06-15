export async function getFileHash(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function findDuplicates<T extends { hash: string }>(items: T[]): T[][] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    if (!map.has(item.hash)) {
      map.set(item.hash, []);
    }
    map.get(item.hash)!.push(item);
  }
  
  return Array.from(map.values()).filter(group => group.length > 1);
}
