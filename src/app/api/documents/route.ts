import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebaseAdmin";
import { index } from "@/lib/db";

export const runtime = "nodejs";

async function getUserId(req: NextRequest): Promise<string> {
  const token = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!token) throw new Error("Unauthorized");
  const decoded = await auth.verifyIdToken(token);
  return decoded.uid;
}

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Query with a zero vector to list all vectors in the user's namespace
    const results = await index.namespace(userId).query({
      vector: new Array(384).fill(0),
      topK: 1000,
      includeMetadata: true,
    });

    // Deduplicate by documentId
    const docsMap = new Map<string, { documentId: string; filename: string; chunkCount: number }>();
    for (const match of results.matches ?? []) {
      const docId = match.metadata?.documentId as string;
      const filename = match.metadata?.filename as string;
      if (!docId) continue;
      if (docsMap.has(docId)) {
        docsMap.get(docId)!.chunkCount++;
      } else {
        docsMap.set(docId, { documentId: docId, filename, chunkCount: 1 });
      }
    }

    return NextResponse.json({ documents: Array.from(docsMap.values()) });
  } catch (err) {
    console.error("[documents] error:", err);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}
