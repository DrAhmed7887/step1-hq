# Gemini Pro Deep Research — Full Technical Report
# Source: Gemini 3.1 Pro Deep Research, March 2026
# Topic: AI-Enhanced USMLE Step 1 Preparation

## Key Findings for the War Room v4 Build

### 1. How Students Actually Use AI (Multi-Model Ecosystem)
- ChatGPT: 24/7 Socratic tutor, teach-back method, custom GPTs (AMBOSS GPT)
- Gemini: Bulk text processing (1M+ token window), textbook ingestion, outlines
- NotebookLM: Grounded RAG (no hallucinations), Audio Overviews, flashcard generation
- Claude: Best for clinical vignette generation, formatting consistency, logical distractors
- Perplexity: Data scout for rapid fact-checking, NOT for deep study

### 2. The First Aid + ChatGPT Only Workflow (someone passed with this)
Step 1: Select FA chapter section (e.g. Herniation Syndromes)
Step 2: Copy dense FA text into ChatGPT
Step 3: Prompt: "Expand on this outline. Explain pathophysiology. No low-yield info."
Step 4: Immediately ask AI to test you with novel clinical scenario
Step 5: Go to UWorld questions on that topic
Step 6: For missed Qs, paste UWorld explanation into AI for clarification
Key: Eliminates ALL video lectures. Reclaims hundreds of hours for UWorld.

### 3. RTFC Prompt Framework (best for medical AI)
Role: "Board-certified physician and NBME item-writer"
Task: "Create 5-item MCQ testing pathophysiology of provided text"
Format: "Single-best-answer, 4-sentence vignette, vitals, PE, explanations for all distractors"
Context: "M2 student preparing for USMLE Step 1"

### 4. Self-Critique Loop (2-phase question generation)
Phase 1: AI generates the clinical vignette and options
Phase 2: AI critiques its own question:
  - Is it a real clinical scenario or pseudovignette?
  - Are distractors plausible but definitively incorrect?
  - Does it align with USMLE cognitive levels?
  - Rewrite if necessary

### 5. AnkiConnect Technical Blueprint
- Plugin exposes REST API on localhost:8765
- AnKing v12 tags: #AK_Step1_v12::#UWorld::Step::QIDNUMBER
- findNotes action to search by tag query
- suspend action (suspend: false) to unsuspend matched cards
- GitHub refs: rad1shayeb/anki-question-id-manager, abdmohrat/usmle-question-id-converter

### 6. FSRS Algorithm
- Free Spaced Repetition Scheduler (ML-based)
- Outperforms legacy SM-2 algorithm
- Tracks retrievability, stability, difficulty per card
- Enable in Anki: Settings - Scheduling - Enable FSRS

### 7. AnKing Verdict: Do NOT switch from Anki
- AI-native tools (RemNote, Flashrecall, Wisdolia) are convenient but lack:
  - Cross-resource tagging (FA, Pathoma, Sketchy, UWorld QIDs)
  - Clinical nuance in auto-generated cards
  - 35,000+ human-curated cards
- Best strategy: AnKing deck + FSRS + AI tools only for in-house lecture material

### 8. NotebookLM Workflows with First Aid PDF
- Audio Overviews: Generate podcast-style discussions per system
  Listen during commute/Emma gymnastics as cognitive primer
- Flashcard Generation: "Review Nephrotic Syndromes. Generate 15 cloze cards."
  Export CSV and import to Anki
- Cross-System Queries: "Find every mention of macrophages across all chapters"
- Limitation: Cannot interpret images, diagrams, or pathway charts in PDF

### 9. Open-Source GitHub Repos (2025-2026)
| Repo | Purpose |
|------|---------|
| bio-nlp/MedQG | USMLE question generation with self-refine (NAACL 2025) |
| serenayj/DRKnows | Knowledge graphs via UMLS/SNOMED for clinical reasoning |
| pat-jj/TextbookKG | Interactive knowledge graphs from textbooks |
| bernardolab/MedEvalArena | LLM benchmarking for medical reasoning |
| som-shahlab/gpt4usmle | End-to-end exam content pipeline |
| rad1shayeb/anki-question-id-manager | QID to AnKing tag converter |
| abdmohrat/usmle-question-id-converter | Same concept |

### 10. Study Copilot Architecture (what we are building)
The Gemini research describes exactly what the War Room v4 IS:
- Telemetry layer: Daily logs feed UWorld performance + FA progress
- Dynamic cross-referencing: Identifies delta between read content and actual performance
- Targeted AI quizzing: Auto-generates MCQs on weakest areas via Claude API
- Predictive scoring: Multi-variable regression from UW, NBME, FA, Anki data
- Proactive alerts: Detects falling behind, suggests schedule changes or exam postponement

### 11. NBME Prediction Model
```
Predicted_Score = 0.35*(Recent_UW_Avg) + 0.35*(Recent_NBME) + 0.15*(FA_Completion) + 0.10*(Anki_Consistency) + 0.05*(Streak)
```
AMBOSS predicts within 7-10 point margin using similar weighted averages.
Readiness: 2x NBME >65% AND Free 120 >70% = safe to sit.

### 12. High-Yield Prompt Templates
| Goal | Prompt |
|------|--------|
| Simplify | "Explain X using real-world analogy, 200 words max, for M2 level" |
| Compare | "Table: X vs Y. Columns: Pathophys, Presentation, Diagnostic, Treatment" |
| Vignette | "USMLE vignette testing X. Demographics, labs, 5 choices, explain all." |
| Anki cards | "80% Basic cards (deep retrieval), 20% Cloze (sequences/triads only)" |
