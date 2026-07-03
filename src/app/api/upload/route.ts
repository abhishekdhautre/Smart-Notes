import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebaseAdmin";
import { index } from "@/lib/db";
import { chunkText } from "@/lib/chunker";
import { embedTexts } from "@/lib/embeddings";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const maxDuration = 60;

async function getUserId(req: NextRequest): Promise<string> {
  const token = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!token) throw new Error("Unauthorized");
  const decoded = await auth.verifyIdToken(token);
  return decoded.uid;
}

export async function POST(req: NextRequest) {
  try {
    let userId: string;
    try {
      userId = await getUserId(req);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const allowedTypes = ["application/pdf", "text/plain"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only PDF and text files are supported" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text: string;

    if (file.type === "application/pdf") {
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } else {
      text = buffer.toString("utf-8");
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "Could not extract text from file" }, { status: 422 });
    }

    const documentId = uuidv4();
    const chunks = chunkText(text);
    const embeddings = await embedTexts(chunks);

    const vectors = chunks.map((content, i) => ({
      id: `${documentId}#${i}`,
      values: embeddings[i],
      metadata: { documentId, filename: file.name, chunkIndex: i, content },
    }));

    const BATCH = 100;
    for (let i = 0; i < vectors.length; i += BATCH) {
      await index.namespace(userId).upsert(vectors.slice(i, i + BATCH));
    }

    return NextResponse.json({ documentId, filename: file.name, chunks: chunks.length });
  } catch (err) {
    console.error("[upload] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
