# Manifest

## Key Files
- `docs/V2_BRIEF.md` — Locked product + architecture brief for Scrollwise v2 (question-feed RAG layer); supersedes Silo 4 in NEXT_STEPS.md
- `docs/STATUS.md` — Single source of truth for what v1 implements
- `docs/NEXT_STEPS.md` — v1 work silos (all v1 silos done; Silo 4 superseded by V2_BRIEF)
- `lib/extraction/` — v1 client-side EPUB/PDF extraction + heuristic scorer (scorer logic ports to server in v2 P2)
- `lib/feed/discovery.ts` — Feed ranking (score + variety + serendipity); v2 tile-mix ratio lives here
- `app/reader/[bookId]/` — Reader with `?loc=` deep links; v2 citation destination

## Recent Changes
- 2026-07-11: Updated `docs/V2_BRIEF.md` — addenda: public identity, domain, repo flow, brand, auth scope, demo-corpus register
- 2026-07-11: Created `tests/fixtures/` — public-domain EPUB/PDF fixtures (Meditations, Bennett, arXiv) for ingestion tests
- 2026-07-11: Created `docs/V2_BRIEF.md` — grill session locked v2 decisions + researched cloud architecture
- 2026-07-11: Created `MANIFEST.md` — repo previously had none
