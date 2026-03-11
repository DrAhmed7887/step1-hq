import divineInterventionMap from "../data/divineInterventionMap.json" with { type: "json" };
import faPageMap from "../data/faPageMap.json" with { type: "json" };
import resourceData from "../data/resourceSequencing.json" with { type: "json" };
import scheduleData from "../data/scheduleTemplates.json" with { type: "json" };
import studyPlanTemplates from "../data/studyPlanTemplates.json" with { type: "json" };
import { eventsForDate } from "./commandCenter.js";
import { getNextResource } from "./resourceMap.js";
import {
  getFirstAidCompletedUnits,
  getUWorldCompletedUnits,
  TOTAL_UWORLD
} from "./resourceProgress.js";
import { calculateAccuracy, todayKey } from "./warRoom.js";

export const ENERGY_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high"
};

export const ENERGY_OPTIONS = [
  {
    id: ENERGY_LEVELS.LOW,
    label: "Low",
    description: "Protect the streak. Light cognitive load only."
  },
  {
    id: ENERGY_LEVELS.MEDIUM,
    label: "Medium",
    description: "Stable day. Tutor mode and targeted review."
  },
  {
    id: ENERGY_LEVELS.HIGH,
    label: "High",
    description: "Prime day. Attack the weak point while you have it."
  }
];

const PHASES = {
  foundation: {
    id: "foundation",
    label: "Foundation",
    durationWeeks: 8,
    targetQuestions: 20,
    modeLabel: "Tutor, system-based",
    analogy: "Pre-season conditioning"
  },
  integration: {
    id: "integration",
    label: "Integration",
    durationWeeks: 4,
    targetQuestions: 40,
    modeLabel: "Mixed to random",
    analogy: "Tactical training"
  },
  intensive: {
    id: "intensive",
    label: "Intensive",
    durationWeeks: 3,
    targetQuestions: 80,
    modeLabel: "Timed random",
    analogy: "Match simulation"
  },
  taper: {
    id: "taper",
    label: "Taper",
    durationWeeks: 2,
    targetQuestions: 40,
    modeLabel: "Targeted weak spots",
    analogy: "Championship week"
  }
};

const JOURNEY_START_DATE = "2026-03-01";
const PHASE_MODIFIER_META = {
  content_phase: {
    ...PHASES.foundation,
    label: "Content Phase"
  },
  training_phase: {
    ...PHASES.integration,
    label: "Training Phase"
  },
  assessment_phase: {
    ...PHASES.intensive,
    label: "Assessment Phase"
  },
  final_week: {
    ...PHASES.taper,
    label: "Final Week"
  }
};
const SYSTEM_ALIASES = {
  biochemistry: "biochem",
  biochem: "biochem",
  immunology: "immuno",
  immuno: "immuno",
  microbiology: "micro",
  micro: "micro",
  pathology: "path",
  path: "path",
  pharmacology: "pharm",
  pharm: "pharm",
  publichealth: "pubhealth",
  publichealthsciences: "pubhealth",
  pubhealth: "pubhealth",
  biostats: "pubhealth",
  ethics: "pubhealth",
  cardiology: "cardio",
  cardiovascular: "cardio",
  cardio: "cardio",
  endocrine: "endo",
  endo: "endo",
  gastrointestinal: "gi",
  gi: "gi",
  hemeonc: "heme",
  hematologyoncology: "heme",
  heme: "heme",
  hematology: "heme",
  oncology: "heme",
  msk: "msk",
  mskskinct: "msk",
  mskskinconnectivetissue: "msk",
  musculoskeletal: "msk",
  skin: "msk",
  connectivetissue: "msk",
  neurology: "neuro",
  neuro: "neuro",
  psychiatry: "psych",
  psych: "psych",
  renal: "renal",
  nephrology: "renal",
  pathologypathoma: "path",
  reproductive: "repro",
  repro: "repro",
  respiratory: "resp",
  pulmonology: "resp",
  resp: "resp"
};
const READINESS_TONES = {
  Ready: "text-mint",
  "Probably Safe": "text-teal",
  Borderline: "text-amber",
  Unsafe: "text-coral",
  "Insufficient Data": "text-mist"
};
const SIX_MONTH_PLAN = studyPlanTemplates.plans["6-month"];

const MOTIVATION_ANCHORS = [
  "A very old graduate. Mother of a 5-year-old. Full time job 40h/week. She passed Step 1. You've got this.",
  "You cannot get this kind of selective, page-based testing from UWorld or AMBOSS. Trust the system.",
  "20 questions a day faithfully is superior to doing 80 questions on weekends. Consistency wins championships.",
  "Boards prep is 40% staying calm, 40% medical knowledge, 20% strategy and confidence. Don't panic.",
  "I started solving 20 questions daily... then gradually increased. Start small. Move fast.",
  "First Aid is the study spine. Use the page ranges to organize the day, then prove them in questions.",
  "Emma and your family deserve a father who is healthy and present. This is why we do this."
];

