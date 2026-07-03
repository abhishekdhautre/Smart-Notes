const CHUNK_SIZE = 800;
const OVERLAP = 100;

export function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = start + CHUNK_SIZE;
    chunks.push(text.slice(start, end).trim());
    if (end >= text.length) break;
    start = end - OVERLAP;
  }

  return chunks.filter(Boolean);
}
