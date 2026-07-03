"use client";

import { useState, useRef, useEffect } from "react";
import { User } from "firebase/auth";

type Source = { index: number; filename: string; chunkIndex: number; score: number };
type Message = { role: "user" | "assistant"; content: string; sources?: Source[] };

export default function ChatInterface({
  user,
  documentId,
  filename,
}: {
  user: User;
  documentId: string;
  filename: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const question = input.trim();
    if (!question || streaming) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setStreaming(true);

    const assistantIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question, documentId }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json();
        setMessages((prev) =>
          prev.map((m, i) => (i === assistantIndex ? { ...m, content: err.error ?? "Error" } : m))
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });

        // Check if sources marker arrived
        const sourcesSplit = full.split("__SOURCES__");
        const displayText = sourcesSplit[0];
        let sources: Source[] | undefined;
        if (sourcesSplit.length > 1) {
          try { sources = JSON.parse(sourcesSplit[1]); } catch { /* ignore */ }
        }

        setMessages((prev) =>
          prev.map((m, i) =>
            i === assistantIndex ? { ...m, content: displayText, sources } : m
          )
        );
      }
    } catch (e) {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === assistantIndex ? { ...m, content: "Something went wrong." } : m
        )
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="rounded-2xl flex flex-col" style={{ background: "#13131f", border: "1px solid #1e1e2e", height: "520px" }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid #1e1e2e" }}>
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <span className="text-sm text-slate-300 font-medium truncate">{filename}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#1e1e2e" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="text-slate-400 text-sm">Ask anything about <span className="text-white font-medium">{filename}</span></p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[85%] space-y-2">
              <div
                className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                style={msg.role === "user"
                  ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", borderBottomRightRadius: "4px" }
                  : { background: "#1e1e2e", color: "#e2e8f0", borderBottomLeftRadius: "4px" }
                }
              >
                {msg.content || (streaming && i === messages.length - 1 ? (
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                ) : "")}
              </div>

              {/* Citations */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-1">
                  {msg.sources.map((s) => (
                    <span key={s.index} className="text-xs px-2 py-1 rounded-lg" style={{ background: "#0f0f1a", border: "1px solid #2d2d3d", color: "#818cf8" }}>
                      [{s.index}] {s.filename} · chunk {s.chunkIndex} · {(s.score * 100).toFixed(0)}% match
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4" style={{ borderTop: "1px solid #1e1e2e" }}>
        <div className="flex gap-2 items-end">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask a question… (Enter to send)"
            className="flex-1 resize-none px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
            style={{ background: "#0a0a0f", border: "1px solid #1e1e2e", maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
