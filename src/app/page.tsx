"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebaseClient";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import UploadForm from "@/components/UploadForm";
import ChatInterface from "@/components/ChatInterface";
import DocumentLibrary, { Doc } from "@/components/DocumentLibrary";

export default function Home() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [activeDoc, setActiveDoc] = useState<Doc | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Persist auth across reloads
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  async function handleAuth() {
    setError("");
    setLoading(true);
    try {
      const fn = mode === "login" ? signInWithEmailAndPassword : createUserWithEmailAndPassword;
      await fn(auth, email, password);
      // onAuthStateChanged will set the user
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message.replace("Firebase: ", "") : "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  // Loading state — avoid flash of login screen on reload
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "#0a0a0f" }}>
        <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "radial-gradient(ellipse at 50% 0%, #1a1040 0%, #0a0a0f 70%)" }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Smart Notes</h1>
            <p className="text-slate-400 mt-2 text-sm">Ask questions about your documents</p>
          </div>

          <div className="rounded-2xl p-8" style={{ background: "#13131f", border: "1px solid #1e1e2e" }}>
            <div className="flex rounded-xl p-1 mb-6" style={{ background: "#0a0a0f" }}>
              {(["login", "register"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                  style={mode === m
                    ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white" }
                    : { color: "#64748b" }}>
                  {m === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                <input type="email" placeholder="you@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
                  style={{ background: "#0a0a0f", border: "1px solid #1e1e2e" }} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                <input type="password" placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
                  style={{ background: "#0a0a0f", border: "1px solid #1e1e2e" }} />
              </div>

              {error && (
                <div className="rounded-xl px-4 py-3 text-sm text-red-400"
                  style={{ background: "#1f0a0a", border: "1px solid #3f1010" }}>
                  {error}
                </div>
              )}

              <button onClick={handleAuth} disabled={loading || !email || !password}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at 50% 0%, #1a1040 0%, #0a0a0f 70%)" }}>
      {/* Navbar */}
      <nav className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: "#1e1e2e", background: "rgba(10,10,15,0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10 }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <span className="font-semibold text-white">Smart Notes</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">{user.email}</span>
          <button onClick={() => { signOut(auth); setActiveDoc(null); }}
            className="text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-all"
            style={{ border: "1px solid #1e1e2e" }}>
            Sign out
          </button>
        </div>
      </nav>

      {/* Two-column layout */}
      <div className="max-w-6xl mx-auto px-6 py-10 flex gap-6 items-start">
        {/* Left sidebar */}
        <div className="w-72 shrink-0 space-y-4">
          <DocumentLibrary
            user={user}
            activeDocId={activeDoc?.documentId ?? null}
            onSelect={setActiveDoc}
            refreshTrigger={refreshTrigger}
          />
          <UploadForm
            user={user}
            onUploaded={(doc) => {
              setActiveDoc({ ...doc, chunkCount: 0 });
              setRefreshTrigger((n) => n + 1);
            }}
          />
        </div>

        {/* Right: chat panel */}
        <div className="flex-1 min-w-0">
          {activeDoc ? (
            <ChatInterface
              key={activeDoc.documentId}
              user={user}
              documentId={activeDoc.documentId}
              filename={activeDoc.filename}
            />
          ) : (
            <div className="rounded-2xl flex flex-col items-center justify-center text-center gap-4"
              style={{ background: "#13131f", border: "1px solid #1e1e2e", height: "520px" }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "#1e1e2e" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">No document selected</p>
                <p className="text-slate-500 text-sm mt-1">Upload a file or select one from your library</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
