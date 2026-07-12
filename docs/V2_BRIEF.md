# Scrollwise v2 — Product & Architecture Brief

**Date:** 2026-07-11. Decisions locked in a grill session (Ved + Claude). This supersedes the
"AI + Topic mode (Silo 4)" sketch in NEXT_STEPS.md.

---

## What v2 is

**A Pinterest-style masonry feed of questions and quotes, generated from your own book
library and conditioned on what you're trying to learn. Tap a question → an answer
synthesized from your books, with cited passages that deep-link into the reader.**

Job-to-be-done: *learn what you chose to learn, from a corpus you chose, in byte-sized
entertaining units.* It should feel like scrolling educational reels/carousels on
Instagram — effortless, zero obligation. It is explicitly **not** a flashcard/practice
app and **not** a reading funnel. The feed is the destination; the reader survives as
the "go deeper" path behind citations.

**Thesis (README lead):** feeds exploit the curiosity loop — an open question creates an
information gap, and curiosity states enhance memory encoding — to sell ads. Scrollwise
points the same loop at your own bookshelf. (Retrieval practice + curiosity-primed
encoding happen invisibly; never surfaced as "learning features.")

**Primary design principle: demo-first.** A first-time visitor must feel the product
within 60 seconds of landing. When decisions conflict, the newcomer's first minute wins.

---

## Locked decisions

| # | Decision | Choice | Key rationale |
|---|----------|--------|---------------|
| 1 | Purpose | Open-source product, demo-first | Newcomer's first minute wins all conflicts |
| 2 | Ask-your-own-question | **Deferred to v2.1** | MVP = generated questions only |
| 3 | Tile vs tap | Tiles are hooks; tap = answer page | True Pinterest mechanic; lazy generation (pay per tap) |
| 4 | Goals input | One free-text "life context / learning intent" field | Richest cheap input; demo ships pre-filled persona |
| 5 | Form factor | Pinterest masonry grid, mixed tile types | "Pinterest, not TikTok" — browse & curate, not consume |
| 6 | Question generation | Book-first, persona-conditioned (assumed settled) | Questions grounded by construction — every question born with receipts; corpus was chosen to serve the goal |
| 7 | Learning mechanics | **None.** No SRS, no self-grading, no progress UI | Must feel easy; any resurfacing lives inside feed ranking only |
| 8 | Platform | **Cloud-first. Local-first abandoned** | Showcase cloud architecture skills |
| 9 | Feed mix | Questions anchor (~half) + quote tiles (v1 extractor) + occasional cover tiles | Variety = browse-feel; de-risks question-gen quality |
| 10 | Demo path | Seeded feed + editable persona | Anonymous session, pre-ingested public-domain corpus; editing the persona and watching questions shift is the money shot |

Parked design note: the answer page may render as swipeable mini-slides
(claim → backing passages → "read in book") — the educational-carousel grammar. Decide at build time.

### Addenda (locked 2026-07-11, session 2)

- **Public identity:** open-source product (MIT, already licensed). README tells the
  build story openly, including that it's built in the open with AI agents; commits stay
  clean (no co-author trailers), credit the author.
- **Domain:** `scrollwise.vedantgg.com` (CNAME + Vercel custom domain).
- **Repo flow:** this repo, short-lived phase branches → PRs → main. Build in the open.
- **Brand:** full brand exploration before UI build (multiple directions → pick one).
  Name stays Scrollwise. The feed cannot look default-Tailwind. Brand gates P2/P4 UI work.
- **Auth:** anonymous-only MVP (per-browser persistence); email magic-link account
  linking is the first fast-follow after the done-check.
- **Demo corpus register:** curiosity, not philosophy. Mixed public-domain library that
  manufactures "huh, never thought of it that way" across registers — a skill text, an
  everyday-perspective text, a how-things-work science text, plus the Stoics. Exact list
  chosen at seed time.

---

## Architecture (researched 2026-07-11, verified against official docs)

```
Browser ──► Next.js (Vercel, Fluid compute)
              │  upload EPUB/PDF → Supabase Storage
              │  trigger job via Trigger.dev SDK
              ▼
        Trigger.dev (free tier) ── ingestion task: parse → chunk → embed
              │                 └─ question-gen task: Anthropic Message Batches
              ▼
        Supabase: Postgres + pgvector (halfvec 1024, HNSW) + tsvector FTS
                  + Auth (anonymous sessions) + Storage (book files)
              ▲
        Answer API: hybrid search (RRF in SQL) → Sonnet 5 synthesis w/ citations
```

