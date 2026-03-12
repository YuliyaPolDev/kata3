# Voice Board (MVP)

Employee Council Voice Board MVP.

Employees can submit concerns, vote + comment, see trending clusters, and ask HR policy questions via a lightweight RAG flow.

This is intentionally **not** production architecture (no auth/SSO, no notifications, no real DB, no vector DB).

## Roles (MVP / demo)
- The UI has a simple role selector (Employee / Council) stored in `localStorage`.
- The web client sends the role to the API via the `X-Voice-Role` request header.
- Council-only capabilities:
	- Updating lifecycle state (`PATCH /api/concerns/:id/state`)
	- Viewing AI-derived fields (tone/urgency/sentiment/priority)
- This is **not secure** (users could spoof headers). It’s only to demonstrate role-gated UX in the MVP.

## What this MVP demonstrates
- Submit a concern (title/description/category)
- Live duplicate detection (simple cosine similarity over tokens)
- Upvote + comment
- Simple lifecycle state (Open → InDiscussion → Planned → Resolved)
- Trending cluster creation (5+ similar concerns in 30 days)
- HR Assistant (RAG): keyword retrieval over local policy markdown + optional LLM answer

## Repo layout
```
voice-board/
	apps/
		api/      # Express API (JSON-file persistence + AI helpers)
		web/      # React UI (Vite)
	packages/
		shared/   # Shared types (minimal for now)
		ai-core/  # Placeholder for AI utilities (kept minimal)
	data/
		db/       # JSON “database” files
		policies/ # Policy markdown + policies.index.json
	docs/       # Notes (API list, prompts)
```

## Prereqs
- Node.js 18+ (recommended 20+)

## Setup
```bash
cd voice-board
npm install
```

## Run (dev)
```bash
npm run dev
```
- Web: http://localhost:5173
- API: http://localhost:3001

## Scripts
- `npm run dev` — run API + web together
- `npm run dev:api` — API only
- `npm run dev:web` — web only
- `npm run typecheck` — typecheck API + web
- `npm run build` — build API + web

## Environment
- Create a `.env` file at repo root (see `.env.example`).
- `OPENAI_API_KEY` is optional:
	- if set: the API will use the LLM for tone/urgency/sentiment + cluster themes/title + HR answers
	- if not set: the app still works (HR endpoint returns relevant excerpts, and concern classification is skipped)

Optional:
- `OPENAI_MODEL` (default: `gpt-4o-mini`)

## Data
- JSON files live in `data/db/`:
	- `concerns.json`
	- `votes.json`
	- `comments.json`
	- `clusters.json`

## Policies (HR Assistant)
- Policy docs live in `data/policies/` as markdown.
- `data/policies/policies.index.json` lists which markdown files are included.

To add a policy document:
1) Add a new `.md` file to `data/policies/`
2) Add an entry to `policies.index.json` with `{ id, title, file }`

## API quick reference
See `docs/api.md` for the full list. The most-used endpoints are:
- `GET /api/concerns`
- `GET /api/concerns/similar?title=&description=`
- `POST /api/concerns`
- `POST /api/concerns/:id/votes`
- `GET /api/concerns/:id/comments`
- `POST /api/concerns/:id/comments`
- `GET /api/clusters`
- `POST /api/hr/ask`

## Notes / limitations
- No authentication or user identities (votes are anonymous and can be repeated).
- JSON files are a deliberate MVP choice (single-writer, not concurrency-safe).
- Duplicate detection is token-based cosine similarity (good enough for a prototype).