const RULE_BANDS = [
  {
    id: "rebuild",
    max: 60,
    label: "Below 60%",
    coachAction:
      "Go back to Pathoma and First Aid before spending expensive question-bank reps here.",
    mode: "content_review"
  },
  {
    id: "fragile",
    max: 70,
    label: "60-70%",
    coachAction:
      "Stay in tutor mode. You are learning, but the floor is still unstable.",
    mode: "tutor"
  },
  {
    id: "sweet-spot",
    max: 85,
    label: "70-85%",
    coachAction:
      "This is the 85% learning zone. Keep the reps coming and review every miss.",
    mode: "timed"
  },
  {
    id: "approaching-mastery",
    max: 95,
    label: "85-95%",
    coachAction:
      "Reduce direct time here and redirect effort toward weaker systems.",
    mode: "maintenance"
  },
  {
    id: "mastery",
    max: Infinity,
    label: "95%+",
    coachAction: "Maintenance only. Keep it alive with Anki and move on.",
    mode: "maintenance"
  }
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function daysBetween(left, right) {
  const leftDate = new Date(`${left}T12:00:00`);
  const rightDate = new Date(`${right}T12:00:00`);
  return Math.round((rightDate - leftDate) / 86400000);
}

function isEgyptWeekend(date) {
  const day = date.getDay();
  return day === 5 || day === 6;
}

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatMetricName(name) {
  return name
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function dateOnly(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return todayKey(new Date(value));
}

function daysUntil(dateKeyValue, referenceDate = new Date()) {
  if (!dateKeyValue) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor((new Date(`${dateKeyValue}T09:00:00`) - new Date(referenceDate)) / 86400000)
  );
}

export function getCurrentWeek(date = new Date(), journeyStart = JOURNEY_START_DATE) {
  const normalizedDate = dateOnly(date);
  const daysElapsed = daysBetween(journeyStart, normalizedDate);
  return clamp(Math.floor(daysElapsed / 7) + 1, 1, 26);
}

function resolvePhaseForWeek(currentWeek) {
  const match =
    Object.entries(scheduleData.phaseModifiers).find(([, modifier]) => {
      return currentWeek >= modifier.weeks[0] && currentWeek <= modifier.weeks[1];
    }) || Object.entries(scheduleData.phaseModifiers)[0];
  const [phaseKey, modifier] = match;
  const base = PHASE_MODIFIER_META[phaseKey] || PHASES.foundation;

  return {
    ...base,
    phaseKey,
    weeks: modifier.weeks,
    emphasis: modifier.emphasis,
    uworldMode: modifier.uworldMode,
    ankiStrategy: modifier.ankiStrategy,
    modeLabel: modifier.uworldMode
  };
}

function normalizeSystemKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function getStudyOrderPreference(userState = {}) {
  return userState.studyOrderPreference || userState.settings?.studyOrderPreference || "traditional";
}

function normalizePlanSystemName(systemName) {
  const trimmed = String(systemName || "").replace(/\s*\(.*?\)\s*/g, "").trim();

  if (trimmed === "MSK/Skin/CT") {
    return "MSK/Skin/Connective Tissue";
  }

  return trimmed;
}

function normalizeSystemId(system, sections = []) {
  if (!system) {
    return "";
  }

  const normalized = String(system).toLowerCase().replace(/[^a-z]/g, "");

  if (SYSTEM_ALIASES[normalized]) {
    return SYSTEM_ALIASES[normalized];
  }

  const directSection = sections.find(
    (section) =>
      section.id === normalized ||
      section.name.toLowerCase().replace(/[^a-z]/g, "") === normalized
  );

  return directSection?.id || "";
}

function getFaSectionBySystem(systemName, sections = []) {
  const normalized = normalizeSystemKey(normalizePlanSystemName(systemName));

  return (
    faPageMap.sections.find((section) => normalizeSystemKey(section.system) === normalized) ||
    faPageMap.sections.find(
      (section) => normalizeSystemId(section.system, sections) === normalizeSystemId(systemName, sections)
    ) ||
    null
  );
}

function getFaSectionForSectionId(sectionId, sections = []) {
  return faPageMap.sections.find(
    (section) => normalizeSystemId(section.system, sections) === sectionId
  ) || null;
}

function getDailyFaPageTarget(hoursAvailable) {
  if (hoursAvailable >= 6) {
    return faPageMap.dailyPageTarget["6+_hours"];
  }

  if (hoursAvailable >= 4) {
    return faPageMap.dailyPageTarget["4-5_hours"];
  }

  if (hoursAvailable >= 2) {
    return faPageMap.dailyPageTarget["2-3_hours"];
  }

  return 4;
}

function calculateSectionFaPagesCompleted(userState = {}, sectionId = "", topics = [], sections = []) {
  const faSection = getFaSectionForSectionId(sectionId, sections);

  if (!faSection) {
    return 0;
  }

  const sectionProgress = userState.systemProgress?.[sectionId];

  if (sectionProgress?.faRead) {
    return faSection.totalPages;
  }

  const topicsBySection = buildSectionTopicMap(topics);
  const relatedTopics = topicsBySection[sectionId] || [];
  const doneTopics = relatedTopics.filter((topic) => userState.doneTopics?.includes(topic.title)).length;

  if (!relatedTopics.length || !doneTopics) {
    return 0;
  }

  return Math.round((doneTopics / relatedTopics.length) * faSection.totalPages);
}

function calculateFaPagesCompleted(userState = {}, topics = [], sections = []) {
  const trackedPages = getFirstAidCompletedUnits(userState);

  if (trackedPages > 0) {
    return trackedPages;
  }

  if (typeof userState.faPagesCompleted === "number") {
    return Math.max(0, userState.faPagesCompleted);
  }

  return faPageMap.sections.reduce((sum, faSection) => {
    const sectionId = normalizeSystemId(faSection.system, sections);
    if (!sectionId) {
      return sum;
    }

    return sum + calculateSectionFaPagesCompleted(userState, sectionId, topics, sections);
  }, 0);
}

function getFaCompletionPctByPages(userState = {}, topics = [], sections = []) {
  return Math.round((calculateFaPagesCompleted(userState, topics, sections) / faPageMap.totalPages) * 100);
}

function getResourceWeeksActive(resourceId, currentWeek) {
  const resource = resourceData.resources.find((entry) => entry.id === resourceId);

  if (!resource?.startWeek || currentWeek < resource.startWeek) {
    return 0;
  }

  return currentWeek - resource.startWeek + 1;
}

function getCurrentJourneyDay(referenceDate = new Date()) {
  return clamp(daysBetween(JOURNEY_START_DATE, dateOnly(referenceDate)) + 1, 1, SIX_MONTH_PLAN.totalDays);
}

function getStudyPlanPhase(currentWeek) {
  return SIX_MONTH_PLAN.phases.find(
    (phase) => currentWeek >= phase.weeks[0] && currentWeek <= phase.weeks[1]
  ) || SIX_MONTH_PLAN.phases.at(-1);
}

export function resolveStudyPlanProgress(referenceDate = new Date(), userState = {}, sections = [], fallbackSectionId = "") {
  const currentWeek = getCurrentWeek(referenceDate);
  const currentDay = getCurrentJourneyDay(referenceDate);
  const phase = getStudyPlanPhase(currentWeek);
  const orderPreference = getStudyOrderPreference(userState);

  if (!phase.systems?.length) {
    const fallbackSection = sections.find((section) => section.id === fallbackSectionId) || sections[0];
    const rapidReview = getFaSectionBySystem("Rapid Review", sections);
    const chosenFaSection = currentWeek >= 25 ? rapidReview : getFaSectionForSectionId(fallbackSection.id, sections);

    return {
      currentWeek,
      currentDay,
      phase,
      orderPreference,
      system: chosenFaSection?.system || fallbackSection?.name || "",
      sectionId: normalizeSystemId(chosenFaSection?.system, sections) || fallbackSection?.id || "",
      faSection: chosenFaSection,
      dayWithinSystem: 1,
      checkpointDay: false
    };
  }

  const phaseStartDay = (phase.weeks[0] - 1) * 7 + 1;
  const dayInPhase = Math.max(1, currentDay - phaseStartDay + 1);
  let elapsed = 0;
  let currentSystem = phase.systems.at(-1);

  for (const systemEntry of phase.systems) {
    elapsed += Number(systemEntry.days || 0);
    if (dayInPhase <= elapsed) {
      currentSystem = systemEntry;
      break;
    }
  }

  const completedBeforeSystem =
    phase.systems
      .slice(0, phase.systems.findIndex((entry) => entry.system === currentSystem.system))
      .reduce((sum, entry) => sum + Number(entry.days || 0), 0);
  const dayWithinSystem = Math.max(1, dayInPhase - completedBeforeSystem);
  const normalizedSystem = normalizePlanSystemName(currentSystem.system);
  const faSection = getFaSectionBySystem(normalizedSystem, sections);

  return {
    currentWeek,
    currentDay,
    phase,
    orderPreference,
    system: normalizedSystem,
    sectionId: normalizeSystemId(normalizedSystem, sections),
    faSection,
    systemNote: currentSystem.note || "",
    dayWithinSystem,
    checkpointDay: dayWithinSystem % 4 === 0
  };
}

export function hasNbmePlateau(userState = {}, referenceDate = new Date()) {
  const scores = getNbmeAssessments(userState)
    .map((assessment) => ({
      ...assessment,
      weeksAgo: Number.isFinite(assessment.weeksAgo)
        ? assessment.weeksAgo
        : computeWeeksAgo(assessment.date, referenceDate)
    }))
    .filter((assessment) => assessment.weeksAgo <= 8)
    .sort((left, right) => left.date.localeCompare(right.date));

  if (scores.length < 2) {
    return false;
  }

  const last = scores.at(-1);
  const previous = scores.at(-2);
  return Math.abs(last.percentCorrect - previous.percentCorrect) <= 3;
}

function getMustListenEpisode(episodeNumber) {
  return divineInterventionMap.mustListenEpisodes.find((entry) => entry.episode === episodeNumber) || null;
}

export function getDivineRecommendation({ studyProgress, userState = {}, referenceDate = new Date() }) {
  const weeksUntilExam = userState.examDate ? Math.ceil(daysUntil(userState.examDate, referenceDate) / 7) : 99;

  if (weeksUntilExam <= 1) {
    const episode = getMustListenEpisode("Ep 400");
    return {
      episode: episode.episode,
      title: episode.title,
      system: studyProgress?.system || "Final Week",
      note: episode.note
    };
  }

  if (hasNbmePlateau(userState, referenceDate)) {
    const episode = getMustListenEpisode("Ep 469");
    return {
      episode: episode.episode,
      title: episode.title,
      system: "NBME plateau",
      note: episode.note
    };
  }

  const pool = divineInterventionMap.step1Episodes[studyProgress?.system] || [];

  if (!pool.length) {
    return null;
  }

  const chosenEpisodes = pool.slice(0, Math.min(2, pool.length));
  return {
    episode: chosenEpisodes.join(", "),
    title: `Divine Intervention for ${studyProgress.system}`,
    system: studyProgress.system,
    note: `Match passive review to ${studyProgress.system}.`
  };
}

function getNbmeAssessments(userState = {}) {
  if (Array.isArray(userState.nbmeScores) && userState.nbmeScores.length) {
    return userState.nbmeScores.map((score, index) => ({
      id: score.id || `nbme-score-${index + 1}`,
      date: dateOnly(score.date),
      percentCorrect: Number(score.percentCorrect ?? score.epc ?? 0),
      weeksAgo: Number(score.weeksAgo ?? 0)
    }));
  }

  return (userState.assessments || [])
    .filter((assessment) => {
      return assessment.kind === "NBME" || String(assessment.label || "").startsWith("NBME");
    })
    .map((assessment) => ({
      id: assessment.id,
      date: dateOnly(assessment.date),
      percentCorrect: Number(assessment.percentCorrect ?? assessment.epc ?? 0)
    }));
}

function getLatestNbmeAssessment(userState = {}) {
  return [...getNbmeAssessments(userState)]
    .sort((left, right) => left.date.localeCompare(right.date))
    .at(-1);
}

function buildRuleMetrics(userState = {}, currentWeek, referenceDate = new Date()) {
  const examDate = userState.examDate || "";
  const latestNbme = getLatestNbmeAssessment(userState);
  const weeksUntilExam = examDate ? Math.ceil(daysUntil(examDate, referenceDate) / 7) : 0;

  return {
    current_week: currentWeek,
    weeks_until_exam: weeksUntilExam,
    uworld_percent_complete: Math.round((getUWorldCompletedUnits(userState) / TOTAL_UWORLD) * 100),
    active_resources_count: Array.isArray(userState.activeResources)
      ? userState.activeResources.length
      : 0,
    days_since_last_nbme: latestNbme?.date ? daysBetween(latestNbme.date, dateOnly(referenceDate)) : 999,
    anki_new_cards_per_day: Math.max(0, Number(userState.ankiNewCardsPerDay || 0)),
    fa_pages_completed: Math.max(
      0,
      Number(userState.faPagesCompleted || getFirstAidCompletedUnits(userState) || 0)
    )
  };
}

export function evaluateCondition(condition, userState = {}, referenceDate = new Date(), currentWeek = getCurrentWeek(referenceDate)) {
  if (!condition) {
    return false;
  }

  const metrics = buildRuleMetrics(userState, currentWeek, referenceDate);
  const expression = condition
    .replace(/weeks_active\('([^']+)'\)/g, (_, resourceId) => String(getResourceWeeksActive(resourceId, currentWeek)))
    .replace(/\bAND\b/g, "&&")
    .replace(/\bOR\b/g, "||");

  try {
    return Boolean(
      Function(
        ...Object.keys(metrics),
        `return (${expression});`
      )(...Object.values(metrics))
    );
  } catch {
    return false;
  }
}

function normalizeGate(rule) {
  return {
    id: rule.id,
    blocks: rule.blocks || null,
    recommends: rule.recommends || null,
    message: rule.message || rule.warning || "",
    warning: rule.warning || "",
    tone: rule.warning ? "text-amber" : "text-coral"
  };
}

function resourceIsAvailable(resource, currentWeek) {
  const starts = resource.startWeek == null || resource.startWeek <= currentWeek;
  const ends = resource.endWeek == null || resource.endWeek >= currentWeek;
  return starts && ends;
}

function normalizeResource(resource, context = {}) {
  if (!resource) {
    return null;
  }

  const faSection =
    resource.id === "first-aid"
      ? context.studyProgress?.faSection || getFaSectionBySystem(context.studyProgress?.system)
      : null;
  const notes =
    resource.id === "first-aid" && faSection
      ? `${resource.notes} Current FA section: ${faSection.system} pp.${faSection.startPage}-${faSection.endPage}.`
      : resource.notes;

  return {
    ...resource,
    title: resource.name,
    notes
  };
}

export function getNextBestMove(userState = {}, currentWeek = getCurrentWeek(), referenceDate = new Date()) {
  const activeGates = resourceData.gatingRules
    .filter((rule) => evaluateCondition(rule.condition, userState, referenceDate, currentWeek))
    .map(normalizeGate);
  const completedResources = userState.completedResources || [];
  const blocksAnyNewResource = activeGates.some((gate) => gate.blocks === "any_new_resource");
  const blockedResources = new Set(
    activeGates.map((gate) => gate.blocks).filter(Boolean).filter((value) => value !== "any_new_resource")
  );
  const recommendedByGate = activeGates
    .map((gate) => gate.recommends)
    .filter(Boolean)
    .map((resourceId) => resourceData.resources.find((resource) => resource.id === resourceId))
    .filter(Boolean)
    .find((resource) => !completedResources.includes(resource.id));

  const candidates = resourceData.resources
    .filter((resource) => !completedResources.includes(resource.id))
    .filter((resource) => resourceIsAvailable(resource, currentWeek))
    .filter((resource) => !resource.prerequisite || completedResources.includes(resource.prerequisite))
    .filter((resource) => !blockedResources.has(resource.id))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return (left.startWeek ?? 99) - (right.startWeek ?? 99);
    });

  const recommendation =
    recommendedByGate ||
    (blocksAnyNewResource ? null : candidates[0] || null);
  const alternatives = recommendation
    ? candidates.filter((resource) => resource.id !== recommendation.id).slice(0, 2)
    : candidates.slice(0, 2);

  return {
    currentWeek,
    gates: activeGates,
    recommendation: normalizeResource(recommendation, userState),
    alternatives: alternatives.map((resource) => normalizeResource(resource, userState))
  };
}

