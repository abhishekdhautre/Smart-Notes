import { NextRequest } from "next/server";
import { auth } from "@/lib/firebaseAdmin";
import { index } from "@/lib/db";
import { embedTexts } from "@/lib/embeddings";
import Groq from "groq-sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getUserId(req: NextRequest): Promise<string> {
  const token = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!token) throw new Error("Unauthorized");
  const decoded = await auth.verifyIdToken(token);
  return decoded.uid;
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { question, documentId } = await req.json();
  if (!question?.trim()) {
    return new Response(JSON.stringify({ error: "No question provided" }), { status: 400 });
  }

  // 1. Embed the question
  const [questionEmbedding] = await embedTexts([question]);

  // 2. Similarity search in Pinecone (user's namespace only)
  const filter = documentId ? { documentId: { $eq: documentId } } : undefined;
  const results = await index.namespace(userId).query({
    vector: questionEmbedding,
    topK: 5,
    includeMetadata: true,
    filter,
  });

  if (!results.matches?.length) {
    return new Response(JSON.stringify({ error: "No relevant content found" }), { status: 404 });
  }

  // 3. Build context from top-k chunks with citations
  const chunks = results.matches.map((m, i) => ({
    index: i + 1,
    content: m.metadata?.content as string,
    filename: m.metadata?.filename as string,
    chunkIndex: m.metadata?.chunkIndex as number,
    score: m.score ?? 0,
  }));

  const context = chunks
    .map((c) => `[Source ${c.index} — ${c.filename}, chunk ${c.chunkIndex}]\n${c.content}`)
    .join("\n\n---\n\n");

  const systemPrompt = `You are a helpful assistant that answers questions strictly based on the provided document excerpts.
Always cite your sources using [Source N] notation inline.
If the answer is not in the provided context, say "I couldn't find that in the uploaded documents."
Never make up information.`;

  const userPrompt = `Context:\n${context}\n\nQuestion: ${question}`;

  // 4. Stream response from Groq
  const stream = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    stream: true,
    temperature: 0.2,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) controller.enqueue(encoder.encode(text));
      }
      // Send sources as a final JSON line
      const sourcesLine = `\n\n__SOURCES__${JSON.stringify(
        chunks.map((c) => ({ index: c.index, filename: c.filename, chunkIndex: c.chunkIndex, score: c.score }))
      )}`;
      controller.enqueue(encoder.encode(sourcesLine));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
  });
}
