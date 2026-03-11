# STUDY COACH AI — Scientific Design Document
## Ahmed's Step 1 War Room v4 — The Coaching Engine
## March 11, 2026

---

## PHILOSOPHY

The coach is not a feature. It IS the app. Every other feature (FA Navigator, Heat Map, Daily Log) feeds data INTO the coach. The coach produces ONE output: **"Here's what you should do in the next 30 minutes, and here's why."**

---

## SCIENTIFIC FOUNDATIONS

### 1. PERIODIZATION (Tudor Bompa, 1983 — Sports Science → Study Science)
Athletes don't train at 100% every day. They cycle through phases to peak at the right time.

| Phase | Weeks | Daily Qs | Mode | Sports Analogy |
|-------|-------|----------|------|----------------|
| Foundation | Apr–May (8w) | 20/day | Tutor, system-based | Pre-season conditioning |
| Integration | June (4w) | 40/day | Mixed → random | Tactical training |
| Intensive | Jul 1–21 (3w) | 80/day | Timed random, incorrects | Match simulation |
| Taper | Jul 22–Aug 14 (2w) | 40/day | Targeted weak spots | Championship week |

**KEY**: The coach ADJUSTS phase transitions based on PERFORMANCE, not calendar.
If scoring 55% UWorld average at end of Phase 1, DON'T move to Phase 2. Extend until 60%+.

### 2. DELIBERATE PRACTICE (K. Anders Ericsson, 1993)
You don't improve by practicing what you're good at. The coach forces you toward your WEAKEST systems.

Formula: `Time_Allocation = Base_Time × (1 / System_Accuracy²)`

Example: If Renal accuracy = 40% and Cardio = 75%, Renal gets 3.5x more study time than Cardio.

### 3. THE 85% RULE (Wilson et al., 2019, Nature Communications)
Learning is optimized when you get ~85% of practice questions right.

| Accuracy Range | Coach Action |
|----------------|-------------|
| Below 60% | "Go back to Pathoma + FA for this system. Don't waste UWorld questions on content you haven't learned yet." |
| 60–70% | "Good learning zone but fragile. Keep system-based tutor mode. Read explanations carefully." |
| 70–85% | "Sweet spot. You're learning efficiently. Stay here. This is where real growth happens." |
| 85–95% | "Approaching mastery. Reduce time on this system. Redirect to weaker ones." |
| Above 95% | "You own this. Maintenance only (Anki reviews). Move on to what needs work." |

### 4. COGNITIVE LOAD THEORY (John Sweller, 1988)
Don't fight your brain on bad days. Work WITH your energy.

**Low energy day prescription:**
- DO: Anki reviews (30 min), Sketchy videos, light FA re-reading of strong systems
- DON'T: New UWorld blocks, new Pathoma chapters, NBMEs
- Max: 2–3 hours
- Coach message: "Low energy day. Protect the streak with light work. This IS studying."

**Medium energy day prescription:**
- DO: Anki reviews (30 min), UWorld 20 Qs weakest system (tutor), FA next section
- DON'T: Timed blocks or NBMEs
- Max: 3–4 hours
- Coach message: "Solid day. Focus on [WEAKEST_SYSTEM] — it needs the most attention right now."

**High energy day prescription:**
- DO: Anki reviews (30 min), UWorld 40 Qs weakest system (TIMED), new FA section, Pathoma chapter
- DON'T: Waste prime cognitive hours on Anki or review
- Max: 4–5 hours
- Coach message: "High energy. Let's attack [WEAKEST]. You're at [X%] — we need this above 70%."

### 5. SPACING & INTERLEAVING (Roediger & Karpicke, 2006)
- Never study the same system for more than 3 consecutive days
- After 3 days of one system, force-switch to a different one
- Mix: 70% current focus system + 30% random review from past systems
- Track "days since last touched" per system
- Alert at 7+ days ("going cold")
- FORCE into daily plan at 14+ days (regardless of other priorities)

### 6. BURNOUT PROTECTION (Research-backed sustainable limits)
- Hard cap: 5 hours/day on weekdays, 2 hours on weekends
- If logged >5 hours for 3 consecutive days: "Recovery day recommended. You're overreaching."
- If streak breaks after 14+ days: "Streaks are motivation, not obligation. One day off is recovery, not failure."
- If NBME score drops between attempts: "Scores fluctuate within a 10-point band. This is normal. Let's look at which systems dropped and why."
- If 2 consecutive zero-study days: "Two days off means momentum is fading. Let's do just 30 minutes today — that's enough to restart."

