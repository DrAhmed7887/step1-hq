import { todayKey } from "./warRoom.js";

export const COMMAND_CENTER_STORAGE_KEY = "cmd-center-v1";
export const TRACK_DEFINITIONS = [
  { id: "USMLE", label: "USMLE", shortLabel: "Step 1" },
  { id: "AI", label: "AI Studies", shortLabel: "AI" },
  { id: "MASTERS", label: "Masters", shortLabel: "Masters" },
  { id: "LIFE_OPS", label: "Life Ops", shortLabel: "Life Ops" }
];
export const TRACK_IDS = TRACK_DEFINITIONS.map((track) => track.id);

const TRACK_INDEX = Object.fromEntries(TRACK_IDS.map((id, index) => [id, index]));
const LEGACY_VALUE_TRACKS = {
  USMLE: ["USMLE"],
  STUDY: ["USMLE"],
  AI: ["AI"],
  AI_STUDY: ["AI"],
  MASTERS: ["MASTERS"],
  MASTERS_SCHOLARSHIPS: ["MASTERS"],
  APPLICATIONS: ["MASTERS"],
  SCHOLARSHIPS: ["MASTERS"],
  LIFE_OPS: ["LIFE_OPS"],
  CHORES_ADMIN: ["LIFE_OPS"],
  ADMIN: ["LIFE_OPS"],
  FAMILY: ["LIFE_OPS"],
  SPAIN: ["LIFE_OPS", "MASTERS"],
  CLINIC: ["LIFE_OPS"],
  WORK: ["LIFE_OPS"]
};

function sortTrackIds(trackIds) {
  return [...trackIds].sort((left, right) => TRACK_INDEX[left] - TRACK_INDEX[right]);
}

function canonicalizeTrackId(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return TRACK_IDS.includes(normalized) ? normalized : null;
}

function legacyTracksForValue(value) {
  if (typeof value !== "string") {
    return [];
  }

  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return LEGACY_VALUE_TRACKS[normalized] || [];
}

function inferTracksFromTitle(title) {
  if (typeof title !== "string") {
    return [];
  }

  const normalized = title.toLowerCase();
  const matches = [];

  if (normalized.includes("usmle") || normalized.includes("step 1") || normalized.includes("uworld")) {
    matches.push("USMLE");
  }
  if (normalized.includes("ai") || normalized.includes("healthcare") || normalized.includes("portfolio")) {
    matches.push("AI");
  }
  if (normalized.includes("master") || normalized.includes("scholar") || normalized.includes("application")) {
    matches.push("MASTERS");
  }
  if (
    normalized.includes("spain") ||
    normalized.includes("visa") ||
    normalized.includes("family") ||
    normalized.includes("life ops")
  ) {
    matches.push("LIFE_OPS");
  }

  return matches;
}

function collectTrackIds(candidate) {
  if (Array.isArray(candidate)) {
    return candidate.flatMap((entry) => collectTrackIds(entry));
  }

  if (candidate && typeof candidate === "object") {
    return [
      ...collectTrackIds(candidate.linkedTrackIds),
      ...collectTrackIds(candidate.trackIds),
      ...collectTrackIds(candidate.primaryTrackId),
      ...legacyTracksForValue(candidate.domain),
      ...legacyTracksForValue(candidate.category),
      ...inferTracksFromTitle(candidate.title)
    ];
  }

  const canonical = canonicalizeTrackId(candidate);
  if (canonical) {
    return [canonical];
  }

  return [...legacyTracksForValue(candidate), ...inferTracksFromTitle(candidate)];
}

export function normalizeTrackIds(...candidates) {
  const trackIds = Array.from(new Set(candidates.flatMap((candidate) => collectTrackIds(candidate))));
  return sortTrackIds(trackIds.length ? trackIds : ["LIFE_OPS"]);
}

export function getTrackDefinition(trackId) {
  return TRACK_DEFINITIONS.find((track) => track.id === trackId) || TRACK_DEFINITIONS[3];
}

function normalizeDependencyIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((entry) => typeof entry === "string" && entry.trim())
        .map((entry) => entry.trim())
    )
  );
}

function normalizeId(value, fallback) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeTimestamp(value) {
  return typeof value === "string" ? value : "";
}

