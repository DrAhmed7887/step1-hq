# USMLE Step 1 War Room

Standalone Vite + React app that converts the available React artifacts into a routed local-first workspace:

- `War Room` for Step 1 study tracking and the daily coaching engine
- `Command Center` for schedule, family constraints, goals, notes, and focus blocks

## Stack

- Vite + React
- React Router
- Tailwind CSS
- localStorage persistence
- Vite PWA plugin for offline-capable installability
- Recharts for richer progress visualization
- Science-based coaching engine driven by periodization, deliberate practice, the 85% rule, cognitive load theory, spacing, and burnout protection

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Routes

- `/war-room`
- `/command-center`

## Storage Keys

- War Room: `s1wr-v3`
- Command Center: `cmd-center-v1`

The app will also try to migrate legacy War Room data from `s1wr-v2` on first load.

## What Was Ported

From the existing artifact:

- First Aid navigator with topic search
- Daily log
- System progress tracking
- Heat-map style progress cards
- Study plan / readiness framing

Added during conversion:

- Real routing between War Room and Command Center
- localStorage persistence
- A coaching engine that runs on app load and recalculates the daily plan from energy, available hours, study phase, weak systems, neglect alerts, and burnout limits
- Qualitative error taxonomy for missed questions
- NBME / Free 120 readiness tracker with pass-probability estimates
- Fatigue / environment correlation logging
- Bulk mixed-system logging for question blocks
- Backup import for both single-page and full-app JSON restores
- Resilience / "People Like You" benchmarking and survivor-story panels
- AI quiz panel with configurable Anthropic-compatible endpoint
- PWA manifest + service worker
- Optional serverless Anthropic proxy
- Optional Supabase Edge Function sync scaffold

## Import / Export

- War Room settings can export:
  - War Room only JSON
  - full backup JSON containing both app states
- War Room and Command Center can both import backups
- Full backups restore both storage keys:
  - `s1wr-v3`
  - `cmd-center-v1`

## AI Quiz Security

The app now supports two modes:

- `Direct client call`: keeps the original local-only behavior
- `Proxy mode`: sends the request to `/api/anthropic`

Proxy file:

- [api/anthropic.js](/Users/ahmedzayed/Downloads/WarRoom/api/anthropic.js)

Set `ANTHROPIC_API_KEY` on the server before using proxy mode. For local-only personal use, direct mode is still available.

## Cloud Sync

Cloud sync is scaffolded around a Supabase Edge Function:

- Edge function: [supabase/functions/war-room-sync/index.ts](/Users/ahmedzayed/Downloads/WarRoom/supabase/functions/war-room-sync/index.ts)
- SQL migration: [supabase/migrations/20260311_create_sync_snapshots.sql](/Users/ahmedzayed/Downloads/WarRoom/supabase/migrations/20260311_create_sync_snapshots.sql)

The War Room settings panel lets you enter:

- Supabase project URL
- Supabase anon key
- Private sync key

Then you can push or pull a full snapshot for both pages.

Notes:

- This is a scaffold, not a hosted service
- You need a real Supabase project and deployed Edge Function
- I verified the front-end integration and local build, but not a live Supabase deployment in this repo

## Coaching Engine

The primary UX is now the `Coach Says` layer at the top of the War Room. It:

- resolves the current phase from days left and recent UWorld performance
- prioritizes the weakest or most neglected system
- adjusts the workload to the user's energy level and available hours
- applies the 85% rule to choose content review vs tutor vs timed work
- enforces spacing/interleaving and burnout caps
- forecasts pass probability with the weighting formula from `COACHING_ENGINE.md`

The inputs for energy and available hours are persisted in the War Room state so the plan is recreated on each load instead of requiring a one-off “generate plan” action.

## Cleanup

The redundant root-level artifact copies and the old generic decision engine were removed so the only canonical UI is the Vite app under `src/`.
