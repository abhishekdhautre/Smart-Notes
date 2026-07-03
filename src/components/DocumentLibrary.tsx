"use client";

import { useEffect, useState, useCallback } from "react";
import { User } from "firebase/auth";

export type Doc = { documentId: string; filename: string; chunkCount: number };

export default function DocumentLibrary({
  user,
  activeDocId,
  onSelect,
  refreshTrigger,
}: {
  user: User;
  activeDocId: string | null;
  onSelect: (doc: Doc) => void;
  refreshTrigger: number;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/documents", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDocs(data.documents ?? []);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchDocs(); }, [fetchDocs, refreshTrigger]);

  async function handleDelete(doc: Doc, e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(doc.documentId);
    try {
      const token = await user.getIdToken();
      await fetch(`/api/documents/${doc.documentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocs((prev) => prev.filter((d) => d.documentId !== doc.documentId));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#13131f", border: "1px solid #1e1e2e" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #1e1e2e" }}>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Documents</span>
        <span className="text-xs text-slate-600">{docs.length} file{docs.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="px-4 py-6 flex justify-center">
          <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        </div>
      ) : docs.length === 0 ? (
        <div className="px-4 py-6 text-center text-slate-600 text-sm">No documents yet</div>
      ) : (
        <ul>
          {docs.map((doc, i) => (
            <li
              key={doc.documentId}
              onClick={() => onSelect(doc)}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all group"
              style={{
                background: activeDocId === doc.documentId ? "rgba(99,102,241,0.1)" : "transparent",
                borderTop: i > 0 ? "1px solid #1e1e2e" : "none",
              }}
            >
              {/* File icon */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: activeDocId === doc.documentId ? "rgba(99,102,241,0.2)" : "#1e1e2e" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={activeDocId === doc.documentId ? "#6366f1" : "#64748b"}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>

              {/* Name + chunks */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{doc.filename}</p>
                <p className="text-xs text-slate-600">{doc.chunkCount} chunks</p>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => handleDelete(doc, e)}
                disabled={deleting === doc.documentId}
                className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-md shrink-0"
                style={{ color: "#ef4444" }}
              >
                {deleting === doc.documentId ? (
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