function normalizeCheckInEntry(entry, fallbackDate = todayKey()) {
  const hours = Number(entry?.hours);
  const momentum = Number(entry?.momentum);

  return {
    date: typeof entry?.date === "string" && entry.date ? entry.date : fallbackDate,
    energy: ["low", "medium", "high"].includes(entry?.energy) ? entry.energy : "medium",
    hours: Number.isFinite(hours) ? hours : 0,
    sessionType: ["minimum", "normal", "great"].includes(entry?.sessionType)
      ? entry.sessionType
      : "normal",
    quoteCategory: ["exhausted", "normal", "attack"].includes(entry?.quoteCategory)
      ? entry.quoteCategory
      : "normal",
    quoteKey: typeof entry?.quoteKey === "string" ? entry.quoteKey : "",
    momentum: Number.isFinite(momentum) ? Math.min(Math.max(momentum, 0), 1) : 0,
    createdAt: normalizeTimestamp(entry?.createdAt),
    updatedAt: normalizeTimestamp(entry?.updatedAt)
  };
}

function normalizeCheckIns(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((accumulator, [date, entry]) => {
    accumulator[date] = normalizeCheckInEntry(entry, date);
    return accumulator;
  }, {});
}

function normalizeReflectionEntry(entry, fallbackDate = todayKey()) {
  const momentum = Number(entry?.momentum);

  return {
    date: typeof entry?.date === "string" && entry.date ? entry.date : fallbackDate,
    reflection: typeof entry?.reflection === "string" ? entry.reflection.slice(0, 280) : "",
    momentum: Number.isFinite(momentum) ? Math.min(Math.max(momentum, 0), 1) : 0
  };
}

function normalizeReflections(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => normalizeReflectionEntry(entry, todayKey(new Date(Date.now() - index * 86400000))))
    .filter((entry) => entry.reflection.trim())
    .sort((left, right) => right.date.localeCompare(left.date));
}

function normalizeMilestoneFlags(value) {
  const flags = value && typeof value === "object" ? value : {};

  return {
    pythonCourseFinished: Boolean(flags.pythonCourseFinished),
    nlvVisaSubmitted: Boolean(flags.nlvVisaSubmitted),
    scholarshipApplied: Boolean(flags.scholarshipApplied),
    rwthEnrollmentConfirmed: Boolean(flags.rwthEnrollmentConfirmed),
    arrivalInGermany: Boolean(flags.arrivalInGermany)
  };
}

function normalizeMilestonesCompleted(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.filter((entry) => typeof entry === "string" && entry.trim()))
  );
}

function normalizeTodo(todo, index) {
  const linkedTrackIds = normalizeTrackIds(todo?.linkedTrackIds, todo, ["LIFE_OPS"]);

  return {
    id: normalizeId(todo?.id, `todo-${index + 1}`),
    title: typeof todo?.title === "string" && todo.title.trim() ? todo.title : "Untitled task",
    category: typeof todo?.category === "string" && todo.category.trim() ? todo.category : "Admin",
    priority: ["high", "medium", "low"].includes(todo?.priority) ? todo.priority : "medium",
    urgency: Number.isFinite(Number(todo?.urgency)) ? Number(todo.urgency) : 3,
    status: todo?.status === "done" ? "done" : "open",
    dueDate: typeof todo?.dueDate === "string" ? todo.dueDate : "",
    energyRequirement: ["low", "medium", "high"].includes(todo?.energyRequirement)
      ? todo.energyRequirement
      : "medium",
    requiresDeepWork: Boolean(todo?.requiresDeepWork),
    completedAt: normalizeTimestamp(todo?.completedAt),
    linkedTrackIds,
    dependencyIds: normalizeDependencyIds(todo?.dependencyIds)
  };
}

function normalizeProject(project, index) {
  return {
    id: normalizeId(project?.id, `project-${index + 1}`),
    title: typeof project?.title === "string" && project.title.trim() ? project.title : "Untitled project",
    status: ["active", "stalled", "done"].includes(project?.status) ? project.status : "active",
    milestones: Array.isArray(project?.milestones) ? project.milestones : [],
    outcomes: typeof project?.outcomes === "string" ? project.outcomes : "",
    linkedTrackIds: normalizeTrackIds(project?.linkedTrackIds, project, ["AI"]),
    dependencyIds: normalizeDependencyIds(project?.dependencyIds)
  };
}

