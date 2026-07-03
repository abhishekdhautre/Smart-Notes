# Smart Notes — RAG Document Q&A

Upload a PDF or text file and ask questions about it in plain language. Answers are grounded in your document's actual content with source citations — not generic LLM guesses.

## Architecture

```
Upload Flow
──────────────────────────────────────────────────────
PDF/TXT → Extract Text → Chunk (800 chars, 100 overlap)
       → Embed (all-MiniLM-L6-v2, 384-dim, local)
       → Upsert to Pinecone (namespaced per user)

Query Flow
──────────────────────────────────────────────────────
Question → Embed → Cosine Similarity Search (Pinecone)
        → Top-5 Chunks → Groq LLaMA 3.3 70B (streamed)
        → Cited Answer returned to UI
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Auth | Firebase Auth |
| Embeddings | `@xenova/transformers` — `all-MiniLM-L6-v2` (local, free) |
| Vector Store | Pinecone (free tier, serverless) |
| LLM | Groq API — `llama-3.3-70b-versatile` (free tier) |
| File Parsing | `pdf-parse` |
| Deployment | Vercel |

## Key Design Decisions

- **No LangChain** — every step (embed, store, retrieve, generate) is a direct API call, making the pipeline fully explainable in interviews
- **Local embeddings** — `@xenova/transformers` runs the model in Node.js with no API cost or network dependency
- **Namespace-per-user** — Pinecone namespaces enforce data isolation so users only query their own documents
- **Overlapping chunks** — 100-char overlap prevents sentences from being split across chunk boundaries and losing meaning
- **Citations on every answer** — forces the system to be honest about what it retrieved; signals understanding of why RAG reduces hallucination

## Getting Started

### Prerequisites
- Node.js 18+
- Pinecone account (free) — create an index named `smart-notes`, dimension `384`, metric `cosine`
- Firebase project — enable Email/Password auth, download Admin SDK JSON
- Groq account (free) — generate an API key at console.groq.com

### Setup

```bash
git clone https://github.com/abhishekdhautre/Smart-Notes.git
cd Smart-Notes
npm install
```

Create `.env.local`:

```env
GROQ_API_KEY=your_groq_key

PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX=smart-notes

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- Upload PDF or TXT files
- Ask natural language questions about uploaded documents
- Streamed answers with inline source citations (`[Source N] filename · chunk X · 87% match`)
- Document library — manage multiple documents per account
- Per-user data isolation — users only access their own documents
- Auth persists across reloads (Firebase session)

## Resume Bullet

> Built RAG-based document Q&A system using Pinecone vector search + Groq LLaMA 3.3, achieving streamed cited answers with hallucination-reduced responses across uploaded PDFs; implemented namespace-per-user multi-tenancy and local embeddings via `@xenova/transformers` eliminating embedding API costs entirely.
