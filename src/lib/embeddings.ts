// eslint-disable-next-line @typescript-eslint/no-require-imports
const { pipeline } = require("@xenova/transformers");

let embedder: unknown = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embedder as (text: string, opts: Record<string, unknown>) => Promise<{ data: Float32Array }>;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embed = await getEmbedder();
  const results: number[][] = [];

  for (const text of texts) {
    const output = await embed(text, { pooling: "mean", normalize: true });
    results.push(Array.from(output.data));
  }

  return results;
}