function normalizePipelineItem(item, index) {
  return {
    id: normalizeId(item?.id, `pipeline-${index + 1}`),
    title: typeof item?.title === "string" && item.title.trim() ? item.title : "Untitled pipeline item",
    repoLink: typeof item?.repoLink === "string" ? item.repoLink : "",
    status: typeof item?.status === "string" && item.status.trim() ? item.status : "draft",
    docStatus: Boolean(item?.docStatus),
    demoStatus: Boolean(item?.demoStatus),
    screenshotStatus: Boolean(item?.screenshotStatus),
    linkedTrackIds: normalizeTrackIds(item?.linkedTrackIds, item, ["AI", "MASTERS"]),
    dependencyIds: normalizeDependencyIds(item?.dependencyIds)
  };
}

function inferGoalFallbackTracks(goal) {
  if (goal?.title === "Masters & Scholarships") {
    return ["MASTERS", "AI"];
  }

  if (goal?.title === "Spain NLV dossier") {
    return ["LIFE_OPS", "MASTERS"];
  }

  return normalizeTrackIds(goal, ["LIFE_OPS"]);
}

function normalizeGoal(goal, index) {
  return {
    id: normalizeId(goal?.id, `goal-${index + 1}`),
    title: typeof goal?.title === "string" && goal.title.trim() ? goal.title : "Untitled goal",
    current: Number.isFinite(Number(goal?.current)) ? Number(goal.current) : 0,
    target: Number.isFinite(Number(goal?.target)) && Number(goal.target) > 0 ? Number(goal.target) : 1,
    unit: typeof goal?.unit === "string" ? goal.unit : "",
    deadline: typeof goal?.deadline === "string" ? goal.deadline : "",
    linkedTrackIds: normalizeTrackIds(goal?.linkedTrackIds, goal, inferGoalFallbackTracks(goal)),
    dependencyIds: normalizeDependencyIds(goal?.dependencyIds)
  };
}

function normalizeEvent(event, index) {
  return {
    id: normalizeId(event?.id, `event-${index + 1}`),
    title: typeof event?.title === "string" && event.title.trim() ? event.title : "Untitled event",
    category: typeof event?.category === "string" && event.category.trim() ? event.category : "Admin",
    date: typeof event?.date === "string" ? event.date : "",
    start: typeof event?.start === "string" ? event.start : "",
    end: typeof event?.end === "string" ? event.end : "",
    recurringDays: Array.isArray(event?.recurringDays) ? event.recurringDays : [],
    notes: typeof event?.notes === "string" ? event.notes : "",
    linkedTrackIds: normalizeTrackIds(
      event?.linkedTrackIds,
      event,
      event?.category === "Study" ? ["USMLE"] : ["LIFE_OPS"]
    )
  };
}

