# Manifest

## Key Files
- `docs/V2_BRIEF.md` — Locked product + architecture brief for Scrollwise v2 (question-feed RAG layer); supersedes Silo 4 in NEXT_STEPS.md
- `docs/ARCHITECTURE.md` — System diagram (mermaid), module status map, design invariants
- `docs/BRAND.md` — Curio brand system: voice, Fontshare type trio, book-color cycle, form/motion tokens, register-switch rule
- `lib/server/ingestion/` — Server-side EPUB/PDF → chapters → 400-512-token chunks with breadcrumbs (fflate/linkedom/unpdf/js-tiktoken)
- `lib/server/scoring/` — Chunk quality scoring, chapter-balanced quote-tile selection, sentence-aligned display excerpts
- `lib/server/generation/` — Zod schemas, question/answer prompt builders (voice constants in prompts.ts), hardened model-JSON parsing
- `supabase/migrations/` — v2 schema: books/chunks (halfvec + FTS + HNSW), questions/answers/citations, profiles, saves, RLS, `hybrid_search` RRF function
- `tests/fixtures/` — EPUB/PDF ingestion-test fixtures; provenance and licenses in `tests/fixtures/README.md`
- `docs/STATUS.md` — Single source of truth for what v1 implements
- `docs/NEXT_STEPS.md` — v1 work silos (all v1 silos done; Silo 4 superseded by V2_BRIEF)
- `lib/extraction/` — v1 client-side EPUB/PDF extraction + heuristic scorer (scorer logic ports to server in v2 P2)
- `lib/feed/discovery.ts` — Feed ranking (score + variety + serendipity); v2 tile-mix ratio lives here
- `app/reader/[bookId]/` — Reader with `?loc=` deep links; v2 citation destination

## Recent Changes
- 2026-07-11: Updated `docs/V2_BRIEF.md` — addenda: public identity, domain, repo flow, brand, auth scope, demo-corpus register
- 2026-07-12: Replaced arXiv PDF fixture with self-generated `meditations-notes.pdf` (license review); added fixtures provenance README
- 2026-07-11: Created `tests/fixtures/` — EPUB/PDF fixtures (Meditations, Bennett) for ingestion tests
- 2026-07-11: Created `docs/V2_BRIEF.md` — grill session locked v2 decisions + researched cloud architecture
- 2026-07-11: Created `MANIFEST.md` — repo previously had none
