import { readStorageJson } from "./persistence.js";

export const WAR_ROOM_STORAGE_KEY = "s1wr-v3";
const LEGACY_WAR_ROOM_STORAGE_KEY = "s1wr-v2";
export const TOTAL_UWORLD = 3400;
export const DEFAULT_EXAM_DATE = "2026-08-15";

export const ERROR_TAXONOMY = [
  {
    id: "clinical-overreach",
    label: "Clinical Overreach Bias",
    remediation: "Step back from management and review the tested mechanism."
  },
  {
    id: "vignette-misread",
    label: "Vignette Misinterpretation",
    remediation: "Lead with age, timeline, and exposure clues before solving."
  },
  {
    id: "foundational-decay",
    label: "Foundational Decay",
    remediation: "Create a targeted card and revisit the core basic science."
  },
  {
    id: "secondary-order",
    label: "Secondary Order Failure",
    remediation: "Review adverse effects, contraindications, and linked associations."
  }
];

export const PASS_PROBABILITY_POINTS = [
  { epc: 0, probability: 0.1 },
  { epc: 52, probability: 0.35 },
  { epc: 55, probability: 0.52 },
  { epc: 60, probability: 0.8 },
  { epc: 63, probability: 0.89 },
  { epc: 64, probability: 0.92 },
  { epc: 66, probability: 0.95 },
  { epc: 67, probability: 0.96 },
  { epc: 70, probability: 0.985 },
  { epc: 100, probability: 0.995 }
];

export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createDailyStart(date = todayKey()) {
  return {
    date,
    energy: "medium",
    availableHours: 4,
    note: ""
  };
}

export function createDailyPlan() {
  return {
    date: "",
    primarySectionId: "",
    generatedAt: "",
    snapshot: null
  };
}

export function interpolatePassProbability(epc) {
  if (Number.isNaN(epc)) {
    return 0;
  }

  for (let index = 1; index < PASS_PROBABILITY_POINTS.length; index += 1) {
    const previous = PASS_PROBABILITY_POINTS[index - 1];
    const current = PASS_PROBABILITY_POINTS[index];

    if (epc <= current.epc) {
      const span = current.epc - previous.epc || 1;
      const progress = (epc - previous.epc) / span;
      return previous.probability + (current.probability - previous.probability) * progress;
    }
  }

  return PASS_PROBABILITY_POINTS.at(-1).probability;
}

export function createSystemProgress(sections) {
  return sections.reduce((accumulator, section) => {
    accumulator[section.id] = {
      questionsDone: 0,
      correct: 0,
      confidence: 0,
      faRead: false,
      pathomaDone: false,
      sketchyDone: false,
      notes: "",
      lastStudied: ""
    };
    return accumulator;
  }, {});
}

export function createWarRoomState(sections) {
  return {
    examDate: DEFAULT_EXAM_DATE,
    dailyTarget: 40,
    dailyStart: createDailyStart(),
    dailyPlan: createDailyPlan(),
    logs: {},
    totalQuestions: 0,
    totalCorrect: 0,
    streak: 0,
    doneTopics: [],
    bookmarks: [],
    systemProgress: createSystemProgress(sections),
    problems: [],
    assessments: [],
    nbmeAnalyses: [],
    fatigueEntries: [],
    completedResources: [],
    aiSettings: {
      mode: "client",
      endpoint: "https://api.anthropic.com/v1/messages",
      apiKey: "",
      model: "claude-sonnet-4-20250514",
      promptPrefix:
        "Act as a board-certified physician and expert USMLE Step 1 item writer. Build a single high-yield vignette, 5 answer choices, and explain the correct answer plus each distractor."
    }
  };
}

function mergeSystemProgress(savedProgress, defaults) {
  const merged = { ...defaults };

  Object.entries(savedProgress || {}).forEach(([sectionId, value]) => {
    if (!merged[sectionId]) {
      return;
    }

    merged[sectionId] = {
      ...merged[sectionId],
      ...value
    };
  });

  return merged;
}

export function mergeWarRoomState(saved, sections) {
  const defaults = createWarRoomState(sections);

  if (!saved) {
    return defaults;
  }

  return {
    ...defaults,
    ...saved,
    dailyStart: {
      ...defaults.dailyStart,
      ...(saved.dailyStart || {})
    },
    dailyPlan: {
      ...defaults.dailyPlan,
      ...(saved.dailyPlan || {})
    },
    systemProgress: mergeSystemProgress(saved.systemProgress, defaults.systemProgress),
    aiSettings: {
      ...defaults.aiSettings,
      ...(saved.aiSettings || {})
    },
    problems: Array.isArray(saved.problems) ? saved.problems : [],
    assessments: Array.isArray(saved.assessments) ? saved.assessments : [],
    nbmeAnalyses: Array.isArray(saved.nbmeAnalyses) ? saved.nbmeAnalyses : [],
    fatigueEntries: Array.isArray(saved.fatigueEntries) ? saved.fatigueEntries : [],
    completedResources: Array.isArray(saved.completedResources) ? saved.completedResources : []
  };
}