---

## DAILY COACHING ALGORITHM

Every time Ahmed opens the app, the coach runs this algorithm:

### INPUTS:
```
days_until_exam        // countdown to Aug 15, 2026
current_phase          // foundation / integration / intensive / taper
energy_level           // user input: High (3) / Medium (2) / Low (1)
available_hours        // user input: how many hours today
system_accuracy[]      // % correct per system from UWorld logs
system_last_studied[]  // date last studied per system
fa_progress[]          // pages read per system
anki_backlog           // pending review count
nbme_scores[]          // array of practice test scores + dates
streak_count           // consecutive days with >0 study activity
yesterday_performance  // what was logged yesterday
```

### STEP 1: PHASE CHECK
```javascript
function determinePhase(daysLeft, uwAvg) {
  if (daysLeft > 105) return "foundation";
  if (daysLeft > 60 && uwAvg >= 55) return "integration";
  if (daysLeft > 24 && uwAvg >= 60) return "intensive";
  if (daysLeft <= 24) return "taper";
  // OVERRIDE: if avg below threshold, extend current phase
  return "foundation"; // default: stay in foundation until ready
}
```

### STEP 2: ENERGY-ADJUSTED PRESCRIPTION
```javascript
function prescribeTasks(energy, phase, weakestSystem, availableHours) {
  const tasks = [];
  
  // Always start with Anki (but limit time)
  tasks.push({ task: "Anki reviews", time: 30, priority: "maintenance" });
  
  if (energy === "low") {
    tasks.push({ task: `Light FA re-read: ${strongestSystem}`, time: 45 });
    tasks.push({ task: `Sketchy video: ${nextSystem}`, time: 30 });
    return { tasks, message: "Low energy. Protect the streak with light work." };
  }
  
  if (energy === "medium") {
    tasks.push({ task: `UWorld 20 Qs: ${weakestSystem} (tutor)`, time: 90 });
    tasks.push({ task: `FA reading: ${currentSection}`, time: 60 });
    return { tasks, message: `Focus on ${weakestSystem} — currently at ${accuracy}%.` };
  }
  
  if (energy === "high") {
    tasks.push({ task: `UWorld 40 Qs: ${weakestSystem} (TIMED)`, time: 120 });
    tasks.push({ task: `FA new section + notes`, time: 60 });
    tasks.push({ task: `Pathoma chapter: ${tomorrowSystem}`, time: 45 });
    return { tasks, message: `Attack ${weakestSystem}. You're at ${accuracy}% — target is 70%.` };
  }
}
```

### STEP 3: SYSTEM SELECTION (Deliberate Practice Engine)
```javascript
function selectSystems(systemData) {
  // Sort by: accuracy ASC, then days_since_studied DESC
  const sorted = systemData.sort((a, b) => {
    if (a.accuracy === b.accuracy) return b.daysSince - a.daysSince;
    return a.accuracy - b.accuracy;
  });
  
  const primary = sorted[0];   // weakest + most neglected
  const secondary = sorted[1]; // 2nd priority
  
  // Determine activity type based on 85% rule
  let mode;
  if (primary.accuracy < 50) mode = "content_review"; // Pathoma + FA only
  else if (primary.accuracy < 70) mode = "tutor";      // UWorld tutor mode
  else mode = "timed";                                  // UWorld timed mode
  
  return { primary, secondary, mode };
}
```

### STEP 4: NEGLECT ALERTS
```javascript
function checkNeglected(systemData, today) {
  const warnings = [];
  const forced = [];
  
  systemData.forEach(sys => {
    const gap = daysBetween(sys.lastStudied, today);
    if (gap >= 14) forced.push({ system: sys, gap });
    else if (gap >= 7) warnings.push({ system: sys, gap });
  });
  
  return { warnings, forced };
}
```

### STEP 5: WEEKLY REVIEW (runs on Sundays)
```javascript
function weeklyReview(thisWeekLogs, lastWeekPlan) {
  const uwDone = sum(thisWeekLogs.map(l => l.questions));
  const uwPlanned = lastWeekPlan.questionTarget;
  const faDone = sum(thisWeekLogs.map(l => l.faPages));
  
  return {
    questionsCompleted: uwDone,
    questionsTarget: uwPlanned,
    completionRate: (uwDone / uwPlanned * 100).toFixed(0) + "%",
    hoursStudied: sum(thisWeekLogs.map(l => l.hours)),
    systemsCovered: unique(thisWeekLogs.flatMap(l => l.systems)),
    verdict: uwDone >= uwPlanned * 0.8 
      ? "Strong week. You hit your targets."
      : "Below target. Let's adjust next week — not guilt, just data."
  };
}
```

### OUTPUT FORMAT:
```
┌─────────────────────────────────────┐
│ 🏟️ COACH SAYS                       │
│                                     │
│ Phase: Foundation (Week 3 of 8)     │
│ System of the Day: Renal (39%)      │
│                                     │
│ TODAY'S GAME PLAN:                  │
│ 1. ⏱ Anki reviews (30 min)         │
│ 2. 📚 Pathoma Ch 10 — Renal (45m)  │
│ 3. 📖 FA p.616–635 — Renal (60m)   │
│ 4. 📝 UWorld 20 Qs Renal tutor (90m)│
│                                     │
│ WHY: Renal is your weakest system   │
│ at 39%. The 85% rule says content   │
│ review first, questions after. You  │
│ haven't touched Renal in 11 days.   │
│                                     │
│ 📊 Pass Probability: 47% 🟡         │
│ "Getting there. Stay the course."   │
│                                     │
│ 💡 20 Qs/day beats 80 on weekends. │
│    What's the next 30 minutes?      │
└─────────────────────────────────────┘
```

---

## NBME PASS PREDICTION MODEL

```javascript
function predictPass(data) {
  const uwNorm = data.recentUwAvg / 100;        // 0-1
  const nbmeNorm = data.latestNbmePct / 100;    // 0-1
  const faNorm = data.faCompletionPct / 100;     // 0-1
  const ankiNorm = data.ankiConsistencyPct / 100; // days with Anki / total days
  const streakNorm = Math.min(data.streak / 30, 1); // cap at 30 days
  
  const probability = (
    0.35 * uwNorm +
    0.35 * nbmeNorm +
    0.15 * faNorm +
    0.10 * ankiNorm +
    0.05 * streakNorm
  );
  
  return {
    probability: Math.round(probability * 100),
    level: probability < 0.4 ? "not_ready" 
         : probability < 0.6 ? "getting_there"
         : probability < 0.8 ? "on_track" 
         : "strong",
    color: probability < 0.4 ? "#ef4444" 
         : probability < 0.6 ? "#eab308"
         : "#10b981"
  };
}
```

---

## COACH PERSONALITY GUIDELINES

1. **Direct, not soft.** Like Mourinho, not Klopp.
2. **Data-driven.** Every recommendation cites a number.
3. **Honest about bad days.** "Yesterday: 0 questions. Fine. But 2 zero-days = momentum fading."
4. **Celebrates consistency over intensity.** "14-day streak matters more than any single 80-question day."
5. **Never shames.** Redirects: "Missed 3 days? Here's the adjusted plan. No panic."
6. **Context-aware.** Knows Emma has gymnastics M/W/Sat. Knows weekends are family time.

---

## MOTIVATIONAL ANCHORS (rotate when motivation drops)
1. "Emma and your family deserve a father who is healthy and present."
2. "You're building something rare: physician + AI specialist + multilingual."
3. "A mother of a 5-year-old working 40h/week passed Step 1. You can too."
4. "20 questions/day beats 80 on weekends. Consistency wins championships."
5. "One block at a time. What's the next 30 minutes?"
6. "You're not starting from zero. You have 12 years of clinical intuition. Step 1 just needs you to remember the science behind what you already do."

---

## FOR CODEX: IMPLEMENTATION NOTES

1. The coaching algorithm runs on app load via `useEffect` that computes the daily plan
2. Use Claude API (sonnet) for natural-language coaching messages, OR use pre-computed templates for speed
3. Store all historical data in localStorage/Firestore (daily logs, system accuracy, NBME scores)
4. The existing "Daily Start" card feeds energy + available hours into this algorithm
5. The coach's output REPLACES the current static "Must Win Today" logic with dynamic, science-based prescriptions
6. Add a "🏟️ Coach Says" banner at the TOP of Dashboard that changes daily based on the algorithm
7. The weekly review runs every Sunday and generates a "Report Card" with honest assessment
8. AnkiConnect integration (localhost:8765) should be wired into the Problem List → auto-unsuspend cards
9. NBME score predictor widget on Dashboard with color-coded pass probability