export function createCommandCenterState() {
  const today = todayKey();
  return {
    familyFirstMode: true,
    constraintProfileId: "working-parent-old-img",
    inbox: [], // Rapid capture items
    projects: [], // Project decomposition
    publishingPipeline: [], // AI Systems publishing
    todos: [
      {
        id: "todo-free-120-prometric",
        title: "Book Free 120 Prometric simulation",
        category: "Study",
        priority: "high",
        urgency: 4,
        status: "open",
        dueDate: today,
        energyRequirement: "high",
        requiresDeepWork: true,
        linkedTrackIds: ["USMLE"],
        dependencyIds: []
      },
      {
        id: "todo-spain-homologacion",
        title: "Collect homologacion documents",
        category: "Spain",
        priority: "medium",
        urgency: 2,
        status: "open",
        dueDate: "",
        energyRequirement: "low",
        requiresDeepWork: false,
        linkedTrackIds: ["LIFE_OPS", "MASTERS"],
        dependencyIds: []
      }
    ],
    events: [
      {
        id: "event-emma-gymnastics",
        title: "Emma gymnastics",
        category: "Family",
        date: "",
        start: "16:00",
        end: "18:30",
        recurringDays: [1, 3, 6],
        notes: "Protect this block.",
        linkedTrackIds: ["LIFE_OPS"]
      },
      {
        id: "event-morning-study-block",
        title: "Morning study block",
        category: "Study",
        date: "",
        start: "05:30",
        end: "07:30",
        recurringDays: [0, 1, 2, 3, 4, 5, 6],
        notes: "Non-negotiable deep work.",
        linkedTrackIds: ["USMLE"]
      }
    ],
    goals: [
      {
        id: "goal-usmle-step-1",
        title: "USMLE Step 1",
        current: 0,
        target: 100,
        unit: "%",
        deadline: "2026-08-15",
        linkedTrackIds: ["USMLE"],
        dependencyIds: []
      },
      {
        id: "goal-ai-healthcare",
        title: "AI in Healthcare",
        current: 1,
        target: 5,
        unit: "milestones",
        deadline: "2026-12-31",
        linkedTrackIds: ["AI", "MASTERS"],
        dependencyIds: []
      },
      {
        id: "goal-masters-scholarships",
        title: "Masters & Scholarships",
        current: 0,
        target: 3,
        unit: "apps",
        deadline: "2026-10-15",
        linkedTrackIds: ["MASTERS", "AI"],
        dependencyIds: ["goal-ai-healthcare"]
      },
      {
        id: "goal-spain-nlv-dossier",
        title: "Spain NLV dossier",
        current: 1,
        target: 6,
        unit: "steps",
        deadline: "2026-09-15",
        linkedTrackIds: ["LIFE_OPS", "MASTERS"],
        dependencyIds: ["goal-masters-scholarships"]
      }
    ],
    notes:
      "Keep weekday study inside 4.5 focused hours. Protect family evenings. Build the 4 tracks: USMLE, AI, Masters, Life Ops.",
    weeklyFocus: "",
    pomodoro: {
      focusMinutes: 50,
      breakMinutes: 10
    },
    energyLog: {
      morning: 4,
      afternoon: 2,
      evening: 3
    },
    checkIns: {},
    reflections: [],
    milestonesCompleted: [],
    manualMilestones: {
      pythonCourseFinished: false,
      nlvVisaSubmitted: false,
      scholarshipApplied: false,
      rwthEnrollmentConfirmed: false,
      arrivalInGermany: false
    },
    settings: {
      celebrationSoundEnabled: false
    }
  };
}

export function hydrateCommandCenterState(saved) {
  const defaults = createCommandCenterState();

  if (!saved) {
    return defaults;
  }

  return {
    ...defaults,
    ...saved,
    constraintProfileId: saved.constraintProfileId || defaults.constraintProfileId,
    inbox: Array.isArray(saved.inbox) ? saved.inbox : defaults.inbox,
    projects: Array.isArray(saved.projects)
      ? saved.projects.map((project, index) => normalizeProject(project, index))
      : defaults.projects,
    publishingPipeline: Array.isArray(saved.publishingPipeline)
      ? saved.publishingPipeline.map((item, index) => normalizePipelineItem(item, index))
      : defaults.publishingPipeline,
    todos: Array.isArray(saved.todos)
      ? saved.todos.map((todo, index) => normalizeTodo(todo, index))
      : defaults.todos,
    events: Array.isArray(saved.events)
      ? saved.events.map((event, index) => normalizeEvent(event, index))
      : defaults.events,
    goals: Array.isArray(saved.goals)
      ? saved.goals.map((goal, index) => normalizeGoal(goal, index))
      : defaults.goals,
    notes: typeof saved.notes === "string" ? saved.notes : defaults.notes,
    weeklyFocus: typeof saved.weeklyFocus === "string" ? saved.weeklyFocus : defaults.weeklyFocus,
    pomodoro: {
      ...defaults.pomodoro,
      ...(saved.pomodoro || {})
    },
    energyLog: {
      ...defaults.energyLog,
      ...(saved.energyLog || {})
    },
    checkIns: normalizeCheckIns(saved.checkIns),
    reflections: normalizeReflections(saved.reflections),
    milestonesCompleted: normalizeMilestonesCompleted(saved.milestonesCompleted),
    manualMilestones: normalizeMilestoneFlags(saved.manualMilestones),
    settings: {
      ...defaults.settings,
      ...(saved.settings || {})
    }
  };
}

export function eventOccursOnDate(event, date) {
  if (event.date && event.date === date) {
    return true;
  }

  if (event.recurringDays?.length) {
    return event.recurringDays.includes(new Date(`${date}T12:00:00`).getDay());
  }

  return false;
}

export function eventsForDate(events, date) {
  return events
    .filter((event) => eventOccursOnDate(event, date))
    .sort((a, b) => (a.start || "").localeCompare(b.start || ""));
}
