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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: documentId } = params;

    // Find all vector IDs for this document
    const results = await index.namespace(userId).query({
      vector: new Array(384).fill(0),
      topK: 1000,
      includeMetadata: true,
      filter: { documentId: { $eq: documentId } },
    });

    const ids = results.matches?.map((m) => m.id) ?? [];
    if (ids.length > 0) {
      await index.namespace(userId).deleteMany(ids);
    }

    return NextResponse.json({ deleted: ids.length });
  } catch (err) {
    console.error("[documents/delete] error:", err);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
