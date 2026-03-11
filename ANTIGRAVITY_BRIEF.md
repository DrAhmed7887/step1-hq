# ANTIGRAVITY BRIEF — Upgrade War Room v4 with Gemini Research
# March 11, 2026

## Context
Codex has already built War Room v4 and Command Center v4 with:
- Daily coaching engine (coach runs first, dashboard feeds it)
- Energy Map (Morning/Afternoon/Evening sliders)
- Family-first mode
- Seven-day cadence tracker
- Readiness Signal + Behind Meter
- Constraint Benchmark
- Rapid Capture Inbox, Triage Inbox
- Publishing Pipeline, Project Decomposition

This document contains NEW technical research from Gemini Pro Deep Research
that should be integrated into the existing v4.

---

## UPGRADE 1: AnkiConnect Auto-Unsuspend Pipeline (THE BIG ONE)

When Ahmed enters missed UWorld Question IDs, the app auto-unsuspends
matching AnKing Anki cards. Zero-friction UWorld-to-Anki pipeline.

### Technical:
- AnkiConnect plugin (addon code: 2055492159) exposes REST API on localhost:8765
- AnKing v12 tag format: #AK_Step1_v12::#UWorld::Step::QIDNUMBER

### Implementation:
1. Add input field in Daily Log or Problem List: "Paste missed UWorld QIDs"
2. User enters: 21656, 19263, 4466
3. App transforms to query string:
   "tag:#AK_Step1_v12::#UWorld::Step::21656" OR "tag:#AK_Step1_v12::#UWorld::Step::19263" OR "tag:#AK_Step1_v12::#UWorld::Step::4466"

4. App sends POST to http://localhost:8765:
```json
{
  "action": "findNotes",
  "version": 6,
  "params": {
    "query": "\"tag:#AK_Step1_v12::#UWorld::Step::21656\" OR \"tag:#AK_Step1_v12::#UWorld::Step::19263\""
  }
}
```

5. Response returns note IDs. Send second call to unsuspend:
```json
{
  "action": "suspend",
  "version": 6,
  "params": { "cards": [CARD_ID_ARRAY], "suspend": false }
}
```

6. Show: "14 AnKing cards unsuspended for today's missed questions"

### Error handling:
- AnkiConnect not running: "Open Anki + install AnkiConnect (addon 2055492159)"
- No cards found: "No AnKing cards for QID 12345 - manual search needed"

---

## UPGRADE 2: AI Quiz - RTFC + Self-Critique (2-Phase Generation)
Current AI Quiz sends single prompt. Upgrade to 2-phase for higher quality:

### Phase 1 (RTFC Framework):
```
Role: Board-certified physician and expert NBME/USMLE item-writer.
Task: Create ONE clinical vignette MCQ testing: [TOPIC]
Format: Single-best-answer. 4-sentence vignette with demographics, chief
        concern, vitals, PE, labs. 5 choices (A-E). Explain correct + all distractors.
Context: Physician preparing for Step 1. FA 2025 pages [START]-[END].
```

### Phase 2 (Self-Critique - send as follow-up):
```
Critically review the MCQ:
1. Real clinical scenario or pseudovignette?
2. All distractors plausible but definitively incorrect?
3. Correct answer aligns with Step 1 cognitive levels?
4. Rewrite if any issues. Output final JSON only.
```

---

## UPGRADE 3: NBME Score Predictor Widget

Add to Dashboard. Updates with every daily log entry.

```javascript
function predictPass(data) {
  const prob = (
    0.35 * Math.min(data.recentUwAvg / 100, 1) +
    0.35 * Math.min(data.latestNbmePct / 100, 1) +
    0.15 * Math.min(data.faCompletionPct / 100, 1) +
    0.10 * Math.min(data.ankiConsistencyPct / 100, 1) +
    0.05 * Math.min(data.streak / 30, 1)
  );
  return {
    probability: Math.round(prob * 100),
    color: prob < 0.4 ? "#ef4444" : prob < 0.6 ? "#eab308" : "#10b981",
    label: prob < 0.4 ? "Not ready yet"
         : prob < 0.6 ? "Getting there"
         : prob < 0.8 ? "On track" : "Strong position"
  };
}
```

UI: Circular gauge or ring on Dashboard with %, color, and label.
Inputs: UW avg, latest NBME score (user enters), FA progress, Anki consistency, streak.

---

## UPGRADE 4: Multi-Model Workflow Reference

Add collapsible card in Resources or Settings:

| Task | Best AI Tool |
|------|-------------|
| FA text explanation | ChatGPT or NotebookLM |
| Clinical vignette generation | Claude API (already built) |
| Bulk text processing | Gemini (1M+ token window) |
| Quick fact-checking | Perplexity |
| Audio study (commute/gym) | NotebookLM Audio Overviews |
| Grounded Anki cards from FA | NotebookLM then CSV then Anki |
| Deep research | Perplexity Pro or Gemini Deep Research |

---

## UPGRADE 5: NotebookLM Setup Guide (one-time card)

1. Upload First Aid 2025 PDF to NotebookLM
2. Generate Audio Overviews per system - listen during Emma gymnastics or commute
3. Cross-system queries: "Find every mention of granulomas across all chapters"
4. Generate cloze cards from specific sections then export CSV then import to Anki
5. Limitation: Cannot interpret images/diagrams in FA PDF

---

## UPGRADE 6: FSRS Reminder Banner

One-time dismissible banner:
"Enable FSRS in Anki: Settings - Scheduling - Enable FSRS.
ML-based algorithm that outperforms default SM-2.
Reduces daily review burden while maintaining retention."

---

## UPGRADE 7: Phased AI Study Workflow (from Gemini research)

Students use a 3-step daily AI workflow:
1. PRIME (NotebookLM): Listen to Audio Overview of today FA chapter during commute
2. DECONSTRUCT (ChatGPT/Gemini): Generate structured outline, separate HY from LY
3. ACTIVE RECALL (Claude): Generate clinical vignettes and Anki cards from outline

The War Room could suggest this workflow in the Coach Says banner
based on which system is being studied today.

---

## GitHub Repos Worth Integrating:
1. rad1shayeb/anki-question-id-manager - QID to AnKing converter
2. abdmohrat/usmle-question-id-converter - Same concept
3. bio-nlp/MedQG - USMLE question generation with self-refine (NAACL 2025)
4. som-shahlab/gpt4usmle - End-to-end exam content pipeline
5. pat-jj/TextbookKG - Interactive knowledge graphs from textbooks

---

## Summary for Antigravity:
1. AnkiConnect QID pipeline (BIGGEST WIN - nobody has this)
2. AI Quiz upgrade to 2-phase RTFC + self-critique
3. NBME Score Predictor widget
4. Multi-model workflow reference card
5. NotebookLM setup guide
6. FSRS reminder banner
7. 3-step daily AI workflow suggestion in Coach