function findScheduleTemplate(hoursAvailable) {
  return (
    scheduleData.templates.find(
      (template) =>
        hoursAvailable >= template.hoursAvailable[0] &&
        hoursAvailable <= template.hoursAvailable[1]
    ) ||
    scheduleData.templates.find((template) => hoursAvailable <= template.hoursAvailable[1]) ||
    scheduleData.templates.at(-1)
  );
}

function normalizeEnergyScale(energyLevel) {
  if (typeof energyLevel === "number") {
    return energyLevel;
  }

  if (energyLevel === ENERGY_LEVELS.LOW) {
    return 1;
  }

  if (energyLevel === ENERGY_LEVELS.HIGH) {
    return 5;
  }

  return 3;
}

function inferTaskKind(action) {
  const normalized = String(action || "").toLowerCase();

  if (normalized.includes("uworld") || normalized.includes("nbme") || normalized.includes("free 120")) {
    return "questions";
  }

  if (normalized.includes("anki")) {
    return "maintenance";
  }

  if (normalized.includes("review")) {
    return "review";
  }

  if (normalized.includes("video") || normalized.includes("pathoma") || normalized.includes("sketchy")) {
    return "content";
  }

  return "plan";
}

function personalizeTaskAction(action, { targetSystemName, phase, nextBestMove }) {
  let resolved = action;
  const systemName = targetSystemName || "your weak system";

  resolved = resolved.replace(/today's weak system/gi, systemName);
  resolved = resolved.replace(/weak system/gi, systemName);
  resolved = resolved.replace(/same system/gi, systemName);

  if (resolved.includes("UWorld") && phase?.uworldMode) {
    resolved = `${resolved} • ${phase.uworldMode}`;
  }

  if (
    nextBestMove?.recommendation &&
    /Video lecture|FA pass|FA review|Sketchy video/i.test(resolved)
  ) {
    resolved = `${resolved} • ${nextBestMove.recommendation.name}`;
  }

  return resolved;
}

function buildTemplateTask(task, index, context) {
  const title = personalizeTaskAction(task.action, context);
  const detailParts = [];

  if (context.phase?.emphasis) {
    detailParts.push(context.phase.emphasis);
  }

  if (context.nextBestMove?.recommendation && task.priority === 1) {
    detailParts.push(`Next best move: ${context.nextBestMove.recommendation.name}.`);
  }

  if (context.targetSystemName && /UWorld|FA|Video|Sketchy|NBME/i.test(title)) {
    detailParts.push(`Target: ${context.targetSystemName}.`);
  }

  return {
    id: `${context.template.id}-${index + 1}`,
    title,
    detail: detailParts.join(" "),
    minutes: task.minutes,
    priority: task.priority,
    kind: inferTaskKind(title)
  };
}

function resolveQuestionCount(template, phase) {
  if (template.id === "zero-day") {
    return 0;
  }

  if (template.id === "minimum-viable") {
    return 15;
  }

  if (template.id === "normal-day") {
    return 40;
  }

  if (template.id === "strong-day") {
    return phase.id === "intensive" ? 60 : 80;
  }

  return phase.id === "intensive" ? 80 : 100;
}

function buildFaTask(studyProgress, hoursAvailable) {
  const faSection = studyProgress?.faSection;

  if (!faSection) {
    return null;
  }

  const pageTarget = getDailyFaPageTarget(hoursAvailable);
  const pageOffset = Math.max(0, (Math.max(1, studyProgress.dayWithinSystem) - 1) * pageTarget);
  const startPage = Math.min(faSection.endPage, faSection.startPage + pageOffset);
  const endPage = Math.min(faSection.endPage, startPage + pageTarget - 1);

  return {
    id: "fa-pages",
    title: `Today's FA pages: ${startPage}-${endPage} (${faSection.system})`,
    detail: studyProgress.systemNote || `Anchor the day to ${faSection.system} before questions.`,
    minutes: Math.max(15, Math.round(pageTarget * 5)),
    priority: 1,
    kind: "content",
    meta: {
      startPage,
      endPage,
      system: faSection.system
    }
  };
}

function buildUWorldTask(studyProgress, phase, template) {
  const questionCount = resolveQuestionCount(template, phase);
  const systemName = studyProgress?.system || "Mixed review";
  const uworldTag = studyProgress?.faSection?.uworldTag || normalizeSystemKey(systemName);

  return {
    id: "uworld-system",
    title: `Today's UWorld: ${uworldTag} tag, ${phase.uworldMode} mode, ${questionCount} questions`,
    detail:
      questionCount > 0
        ? `Match the block to ${systemName}. Review every miss against the FA pages above.`
        : `No active block today. Protect momentum and come back with a clean restart tomorrow.`,
    minutes: questionCount > 0 ? Math.max(20, Math.round(questionCount * 2)) : 10,
    priority: 1,
    kind: "questions",
    meta: {
      questions: questionCount,
      system: systemName,
      uworldTag
    }
  };
}

function buildPassiveTask(divineRecommendation) {
  if (!divineRecommendation) {
    return null;
  }

  return {
    id: "divine-passive",
    title: `Passive option: Divine Intervention ${divineRecommendation.episode} (${divineRecommendation.system})`,
    detail: divineRecommendation.note || divineRecommendation.title,
    minutes: 15,
    priority: 2,
    kind: "passive"
  };
}

function buildCheckpointTask(studyProgress) {
  if (!studyProgress?.checkpointDay) {
    return null;
  }

  return {
    id: "system-checkpoint",
    title: `System checkpoint: ${studyProgress.system}`,
    detail: studyPlanTemplates.systemCheckpoints.checkpointTasks.join(" • "),
    minutes: 25,
    priority: 2,
    kind: "review"
  };
}

export function generateDailyPlan(hoursAvailable, energyLevel, currentWeek, context = {}) {
  const template = findScheduleTemplate(hoursAvailable);
  const phase = resolvePhaseForWeek(currentWeek);
  const energyScale = normalizeEnergyScale(energyLevel);
  const templateIndex = scheduleData.templates.findIndex((entry) => entry.id === template.id);
  const effectiveTemplate =
    energyScale <= 2 && template.id !== "zero-day"
      ? scheduleData.templates[Math.max(0, templateIndex - 1)]
      : template;
  const taskContext = {
    ...context,
    template: effectiveTemplate,
    phase
  };
  const studyProgress =
    context.studyProgress ||
    resolveStudyPlanProgress(
      context.referenceDate || new Date(),
      context.userState || {},
      context.sections || [],
      context.targetSectionId || ""
    );
  const divineRecommendation =
    context.divineRecommendation ||
    getDivineRecommendation({
      studyProgress,
      userState: context.userState || {},
      referenceDate: context.referenceDate || new Date()
    });
  const mappedTasks = [
    buildFaTask(studyProgress, hoursAvailable),
    buildUWorldTask(studyProgress, phase, effectiveTemplate),
    buildPassiveTask(divineRecommendation),
    buildCheckpointTask(studyProgress),
    ...effectiveTemplate.tasks.map((task, index) =>
      buildTemplateTask(task, index, {
        ...taskContext,
        studyProgress,
        divineRecommendation
      })
    )
  ].filter(Boolean);

  return {
    template: effectiveTemplate,
    phase,
    studyProgress,
    divineRecommendation,
    tasks: mappedTasks.filter((task) => task.priority <= 2),
    bonusTasks: mappedTasks.filter((task) => task.priority === 3),
    rules: effectiveTemplate.rules
  };
}

function computeWeeksAgo(dateKeyValue, referenceDate = new Date()) {
  if (!dateKeyValue) {
    return Infinity;
  }

  return daysBetween(dateKeyValue, dateOnly(referenceDate)) / 7;
}

export function checkExamReadiness(userState = {}, referenceDate = new Date()) {
  const uworldCompletedUnits = getUWorldCompletedUnits(userState);
  const uworldPercentComplete = Math.round((uworldCompletedUnits / TOTAL_UWORLD) * 100);
  const recentNBMEs = getNbmeAssessments(userState)
    .map((nbme) => ({
      ...nbme,
      weeksAgo: Number.isFinite(nbme.weeksAgo)
        ? nbme.weeksAgo
        : computeWeeksAgo(nbme.date, referenceDate)
    }))
    .filter((nbme) => nbme.weeksAgo <= 6)
    .sort((left, right) => left.date.localeCompare(right.date));

  if (recentNBMEs.length < 2) {
    return {
      status: "Insufficient Data",
      message: "Take at least 2 NBMEs before assessing readiness.",
      tone: READINESS_TONES["Insufficient Data"],
      reasons: ["Take at least 2 NBMEs before assessing readiness."]
    };
  }

  const avgScore =
    recentNBMEs.reduce((sum, nbme) => sum + nbme.percentCorrect, 0) / recentNBMEs.length;
  const allAbove60 = recentNBMEs.every((nbme) => nbme.percentCorrect >= 60);
  const anyAbove70 = recentNBMEs.some((nbme) => nbme.percentCorrect >= 70);
  let status = "Unsafe";
  let message =
    "Scores below 60%. Do not schedule the exam yet. Focus on weak systems identified by NBME analysis.";

  if (avgScore >= 70 && allAbove60) {
    status = "Ready";
    message = "Multiple NBMEs clustering 70%+. You are statistically very safe.";
  } else if (avgScore >= 65 && allAbove60) {
    status = "Probably Safe";
    message = "Consistent mid-60s+. Most IMGs with this pattern pass.";
  } else if (avgScore >= 60 || anyAbove70) {
    status = "Borderline";
    message = "Scores in low 60s. Consider 1-2 more weeks of targeted remediation.";
  }

  if (uworldCompletedUnits > 0 && uworldPercentComplete < 50) {
    status = "Unsafe";
    message =
      "UWorld completion is still under 50%. Build more question-bank reps before trusting the readiness signal.";
  }

  return {
    status,
    message,
    tone: READINESS_TONES[status],
    reasons: [
      `Recent NBME average: ${Math.round(avgScore)}%.`,
      `UWorld completion: ${uworldPercentComplete}%.`,
      allAbove60
        ? "Every recent NBME cleared 60%."
        : "At least one recent NBME is still under 60%.",
      message
    ]
  };
}

export function summarizeNbmeWeaknesses(nbmeAnalyses = [], sections = []) {
  const weaknessMap = new Map();

  (nbmeAnalyses || []).forEach((entry) => {
    const nbmeId = entry.nbmeId || entry.id || entry.date || crypto.randomUUID();

    (entry.analysis?.knowledgeGaps || []).forEach((gap) => {
      const sectionId = normalizeSystemId(gap.system, sections);
      if (!sectionId) {
        return;
      }

      if (!weaknessMap.has(sectionId)) {
        weaknessMap.set(sectionId, {
          sectionId,
          section: sections.find((section) => section.id === sectionId) || {
            id: sectionId,
            name: formatMetricName(sectionId)
          },
          totalCount: 0,
          nbmeIds: new Set(),
          lastSeen: "",
          occurrences: 0
        });
      }

      const target = weaknessMap.get(sectionId);
      target.totalCount += Number(gap.count || 0);
      target.nbmeIds.add(nbmeId);
      target.occurrences += 1;
      if (!target.lastSeen || String(entry.date || "") > target.lastSeen) {
        target.lastSeen = String(entry.date || "");
      }
    });
  });

  return [...weaknessMap.values()]
    .map((entry) => ({
      ...entry,
      criticalGap: entry.nbmeIds.size >= 2,
      nbmeHits: entry.nbmeIds.size
    }))
    .sort((left, right) => {
      if (left.criticalGap !== right.criticalGap) {
        return Number(right.criticalGap) - Number(left.criticalGap);
      }

      if (left.totalCount !== right.totalCount) {
        return right.totalCount - left.totalCount;
      }

      return right.nbmeHits - left.nbmeHits;
    });
}

function mostRecentAssessment(assessments, kind) {
  return [...assessments]
    .filter((assessment) => assessment.kind === kind)
    .sort((left, right) => left.date.localeCompare(right.date))
    .at(-1);
}

function recentQuestionEntries(logs, window = 14) {
  return Object.entries(logs)
    .filter(([, entry]) => Number(entry.questions || 0) > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-window);
}

function getRecentUwAverage(logs, window = 14) {
  const entries = recentQuestionEntries(logs, window);
  const totals = entries.reduce(
    (accumulator, [, entry]) => {
      accumulator.questions += Number(entry.questions || 0);
      accumulator.correct += Number(entry.correct || 0);
      return accumulator;
    },
    { questions: 0, correct: 0 }
  );

  return calculateAccuracy(totals.correct, totals.questions);
}

function getRecentHours(logs, window = 14) {
  return Object.entries(logs)
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-window)
    .map(([, entry]) => Number(entry.hours || 0));
}

