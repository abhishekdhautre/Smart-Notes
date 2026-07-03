import { pipeline } from "@xenova/transformers";

let embedder: Awaited<ReturnType<typeof pipeline>> | null = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embedder;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embed = await getEmbedder();
  const results: number[][] = [];

  for (const text of texts) {
    const output = await embed(text, { pooling: "mean", normalize: true });
    results.push(Array.from(output.data as Float32Array));
  }

  return results;
}
