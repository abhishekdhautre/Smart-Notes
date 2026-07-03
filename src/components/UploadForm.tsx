"use client";

import { useState, useRef } from "react";
import { User } from "firebase/auth";

type UploadResult = { documentId: string; filename: string; chunks: number };

export default function UploadForm({ user, onUploaded }: { user: User; onUploaded?: (doc: { documentId: string; filename: string }) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setFile(f);
    setStatus("idle");
    setResult(null);
    setError("");
  }

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setError("");

    try {
      const token = await user.getIdToken();
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const text = await res.text();
      let data: { error?: string } & Partial<UploadResult>;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server error: ${text.slice(0, 200)}`);
      }

      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setResult(data as UploadResult);
      setStatus("done");
      onUploaded?.({ documentId: (data as UploadResult).documentId, filename: (data as UploadResult).filename });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setStatus("error");
    }
  }

  const progress = status === "uploading";

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        className="rounded-2xl p-10 text-center cursor-pointer transition-all"
        style={{
          border: `2px dashed ${dragging ? "#6366f1" : file ? "#4f46e5" : "#1e1e2e"}`,
          background: dragging ? "rgba(99,102,241,0.05)" : file ? "rgba(79,70,229,0.04)" : "#13131f",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {file ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.15)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p className="text-white font-medium">{file.name}</p>
            <p className="text-slate-500 text-xs">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#1e1e2e" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
            </div>
            <div>
              <p className="text-slate-300 font-medium">Drop your file here</p>
              <p className="text-slate-500 text-sm mt-1">PDF or TXT · up to 10MB</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || progress}
        className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
      >
        {progress ? (
          <>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Processing…
          </>
        ) : "Upload & Embed"}
      </button>

      {/* Success */}
      {status === "done" && result && (
        <div className="rounded-xl px-5 py-4 flex items-start gap-3" style={{ background: "#0a1f0a", border: "1px solid #14532d" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <div>
            <p className="text-green-400 font-medium text-sm">{result.filename} embedded successfully</p>
            <p className="text-green-700 text-xs mt-0.5">{result.chunks} chunks stored · ID: {result.documentId.slice(0, 8)}…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="rounded-xl px-5 py-4 flex items-start gap-3" style={{ background: "#1f0a0a", border: "1px solid #3f1010" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