function getAnkiConsistencyPct(logs, window = 14) {
  const keys = Array.from({ length: window }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return todayKey(date);
  });
  const activeDays = keys.filter((key) => Number(logs[key]?.anki || 0) > 0).length;
  return Math.round((activeDays / window) * 100);
}

function getFaCompletionPct(doneTopics, topics) {
  if (!topics.length) {
    return 0;
  }

  return Math.round((doneTopics.length / topics.length) * 100);
}

function getRuleBand(accuracy) {
  return RULE_BANDS.find((band) => accuracy < band.max) || RULE_BANDS.at(-1);
}

function inferEnergyFromLog(commandCenterState) {
  const morning = Number(commandCenterState?.energyLog?.morning || 3);

  if (morning >= 4) {
    return ENERGY_LEVELS.HIGH;
  }

  if (morning <= 2) {
    return ENERGY_LEVELS.LOW;
  }

  return ENERGY_LEVELS.MEDIUM;
}

function inferHoursFromProfile(commandCenterState, date) {
  const profileId = commandCenterState?.constraintProfileId || "working-parent-old-img";
  const defaults = {
    "working-parent-old-img": 4,
    "part-time-4-5": 4.5,
    "restart-after-failure": 3.5,
    "quiet-grind-2-4": 3
  };
  const base = defaults[profileId] || 4;
  return isEgyptWeekend(date) ? Math.min(base, 2) : base;
}

function parseBlockers(note = "") {
  const normalized = String(note || "").toLowerCase();

  return {
    family: normalized.includes("family"),
    work: normalized.includes("work")
  };
}

