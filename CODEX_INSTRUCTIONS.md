# Instructions for Codex — War Room + Command Center

## Project: USMLE Step 1 War Room + Life Command Center

### Files in this package:
1. `step1-warroom-v3.jsx` — USMLE Study Dashboard (React, 579 lines)
2. `command-center.jsx` — Life Management Dashboard (React, 410 lines)
3. `COACHING_ENGINE.md` — **THE MOST IMPORTANT FILE** — Scientific coaching algorithm
4. `GEMINI_RESEARCH.md` — AnkiConnect API blueprint, NBME predictor, advanced features
5. `CODEX_INSTRUCTIONS.md` — This file

### Priority Order:
**Read COACHING_ENGINE.md FIRST.** The app's primary purpose is to be an adaptive study coach, not a dashboard. Build the coaching algorithm first, then wrap the UI around it.

### Task for Codex:
Convert these Claude artifact React components into a standalone Vite + React app with:
1. Replace `window.storage.get/set` with `localStorage` (or IndexedDB via idb library)
2. Add routing between War Room and Command Center (React Router)
3. The AI Quiz tab calls `https://api.anthropic.com/v1/messages` — add API key handling via .env
4. Add Tailwind CSS config
5. Make it PWA-capable (offline studying is critical)
6. Implement the COACHING_ENGINE algorithm as the primary UX

### The Coaching Engine (from COACHING_ENGINE.md):
- Runs on app load, computes daily study plan
- Uses 6 scientific frameworks: Periodization, Deliberate Practice, 85% Rule, Cognitive Load Theory, Spacing/Interleaving, Burnout Protection
- Takes inputs: energy level, available hours, system accuracy data, FA progress
- Outputs: "Today's Game Plan" with 3-4 specific tasks, time estimates, and scientific reasoning
- Replaces the current static "Must Win Today" with dynamic, adaptive prescriptions
- Add a "Coach Says" banner at top of Dashboard

### AnkiConnect Integration (from GEMINI_RESEARCH.md):
- AnkiConnect plugin exposes REST API on localhost:8765
- When user enters missed UWorld QIDs, transform to AnKing tag queries
- Send POST to localhost:8765 to auto-unsuspend matching AnKing cards
- Tag format: `#AK_Step1_v12::#UWorld::Step::QIDNUMBER`

### NBME Score Predictor:
```
pass_probability = 0.35*(uw_avg/100) + 0.35*(nbme_avg/100) + 0.15*(fa_pct/100) + 0.10*(anki_consistency) + 0.05*(streak/30)
```

### Data Architecture:
- War Room storage key: `s1wr-v3` (JSON blob with logs, systems, bookmarks, problem list)
- Command Center storage key: `cmd-center-v1` (JSON blob with todos, events, goals, notes)
- 140+ medical topics with cross-references to FA pages, Pathoma, Sketchy, AnKing, BnB, Mehlman
- 16 organ systems with real page numbers from First Aid 2025

### Tech Stack:
- Vite + React
- Tailwind CSS
- localStorage or IndexedDB for persistence
- Anthropic API for AI Quiz (Claude Sonnet)
- AnkiConnect API (localhost:8765) for Anki integration
- Optional: Supabase/Firebase for cloud backup
- Optional: PWA with service worker

### GitHub Repos to Reference:
- `rad1shayeb/anki-question-id-manager` — QID to AnKing tag converter
- `abdmohrat/usmle-question-id-converter` — Same concept
- `bio-nlp/MedQG` — USMLE question generation with self-refine
- `som-shahlab/gpt4usmle` — End-to-end exam content pipeline