export function migrateLegacyWarRoomState(sections) {
  const legacy = readStorageJson(LEGACY_WAR_ROOM_STORAGE_KEY);

  if (!legacy) {
    return createWarRoomState(sections);
  }

  const migrated = createWarRoomState(sections);
  migrated.examDate = DEFAULT_EXAM_DATE;
  migrated.dailyTarget = legacy.dt || migrated.dailyTarget;
  migrated.logs = legacy.logs || {};
  migrated.totalQuestions = legacy.tq || 0;
  migrated.totalCorrect = legacy.tc || 0;
  migrated.streak = legacy.streak || 0;
  migrated.doneTopics = legacy.done || [];
  migrated.bookmarks = legacy.bm || [];

  Object.entries(legacy.sp || {}).forEach(([sectionId, value]) => {
    if (!migrated.systemProgress[sectionId]) {
      return;
    }

    migrated.systemProgress[sectionId] = {
      questionsDone: value.qd || 0,
      correct: value.qc || 0,
      confidence: value.cf || 0,
      faRead: Boolean(value.fr),
      pathomaDone: Boolean(value.pd),
      sketchyDone: Boolean(value.sd),
      notes: value.n || "",
      lastStudied: ""
    };
  });

  return migrated;
}

export function hydrateWarRoomState(saved, sections) {
  if (saved) {
    return mergeWarRoomState(saved, sections);
  }

  return migrateLegacyWarRoomState(sections);
}

export function calculateTotals(logs) {
  return Object.values(logs).reduce(
    (accumulator, log) => {
      accumulator.totalQuestions += Number(log.questions || 0);
      accumulator.totalCorrect += Number(log.correct || 0);
      return accumulator;
    },
    { totalQuestions: 0, totalCorrect: 0 }
  );
}

export function calculateStreak(logs) {
  let streak = 0;
  const cursor = new Date();

  while (true) {
    const key = todayKey(cursor);
    const entry = logs[key];
    const touched = entry && ((entry.questions || 0) > 0 || (entry.hours || 0) > 0);

    if (!touched) {
      return streak;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
}

export function calculateAccuracy(correct, total) {
  if (!total) {
    return 0;
  }

  return Math.round((correct / total) * 100);
}

export function computeReadiness(assessments) {
  if (!assessments || assessments.length === 0) {
    return {
      status: "Unsafe",
      tone: "text-coral",
      reasons: ["No NBMEs or assessments logged yet."]
    };
  }

  const ordered = [...assessments].sort((a, b) => a.date.localeCompare(b.date));
  const nbmes = ordered.filter((assessment) => assessment.kind === "NBME");
  const free120 = ordered.filter((assessment) => assessment.kind === "Free120").at(-1);

  if (nbmes.length === 0) {
    return {
      status: "Unsafe",
      tone: "text-coral",
      reasons: ["No explicit NBME data logged to determine safety margin."]
    };
  }

  const lastThreeNbmes = nbmes.slice(-3);
  const lastNbme = nbmes.at(-1);
  const passProb = interpolatePassProbability(lastNbme.epc);

  const reasons = [];

  if (passProb < 0.9) {
    reasons.push(`Latest NBME (${lastNbme.label}) is below a strong passing range.`);
  } else {
    reasons.push(`Latest NBME (${lastNbme.label}) sits in a comfortable passing range.`);
  }

  if (lastThreeNbmes.length > 1 && lastNbme.epc < lastThreeNbmes.at(-2).epc) {
    reasons.push("Recent score momentum has dipped.");
  } else if (lastThreeNbmes.length > 1) {
    reasons.push("Momentum is stable or improving.");
  }

  if (free120) {
    reasons.push(`Free 120 baseline available (${free120.epc}%).`);
  }

  let status = "Unsafe";
  let tone = "text-coral";

  if (passProb >= 0.98) {
    status = "Ready if stable";
    tone = "text-mint";
  } else if (passProb >= 0.90) {
    status = "Probably Safe";
    tone = "text-teal";
  } else if (passProb >= 0.60) {
    status = "Borderline";
    tone = "text-amber";
  }

  return { status, tone, reasons };
}