function capAvailableHours(requestedHours, energy, date, note = "") {
  const weekdayCap = 5;
  const weekendCap = 2;
  const weekend = isEgyptWeekend(date);
  const energyCap =
    energy === ENERGY_LEVELS.LOW ? 3 : energy === ENERGY_LEVELS.MEDIUM ? 4 : 5;
  const blockers = parseBlockers(note);
  const blockerCap = blockers.family ? 1.5 : blockers.work ? 2 : Infinity;
  return clamp(requestedHours, 0, Math.min(weekend ? weekendCap : weekdayCap, energyCap, blockerCap));
}

function hasStudyTouch(entry) {
  return (
    Number(entry?.questions || 0) > 0 ||
    Number(entry?.hours || 0) > 0 ||
    Number(entry?.anki || 0) > 0
  );
}

function countConsecutiveQuietDays(logs, today, window = 7) {
  let quietDays = 0;

  for (let offset = 1; offset <= window; offset += 1) {
    const cursor = new Date(`${today}T12:00:00`);
    cursor.setDate(cursor.getDate() - offset);
    const key = todayKey(cursor);

    if (hasStudyTouch(logs[key])) {
      break;
    }

    quietDays += 1;
  }

  return quietDays;
}

function buildRecoveryProfile({ inputs, cappedHours, logs, today, familyEvents, hasSignal }) {
  const blockerFlags = parseBlockers(inputs.note);
  const availableMinutes = Math.round(cappedHours * 60);
  const quietDays = hasSignal ? countConsecutiveQuietDays(logs, today) : 0;
  const hasCalendarPressure = familyEvents.length >= 2;
  const needsRestart = quietDays >= 3;

  if (availableMinutes === 0) {
    return {
      mode: "minimum",
      label: "Momentum minimum",
      targetMinutes: 10,
      quietDays,
      blockerFlags,
      needsRestart,
      hasCalendarPressure
    };
  }

  if (availableMinutes <= 30) {
    return {
      mode: "minimum",
      label: "Momentum minimum",
      targetMinutes: Math.max(10, availableMinutes),
      quietDays,
      blockerFlags,
      needsRestart,
      hasCalendarPressure
    };
  }

  if (needsRestart) {
    return {
      mode: "reentry",
      label: "Re-entry block",
      targetMinutes: Math.min(Math.max(availableMinutes, 45), 60),
      quietDays,
      blockerFlags,
      needsRestart,
      hasCalendarPressure
    };
  }

  if (
    blockerFlags.family ||
    blockerFlags.work ||
    hasCalendarPressure ||
    availableMinutes <= 60 ||
    (inputs.energy === ENERGY_LEVELS.LOW && availableMinutes <= 90)
  ) {
    return {
      mode: "salvage",
      label: "Salvage day",
      targetMinutes: Math.min(Math.max(availableMinutes, 30), 60),
      quietDays,
      blockerFlags,
      needsRestart,
      hasCalendarPressure
    };
  }

  return {
    mode: "full",
    label: "Full plan",
    targetMinutes: availableMinutes,
    quietDays,
    blockerFlags,
    needsRestart,
    hasCalendarPressure
  };
}

export function createDailyCoachInputs(commandCenterState, date = new Date()) {
  return {
    date: todayKey(date),
    energy: inferEnergyFromLog(commandCenterState),
    availableHours: inferHoursFromProfile(commandCenterState, date),
    note: ""
  };
}

export function resolveDailyCoachInputs(savedDailyStart, commandCenterState, date = new Date()) {
  const fallback = createDailyCoachInputs(commandCenterState, date);

  if (!savedDailyStart || savedDailyStart.date !== fallback.date) {
    return fallback;
  }

  return {
    ...fallback,
    ...savedDailyStart
  };
}

export function determinePhase(daysLeft, uwAvg) {
  if (daysLeft > 105) {
    return PHASES.foundation;
  }

  if (daysLeft > 60 && uwAvg >= 55) {
    return PHASES.integration;
  }

  if (daysLeft > 24 && uwAvg >= 60) {
    return PHASES.intensive;
  }

  if (daysLeft <= 24) {
    return PHASES.taper;
  }

  return PHASES.foundation;
}

function buildSectionTopicMap(topics) {
  return topics.reduce((accumulator, topic) => {
    if (!accumulator[topic.sectionId]) {
      accumulator[topic.sectionId] = [];
    }

    accumulator[topic.sectionId].push(topic);
    return accumulator;
  }, {});
}

function buildSystemData(state, sections, topics, today, phase, hasSignal) {
  const topicsBySection = buildSectionTopicMap(topics);
  const loggedDatesBySection = Object.entries(state.logs).reduce((accumulator, [date, entry]) => {
    const sectionId = entry.sectionId;
    if (!sectionId) {
      return accumulator;
    }

    if (!accumulator[sectionId] || accumulator[sectionId] < date) {
      accumulator[sectionId] = date;
    }

    return accumulator;
  }, {});

  return sections.map((section) => {
    const progress = state.systemProgress[section.id];
    const relatedTopics = topicsBySection[section.id] || [];
    const faSection = getFaSectionForSectionId(section.id, sections);
    const faPagesCompleted = calculateSectionFaPagesCompleted(state, section.id, topics, sections);
    const faProgressPct = faSection
      ? Math.round((faPagesCompleted / faSection.totalPages) * 100)
      : progress.faRead
        ? 100
        : relatedTopics.length
          ? Math.round(
              (relatedTopics.filter((topic) => state.doneTopics.includes(topic.title)).length /
                relatedTopics.length) *
                100
            )
          : 0;
    const accuracy = calculateAccuracy(progress.correct, progress.questionsDone);
    const fallbackAccuracy =
      progress.questionsDone > 0
        ? accuracy
        : progress.faRead
          ? 62
          : faProgressPct >= 50
            ? 58
            : section.kind === "principles"
              ? 50
              : 45;
    const lastStudied = progress.lastStudied || loggedDatesBySection[section.id] || "";
    const daysSince = lastStudied ? Math.max(0, daysBetween(lastStudied, today)) : hasSignal ? 99 : 0;
    const ruleBand = getRuleBand(fallbackAccuracy);
    const deliberateLoad = Number(
      (1 / Math.max(Math.pow(Math.max(fallbackAccuracy, 35) / 100, 2), 0.1225)).toFixed(2)
    );
    const principleBoost =
      phase.id === "foundation" && ["path", "immuno", "biochem", "micro", "pharm"].includes(section.id)
        ? 1.15
        : 1;
    const neglectPressure = daysSince >= 14 ? 35 : daysSince >= 7 ? 18 : 0;
    const priorityScore =
      (100 - fallbackAccuracy) * principleBoost + deliberateLoad * 10 + neglectPressure;

    return {
      section,
      accuracy: fallbackAccuracy,
      measuredAccuracy: accuracy,
      questionsDone: progress.questionsDone,
      faProgressPct,
      daysSince,
      lastStudied,
      deliberateLoad,
      ruleBand,
      isForced: daysSince >= 14,
      isWarning: daysSince >= 7 && daysSince < 14,
      priorityScore,
      pathomaDone: Boolean(progress.pathomaDone),
      sketchyDone: Boolean(progress.sketchyDone)
    };
  });
}

function selectSystems(
  systemData,
  lockedPrimarySectionId = "",
  weaknessSectionId = "",
  plannedSectionId = ""
) {
  const sorted = [...systemData].sort((left, right) => {
    if (left.isForced !== right.isForced) {
      return Number(right.isForced) - Number(left.isForced);
    }

    if (left.priorityScore === right.priorityScore) {
      return right.daysSince - left.daysSince;
    }

    return right.priorityScore - left.priorityScore;
  });

  const lockedPrimary =
    lockedPrimarySectionId &&
    sorted.find((systemEntry) => systemEntry.section.id === lockedPrimarySectionId);
  const weaknessPrimary =
    !lockedPrimary &&
    weaknessSectionId &&
    sorted.find((systemEntry) => systemEntry.section.id === weaknessSectionId);
  const plannedPrimary =
    !lockedPrimary &&
    !weaknessPrimary &&
    plannedSectionId &&
    sorted.find((systemEntry) => systemEntry.section.id === plannedSectionId);
  const primary = lockedPrimary || weaknessPrimary || plannedPrimary || sorted[0];
  const secondary =
    sorted.find((systemEntry) => systemEntry.section.id !== primary.section.id) || primary;
  const strongest = [...systemData].sort((left, right) => right.accuracy - left.accuracy)[0];

  return {
    primary,
    secondary,
    strongest,
    mode: primary.ruleBand.mode
  };
}

function checkNeglected(systemData) {
  return systemData.reduce(
    (accumulator, systemEntry) => {
      if (systemEntry.isForced) {
        accumulator.forced.push(systemEntry);
      } else if (systemEntry.isWarning) {
        accumulator.warnings.push(systemEntry);
      }

      return accumulator;
    },
    { warnings: [], forced: [] }
  );
}