- **Jobs:** Trigger.dev (tasks as TS in this repo; durable runs, auto-retries, trace
  dashboard). Rejected: Supabase Edge Functions (150–400s caps, PDF.js-on-Deno friction),
  Inngest (paid jump), Vercel Queues/Workflows (immature, Pro-shaped), jobs table + worker
  (babysitting for no credit). Ingestion compute runs in Trigger.dev / Vercel Node fns —
  Vercel Node functions can run up to 30 min (Pro, since Jun 2026) if needed.
- **PDF parsing:** `unpdf` (UnJS, serverless-optimized PDF.js, zero native deps).
  Fallback: `mupdf` WASM (AGPL — acceptable for an MIT open-source app only as an optional self-hosted path; needs `outputFileTracingIncludes` on Vercel).
  Hosted parsers (LlamaParse etc.) rejected — books are the easy case (~$5/book for output unpdf gives free).
- **EPUB parsing:** DIY — `fflate` + `fast-xml-parser` (OPF/spine) + `linkedom` per-chapter
  XHTML walk (~100 lines). Rejected: epub2/@gxl (stale), epub.js (browser renderer, wrong tool server-side).
- **Chunking:** structure-aware (chapter → section by headings), recursive-split to
  ~400–512 tokens, 10–15% overlap; prepend breadcrumb `Book › Chapter › Section` to every
  chunk before embedding. Optional upgrade: Anthropic contextual retrieval
  (~$0.10–0.15/book with batched Haiku + caching) if breadcrumbs underperform.
- **Embeddings:** Voyage `voyage-4-lite` — $0.02/M, 1024-dim (Matryoshka), 32k context,
  **200M free tokens** (≈ hundreds of books). Anthropic officially recommends Voyage.
- **Retrieval:** pgvector 0.8+ `halfvec(1024)` + HNSW (default params) + hybrid search
  (ANN + tsvector FTS fused with RRF in one SQL function). Later one-call upgrade:
  Voyage `rerank-2.5-lite` on top-20 ($0.02/M, 200M free).
- **Generation:** question-gen = **Haiku 4.5 via Message Batches** (50% off → $0.50/$2.50 per M;
  pennies per book). Answer synthesis on tap = **Sonnet 5** ($2/$10 intro through Aug 31 2026, then $3/$15).
- **Cost:** ~$0/mo idle (all free tiers) + a few dollars of batched Haiku per ingested library.

---

## MVP scope

**IN:** cloud re-platform (Supabase anon auth + pgvector + Storage; Vercel); ingestion
pipeline (above); batched book-first persona-conditioned question generation; answer-on-tap
with citations deep-linking to reader (`?loc=`); masonry feed with mixed tiles (ratio lives
in `lib/feed/discovery.ts`); editable free-text life-context that re-conditions the feed;
seeded public-domain demo corpus (mixed curiosity registers per the addendum below; exact
list chosen at seed time) + pre-filled persona; README with architecture diagram + thesis (a deliverable, not an afterthought).

**OUT (v2.1+):** ask-your-own-question; boards-per-goal (simple save survives from v1);
any explicit learning mechanics; behavior-inferred goals; anything social.

**Done-check (binary):** *a stranger opens a public URL with no account and, within 60
seconds: scrolls a live feed → taps a question → reads an answer with citations → taps a
citation → lands in the reader at that exact passage.*

---

## Build phases (one-shottable)

1. **P0 — Cloud skeleton:** Supabase project, schema (books, chunks w/ halfvec+tsvector,
   questions, answers, profiles, saves, jobs metadata), anon auth, Vercel deploy of existing shell.
2. **P1 — Ingestion:** Trigger.dev task (Storage → unpdf / DIY-EPUB → structure-aware
   chunks → voyage-4-lite → pgvector); seed script runs demo corpus through it.
3. **P2 — Feed:** masonry UI, quote tiles served from chunks (port v1 heuristic scorer), cover tiles.
4. **P3 — Question gen:** batched Haiku task, book-first persona-conditioned; question tiles live.
5. **P4 — Answer-on-tap:** hybrid search → Sonnet 5 synthesis with citations → reader deep-link.
6. **P5 — Demo polish:** persona edit → regeneration beat; README + diagram + screen recording.

Each phase has its own binary check; P0–P5 in order; done = the done-check above passes.