function determineQuestionBlock(energy, phase, primary, cappedHours) {
  if (primary.ruleBand.mode === "content_review") {
    return energy === ENERGY_LEVELS.HIGH && cappedHours >= 4 ? 20 : 12;
  }

  if (primary.ruleBand.mode === "tutor") {
    if (energy === ENERGY_LEVELS.HIGH && cappedHours >= 4) {
      return 30;
    }

    return 20;
  }

  if (phase.id === "intensive" && energy === ENERGY_LEVELS.HIGH && cappedHours >= 4.5) {
    return 40;
  }

  return energy === ENERGY_LEVELS.HIGH ? 40 : 20;
}

function createTask(id, title, minutes, kind, detail, rationale) {
  return {
    id,
    title,
    minutes,
    kind,
    detail,
    rationale
  };
}

function hasMeaningfulStudySignal(state) {
  const hasLoggedWork = Object.values(state.logs || {}).some(
    (entry) => hasStudyTouch(entry)
  );

  return (
    hasLoggedWork ||
    Boolean(state.assessments?.length) ||
    Boolean(state.doneTopics?.length) ||
    Boolean(state.completedResources?.length)
  );
}

function trimTasks(tasks, availableMinutes, minimumTaskMinutes) {
  const trimmed = [];
  let remaining = availableMinutes;

  tasks.forEach((task) => {
    if (remaining < minimumTaskMinutes) {
      return;
    }

    const minutes = Math.min(task.minutes, remaining);
    if (minutes < minimumTaskMinutes) {
      return;
    }

    trimmed.push({
      ...task,
      minutes
    });
    remaining -= minutes;
  });

  return trimmed;
}

export function prescribeTasks({
  energy,
  phase,
  primary,
  secondary,
  strongest,
  availableHours,
  cappedHours,
  completedResources = [],
  recovery
}) {
  const tasks = [];
  const availableMinutes =
    recovery?.mode && recovery.mode !== "full"
      ? recovery.targetMinutes
      : Math.round(cappedHours * 60);
  const blockQuestions = determineQuestionBlock(energy, phase, primary, cappedHours);
  const interleaveMinutes = energy === ENERGY_LEVELS.LOW ? 20 : 30;
  const nextResource = getNextResource(primary.section.id, completedResources);

  if (recovery?.mode === "minimum") {
    return trimTasks(
      [
        createTask(
          "momentum-anki",
          "Momentum minimum: 5 Anki cards",
          5,
          "momentum",
          "Five honest retrieval reps.",
          "The job on near-zero days is to stay attached to the material, not to win the day."
        ),
        createTask(
          "momentum-fa",
          `Momentum minimum: 1 page in ${strongest.section.name}`,
          5,
          "momentum",
          `Read one page or one objective from ${strongest.section.name}.`,
          "Ten clean minutes prevents one bad day from becoming a week-long restart."
        )
      ],
      availableMinutes,
      5
    );
  }

  if (recovery?.mode === "reentry") {
    return trimTasks(
      [
        createTask(
          "restart-anki",
          "Re-entry: 10 Anki cards",
          10,
          "restart",
          "Ten cards only. No backlog heroics.",
          "After a gap, the goal is to re-establish contact with the material without flooding yourself."
        ),
        nextResource
          ? createTask(
              nextResource.id,
              `Re-entry resource: ${nextResource.title}`,
              Math.min(nextResource.durationMinutes, 25),
              nextResource.type,
              "Resume the next curriculum step without trying to catch up all at once.",
              "A controlled restart beats a guilt-fueled marathon every time."
            )
          : createTask(
              "restart-fa",
              `Re-entry review: ${primary.section.name}`,
              25,
              "review",
              `First Aid pages ${primary.section.start}-${primary.section.end}`,
              "Rebuild the frame first, then scale tomorrow."
            ),
        createTask(
          "restart-uworld",
          `UWorld 5-10 Qs: ${primary.section.name} tutor`,
          20,
          "questions",
          "Short tutor block. Stop while still composed.",
          "Re-entry days are about proving you are back, not proving toughness."
        )
      ],
      availableMinutes,
      10
    );
  }

  if (recovery?.mode === "salvage") {
    return trimTasks(
      [
        createTask(
          "salvage-anki",
          "Salvage touch: 10 Anki cards",
          10,
          "maintenance",
          "Small deck touch only.",
          "The streak stays alive when the workload shrinks to fit the real day."
        ),
        nextResource
          ? createTask(
              nextResource.id,
              `Salvage resource: ${nextResource.title}`,
              Math.min(nextResource.durationMinutes, 25),
              nextResource.type,
              "Keep the sequence moving with one controlled rep.",
              "One clean resource touch is enough for a constrained day."
            )
          : createTask(
              "salvage-review",
              `Salvage review: ${primary.section.name}`,
              25,
              "review",
              `First Aid pages ${primary.section.start}-${primary.section.end}`,
              "Use the smallest block that still counts as real study."
            ),
        createTask(
          "salvage-error-log",
          `Error log or one-page rescue: ${secondary.section.name}`,
          15,
          "light",
          "One page, one notebook section, or one explanation loop.",
          "This is a survival script, not a performance day."
        )
      ],
      availableMinutes,
      10
    );
  }

  if (energy === ENERGY_LEVELS.LOW) {
    tasks.push(
      createTask(
        "anki",
        "Anki maintenance",
        25,
        "maintenance",
        "100-150 cards max",
        "Low-energy days should protect retrieval without introducing heavy load."
      ),
      createTask(
        "fa-reread",
        `Light First Aid re-read: ${strongest.section.name}`,
        45,
        "review",
        `Pages ${strongest.section.start}-${strongest.section.end}`,
        "Use a strong system to keep momentum while avoiding overload."
      ),
      createTask(
        "interleave",
        `Sketchy or error notebook: ${secondary.section.name}`,
        30,
        "light",
        secondary.section.pathoma || secondary.section.name,
        "Spacing beats intensity when energy is low."
      )
    );
  } else if (primary.ruleBand.mode === "content_review") {
    if (nextResource) {
      tasks.push(
        createTask(
          nextResource.id,
          nextResource.title,
          nextResource.durationMinutes,
          nextResource.type,
          "Next step in the system curriculum.",
          "Finish this resource to build foundational knowledge before burning UWorld blocks."
        )
      );
      tasks.push(
        createTask(
          "uworld",
          `UWorld ${blockQuestions} Qs: ${primary.section.name} tutor`,
          energy === ENERGY_LEVELS.HIGH ? 75 : 60,
          "questions",
          "Review every explanation",
          "Use tutor mode to connect mechanism to the vignette while the foundation is still fragile."
        )
      );
    } else {
      tasks.push(
        createTask(
          "pathoma",
          `Pathoma focus: ${primary.section.name}`,
          energy === ENERGY_LEVELS.HIGH ? 50 : 40,
          "content",
          primary.section.pathoma || "Core chapter review",
          "Below 60% means rebuild the mechanism before pushing more question-bank reps."
        ),
        createTask(
          "fa",
          `First Aid pages: ${primary.section.name}`,
          55,
          "content",
          `Pages ${primary.section.start}-${primary.section.end}`,
          "Content review first. Then questions."
        ),
        createTask(
          "uworld",
          `UWorld ${blockQuestions} Qs: ${primary.section.name} tutor`,
          energy === ENERGY_LEVELS.HIGH ? 75 : 60,
          "questions",
          "Review every explanation",
          "Use tutor mode to connect mechanism to the vignette while the foundation is still fragile."
        )
      );
    }
    tasks.push(
      createTask(
        "anki",
        "Anki targeted misses",
        20,
        "maintenance",
        "Only cards linked to today's misses",
        "Immediate retrieval locks in the repaired concept."
      )
    );
  } else if (primary.ruleBand.mode === "tutor") {
    tasks.push(
      createTask(
        "uworld",
        `UWorld ${blockQuestions} Qs: ${primary.section.name} tutor`,
        energy === ENERGY_LEVELS.HIGH ? 85 : 75,
        "questions",
        `${primary.section.name} first, then mixed review`,
        "You are in the 60-70% band. Tutor mode is still the highest-yield learning format."
      ),
      createTask(
        "fa-review",
        `Deep review + First Aid annotations: ${primary.section.name}`,
        60,
        "review",
        "Educational objective plus wrong answers",
        "Deliberate practice means studying why you missed the question, not just that you missed it."
      ),
      createTask(
        "interleave",
        `Interleave review: ${secondary.section.name}`,
        interleaveMinutes,
        "interleave",
        "70/30 focus split",
        "Interleaving keeps old systems from going cold."
      ),
      createTask(
        "anki",
        "Anki maintenance",
        20,
        "maintenance",
        "Close the loop on today's misses",
        "Short retrieval beats passive rereading."
      )
    );
  } else {
    tasks.push(
      createTask(
        "uworld",
        `UWorld ${blockQuestions} Qs: ${primary.section.name} ${phase.id === "foundation" ? "mixed tutor" : "timed"}`,
        energy === ENERGY_LEVELS.HIGH ? 90 : 70,
        "questions",
        `${primary.section.name} with ${secondary.section.name} as the 30% interleave`,
        "The 85% rule says this is the sweet spot: hard enough to learn, stable enough to convert reps."
      ),
      createTask(
        "review",
        `Review block + error log`,
        70,
        "review",
        "Classify misses by cognitive failure point",
        "Deliberate practice improves the weakness, not the comfort zone."
      ),
      createTask(
        "fa",
        `First Aid or Pathoma rescue set: ${secondary.section.name}`,
        35,
        "interleave",
        secondary.section.pathoma || `Pages ${secondary.section.start}-${secondary.section.end}`,
        "Spacing and interleaving keep neglected systems alive."
      ),
      createTask(
        "anki",
        "Anki maintenance",
        20,
        "maintenance",
        "Keep the deck from becoming its own problem",
        "Maintenance only. Do not let Anki consume prime hours."
      )
    );
  }

  return trimTasks(tasks, availableMinutes, 20);
}

export function predictPass(data) {
  if (!data.hasSignal) {
    return {
      probability: null,
      level: "insufficient_data",
      color: "text-mist"
    };
  }

  const uwNorm = data.recentUwAvg / 100;
  const nbmeNorm = data.latestNbmePct / 100;
  const faNorm = data.faCompletionPct / 100;
  const ankiNorm = data.ankiConsistencyPct / 100;
  const streakNorm = Math.min(data.streak / 30, 1);

  const probability =
    0.35 * uwNorm +
    0.35 * nbmeNorm +
    0.15 * faNorm +
    0.1 * ankiNorm +
    0.05 * streakNorm;

  return {
    probability: Math.round(probability * 100),
    level:
      probability < 0.4
        ? "not_ready"
        : probability < 0.6
          ? "getting_there"
          : probability < 0.8
            ? "on_track"
            : "strong",
    color:
      probability < 0.4
        ? "text-coral"
        : probability < 0.6
          ? "text-amber"
          : probability < 0.8
            ? "text-teal"
            : "text-mint"
  };
}

function buildWarnings({
  recentHours,
  logs,
  today,
  neglect,
  primary,
  availableHours,
  cappedHours,
  familyEvents,
  hasSignal,
  recovery
}) {
  const warnings = [];

  if (!hasSignal) {
    if (recovery.mode === "minimum") {
      warnings.push({
        tone: "text-teal",
        text: "This is a momentum-minimum day. Ten honest minutes is enough to keep the streak identity alive."
      });
    }

    if (familyEvents.length) {
      warnings.push({
        tone: "text-mist",
        text: `${familyEvents.length} family block${familyEvents.length > 1 ? "s" : ""} on the calendar today. Start small and protect the streak.`
      });
    }

    if (availableHours > cappedHours) {
      warnings.push({
        tone: "text-mist",
        text: `Requested ${availableHours} hours. Coach capped it at ${cappedHours} so the first week stays realistic.`
      });
    }

    return warnings;
  }

  if (recovery.quietDays >= 3) {
    warnings.push({
      tone: "text-amber",
      text: `${recovery.quietDays} quiet days in a row. Today is a re-entry day, not a catch-up day.`
    });
  } else if (recovery.mode === "minimum") {
    warnings.push({
      tone: "text-teal",
      text: "Momentum minimum active. The goal is a live connection to the material, not volume."
    });
  } else if (recovery.mode === "salvage") {
    warnings.push({
      tone: "text-mist",
      text: "Constraint pressure is high today. The plan was cut to a salvage script on purpose."
    });
  }

  const lastThree = recentHours.slice(-3);
  const overreaching = lastThree.length === 3 && lastThree.every((hours) => hours > 5);

  if (overreaching) {
    warnings.push({
      tone: "text-amber",
      text: "Three straight 5+ hour days logged. Recovery is now a performance tool, not a luxury."
    });
  }

  const yesterday = new Date(`${today}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBefore = new Date(`${today}T12:00:00`);
  dayBefore.setDate(dayBefore.getDate() - 2);
  const zeroStudyTwoDays =
    !Number(logs[todayKey(yesterday)]?.hours || 0) &&
    !Number(logs[todayKey(dayBefore)]?.hours || 0) &&
    !Number(logs[todayKey(yesterday)]?.questions || 0) &&
    !Number(logs[todayKey(dayBefore)]?.questions || 0);

  if (zeroStudyTwoDays) {
    warnings.push({
      tone: "text-coral",
      text: "You did 0 questions for two days. That's fine. But 2 zeros = momentum fading. Thirty honest minutes today restarts the engine. No panic."
    });
  }

  if (neglect.forced.length) {
    warnings.push({
      tone: "text-amber",
      text: `${neglect.forced[0].section.name} has gone ${neglect.forced[0].daysSince} days untouched. Interleaving is no longer optional.`
    });
  } else if (neglect.warnings.length) {
    warnings.push({
      tone: "text-mist",
      text: `${neglect.warnings[0].section.name} is drifting cold at ${neglect.warnings[0].daysSince} days since last touch.`
    });
  }

  if (availableHours > cappedHours) {
    warnings.push({
      tone: "text-mist",
      text: `Requested ${availableHours} hours. Coach capped it at ${cappedHours} so the plan stays sustainable.`
    });
  }

  if (familyEvents.length) {
    warnings.push({
      tone: "text-mist",
      text: `${familyEvents.length} family block${familyEvents.length > 1 ? "s" : ""} on the calendar today. The plan is built around reality, not fantasy.`
    });
  }

  if (primary.accuracy < 50) {
    warnings.push({
      tone: "text-coral",
      text: `${primary.section.name} is below 50%. Stop pretending this is a testing problem. It is still a content problem.`
    });
  }

  return warnings.slice(0, 4);
}

function buildWeeklyReview(state, today, systemData, dailyTarget) {
  const isSunday = new Date(`${today}T12:00:00`).getDay() === 0;
  const weekKeys = Array.from({ length: 7 }).map((_, index) => {
    const cursor = new Date(`${today}T12:00:00`);
    cursor.setDate(cursor.getDate() - index);
    return todayKey(cursor);
  });
  const entries = weekKeys.map((key) => state.logs[key] || {});
  const questionsCompleted = entries.reduce((sum, entry) => sum + Number(entry.questions || 0), 0);
  const hoursStudied = Number(
    entries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0).toFixed(1)
  );
  const questionTarget = dailyTarget * 7;
  const completionRate = questionTarget
    ? Math.round((questionsCompleted / questionTarget) * 100)
    : 0;
  const systemsCovered = systemData
    .filter((systemEntry) => systemEntry.lastStudied && daysBetween(systemEntry.lastStudied, today) <= 6)
    .map((systemEntry) => systemEntry.section.name);
  const verdict =
    completionRate >= 80
      ? "Strong week. You hit enough of the plan to keep compounding."
      : "Below target. Adjust the plan size, not the self-talk.";

  return {
    isSunday,
    questionsCompleted,
    questionTarget,
    completionRate,
    hoursStudied,
    systemsCovered,
    verdict
  };
}

function buildCoachMessage({ energy, primary, phase, neglect, forecast, recovery }) {
  if (forecast.level === "insufficient_data") {
    if (recovery.mode === "minimum") {
      return "Fresh start with almost no time. Do the 10-minute momentum minimum and bank the restart.";
    }

    return `Fresh start. We do not have enough signal yet, so the goal today is simple: log one honest study touch and let the coach calibrate from real data.`;
  }

  if (recovery.quietDays >= 3) {
    if (recovery.mode === "minimum") {
      return `Three quiet days in a row. Do not chase a comeback session. Hit the momentum minimum and come back tomorrow.`;
    }

    return `Three quiet days in a row. Today is a re-entry day for ${primary.section.name}, not a punishment workout.`;
  }

  if (recovery.mode === "minimum") {
    return `You do not need a productive day. You need a live connection to the material. Hit the momentum minimum and get out clean.`;
  }

  if (recovery.mode === "salvage") {
    return `Constrained day. We are running the salvage script for ${primary.section.name} so the day still counts without breaking you.`;
  }

  if (energy === ENERGY_LEVELS.LOW) {
    return `Low energy day. Protect the streak. ${primary.section.name} still matters, but today is about staying in motion, not forcing heroics.`;
  }

  if (energy === ENERGY_LEVELS.HIGH) {
    return `High energy. Attack ${primary.section.name}. You are at ${primary.accuracy}%. Target learning zone is 70-85%.`;
  }

  if (neglect.forced.length) {
    return `${primary.section.name} has gone cold for ${primary.daysSince} days. Bring it back now before you lose easy future points.`;
  }

  return `Solid day. Stay in ${phase.label.toLowerCase()} mode and push ${primary.section.name} from ${primary.accuracy}% metric.`;
}

function pickMotivationAnchor(commandCenterState, forecast, energy) {
  if (forecast.level === "insufficient_data") {
    return MOTIVATION_ANCHORS[4];
  }

  if (forecast.level === "not_ready") {
    return MOTIVATION_ANCHORS[3]; // Staying calm
  }

  if (energy === ENERGY_LEVELS.HIGH) {
    return MOTIVATION_ANCHORS[4]; // Start small move fast
  }

  if (energy === ENERGY_LEVELS.LOW) {
    return MOTIVATION_ANCHORS[0]; // Mother of a 5yr old
  }

  // Randomize the others
  const options = [1, 2, 5, 6];
  return MOTIVATION_ANCHORS[options[Math.floor(Math.random() * options.length)]];
}

function buildReasoning({ phase, primary, secondary, neglect, forecast, daysLeft, recovery }) {
  if (forecast.level === "insufficient_data") {
    if (recovery.mode === "minimum") {
      return [
        "This is a low-friction restart day.",
        "Ten honest minutes is enough to avoid turning one skipped day into a restart spiral.",
        `${phase.label} phase with ${daysLeft} days left. Start embarrassingly small if you need to.`
      ];
    }

    return [
      "This looks like a fresh start or a reset after time away.",
      `The coach will calibrate once you log a block, a review session, or an assessment.`,
      `${phase.label} phase with ${daysLeft} days left. Keep the first step small enough to repeat tomorrow.`
    ];
  }

  if (recovery.quietDays >= 3) {
    return [
      `${recovery.quietDays} quiet days were detected before today.`,
      "Re-entry plans are intentionally short. You rebuild rhythm first, then volume.",
      `${primary.section.name} stays primary, but the session is capped so guilt does not set the pace.`
    ];
  }

  if (recovery.mode === "minimum") {
    return [
      "Available time is effectively zero or near-zero.",
      "The coach switched to momentum-minimum mode so the streak identity survives the day.",
      `Tomorrow matters more than squeezing an unrealistic block out of ${daysLeft} days left.`
    ];
  }

  if (recovery.mode === "salvage") {
    return [
      "Calendar or blocker pressure is high, so the plan was cut to salvage size.",
      `${primary.section.name} stays in front because it is still the weakest active lever.`,
      "A small real session compounds better than a fantasy plan that never starts."
    ];
  }

  const reasons = [
    `${primary.section.name} is the weakest active target at ${primary.accuracy}% with a deliberate-practice load of ${primary.deliberateLoad}x.`,
    `${phase.label} phase with ${daysLeft} days left. Target tempo is ${phase.targetQuestions} questions/day in ${phase.modeLabel.toLowerCase()}.`,
    `85% rule band: ${primary.ruleBand.label}. ${primary.ruleBand.coachAction}`
  ];

  if (primary.daysSince < 99) {
    reasons.push(`${primary.section.name} was last touched ${primary.daysSince} days ago.`);
  }

  if (neglect.forced.length || neglect.warnings.length) {
    const neglected = neglect.forced[0] || neglect.warnings[0];
    reasons.push(`${secondary.section.name} remains the interleave target so old material does not go cold.`);
    reasons.push(`Neglect threshold triggered for ${neglected.section.name} at ${neglected.daysSince} days.`);
  }

  if (forecast.level === "not_ready") {
    reasons.push("Pass probability is still low. Content quality matters more than volume right now.");
  }

  return reasons.slice(0, 5);
}

export function generateCoachingPlan({
  warRoomState,
  commandCenterState,
  sections,
  topics,
  date = new Date(),
  forceRegenerate = false
}) {
  const today = todayKey(date);
  const savedSnapshot = warRoomState.dailyPlan?.snapshot;
  const lockedSnapshot =
    !forceRegenerate &&
    warRoomState.dailyPlan?.date === today &&
    savedSnapshot &&
    savedSnapshot.nextBestMove &&
    savedSnapshot.examReadiness;

  if (lockedSnapshot) {
    return lockedSnapshot;
  }

  const inputs = resolveDailyCoachInputs(warRoomState.dailyStart, commandCenterState, date);
  const cappedHours = capAvailableHours(
    Number(inputs.availableHours || 0),
    inputs.energy,
    date,
    inputs.note
  );
  const hasSignal = hasMeaningfulStudySignal(warRoomState);
  const daysLeft = Math.max(
    0,
    Math.floor((new Date(`${warRoomState.examDate}T09:00:00`) - date) / 86400000)
  );
  const currentWeek = getCurrentWeek(date);
  const recentUwAvg = getRecentUwAverage(warRoomState.logs);
  const latestNbme = mostRecentAssessment(warRoomState.assessments, "NBME");
  const latestFree120 = mostRecentAssessment(warRoomState.assessments, "Free120");
  const phase = resolvePhaseForWeek(currentWeek);
  const lockedPrimarySectionId =
    warRoomState.dailyPlan?.date === today ? warRoomState.dailyPlan.primarySectionId : "";
  const familyEvents = eventsForDate(commandCenterState?.events || [], today).filter(
    (eventItem) => eventItem.category === "Family"
  );
  const systemData = buildSystemData(
    warRoomState,
    sections,
    topics,
    today,
    phase,
    hasSignal
  );
  const weaknessSummary = summarizeNbmeWeaknesses(warRoomState.nbmeAnalyses || [], sections);
  const studyProgress = resolveStudyPlanProgress(
    date,
    warRoomState,
    sections,
    weaknessSummary[0]?.sectionId || ""
  );
  const selection = selectSystems(
    systemData,
    lockedPrimarySectionId,
    weaknessSummary[0]?.sectionId || "",
    studyProgress.sectionId || ""
  );
  const neglect = checkNeglected(systemData);
  const faPagesCompleted = calculateFaPagesCompleted(warRoomState, topics, sections);
  const faCompletionPct = getFaCompletionPctByPages(warRoomState, topics, sections);
  const ankiConsistencyPct = getAnkiConsistencyPct(warRoomState.logs);
  const forecast = predictPass({
    hasSignal,
    recentUwAvg,
    latestNbmePct: latestNbme?.epc || latestFree120?.epc || 0,
    faCompletionPct,
    ankiConsistencyPct,
    streak: warRoomState.streak
  });
  const recovery = buildRecoveryProfile({
    inputs,
    cappedHours,
    logs: warRoomState.logs,
      today,
      familyEvents,
      hasSignal
  });
  const nextBestMove = getNextBestMove(
    {
      ...warRoomState,
      faPagesCompleted,
      studyProgress
    },
    currentWeek,
    date
  );
  const templatePlan = generateDailyPlan(
    Number(inputs.availableHours || 0),
    inputs.energy,
    currentWeek,
    {
      userState: {
        ...warRoomState,
        faPagesCompleted
      },
      referenceDate: date,
      sections,
      studyProgress,
      targetSectionId: studyProgress.sectionId || selection.primary.section.id,
      targetSystemName: weaknessSummary[0]?.section?.name || selection.primary.section.name,
      nextBestMove
    }
  );
  const examReadiness = checkExamReadiness(warRoomState, date);
  const warnings = [
    ...nextBestMove.gates
      .filter((gate) => gate.message)
      .map((gate) => ({
        tone: gate.tone,
        text: gate.message
      })),
    ...buildWarnings({
      recentHours: getRecentHours(warRoomState.logs),
      logs: warRoomState.logs,
      today,
      neglect,
      primary: selection.primary,
      availableHours: Number(inputs.availableHours || 0),
      cappedHours,
      familyEvents,
      hasSignal,
      recovery
    })
  ].slice(0, 5);
  const tasks = templatePlan.tasks;
  const weeklyReview = buildWeeklyReview(
    warRoomState,
    today,
    systemData,
    warRoomState.dailyTarget || phase.targetQuestions
  );
  const coachMessage = buildCoachMessage({
    energy: inputs.energy,
    primary: selection.primary,
    phase,
    neglect,
    forecast,
    recovery
  });
  const reasoning = buildReasoning({
    phase,
    primary: selection.primary,
    secondary: selection.secondary,
    neglect,
    forecast,
    daysLeft,
    recovery
  });
  const motivation = pickMotivationAnchor(commandCenterState, forecast, inputs.energy);

  return {
    today,
    currentWeek,
    inputs: {
      ...inputs,
      cappedHours
    },
    phase,
    daysLeft,
    focus: selection,
    neglect,
    tasks,
    bonusTasks: templatePlan.bonusTasks,
    rules: templatePlan.rules,
    nextThirty: tasks[0] || null,
    nextBestMove,
    examReadiness,
    priorityWeaknesses: weaknessSummary.slice(0, 3),
    criticalGaps: weaknessSummary.filter((entry) => entry.criticalGap),
    dailyTemplate: templatePlan.template,
    studyProgress: templatePlan.studyProgress,
    divineRecommendation: templatePlan.divineRecommendation,
    forecast,
    metrics: {
      currentWeek,
      recentUwAvg,
      latestNbmePct: latestNbme?.epc || 0,
      latestFree120Pct: latestFree120?.epc || 0,
      faPagesCompleted,
      faCompletionPct,
      ankiConsistencyPct,
      streak: warRoomState.streak,
      dailyQuestionTarget: phase.targetQuestions,
      measuredStudyHours: average(getRecentHours(warRoomState.logs)).toFixed(1),
      hasSignal
    },
    coachMessage,
    reasoning,
    warnings,
    weeklyReview,
    recovery,
    motivationAnchor: motivation,
    message: coachMessage,
    motivation
  };
}
