import faPageMap from "../data/faPageMap.json" with { type: "json" };
import { sections, topics } from "../data/warRoomData.js";

export const TOTAL_UWORLD = 3645;
export const RESOURCE_PROGRESS_THRESHOLDS = [25, 50, 75, 100];

const RESOURCE_PROGRESS_DEFINITION_LIST = [
  {
    id: "first-aid",
    label: "First Aid",
    totalUnits: faPageMap.totalPages,
    unit: "pages",
    inputLabel: "Log pages today",
    readOnly: false
  },
  {
    id: "uworld",
    label: "UWorld",
    totalUnits: TOTAL_UWORLD,
    unit: "questions",
    inputLabel: "Log questions today",
    readOnly: false
  },
  {
    id: "pathoma",
    label: "Pathoma",
    totalUnits: 25,
    unit: "hours",
    inputLabel: "Log hours today",
    readOnly: false
  },
  {
    id: "sketchy-micro",
    label: "Sketchy Micro",
    totalUnits: 47,
    unit: "videos",
    inputLabel: "Log videos today",
    readOnly: false
  },
  {
    id: "sketchy-pharm",
    label: "Sketchy Pharm",
    totalUnits: 52,
    unit: "videos",
    inputLabel: "Log videos today",
    readOnly: false
  },
  {
    id: "anki",
    label: "Anki",
    totalUnits: 0,
    unit: "reviews",
    inputLabel: "Log reviews today",
    readOnly: false,
    hiddenByDefault: true
  },
  {
    id: "nbme",
    label: "NBMEs",
    totalUnits: 7,
    unit: "exams",
    readOnly: true,
    readOnlyLabel: "Logged via War Room"
  }
];

const RESOURCE_PROGRESS_DEFINITIONS = RESOURCE_PROGRESS_DEFINITION_LIST.reduce(
  (accumulator, definition) => {
    accumulator[definition.id] = definition;
    return accumulator;
  },
  {}
);

const SECTION_TOPIC_MAP = topics.reduce((accumulator, topic) => {
  if (!accumulator[topic.sectionId]) {
    accumulator[topic.sectionId] = [];
  }

  accumulator[topic.sectionId].push(topic);
  return accumulator;
}, {});

const SECTION_NAME_ALIASES = {
  biochem: ["biochemistry"],
  immuno: ["immunology"],
  micro: ["microbiology"],
  path: ["pathology"],
  pharm: ["pharmacology"],
  pubhealth: ["publichealthsciences", "pubhealthbiostats", "publichealth", "biostats"],
  cardio: ["cardiovascular"],
  endo: ["endocrine"],
  gi: ["gastrointestinal"],
  heme: ["hematologyoncology", "hemeonc"],
  msk: ["mskskinconnectivetissue", "musculoskeletalskinconnectivetissue"],
  neuro: ["neurology"],
  psych: ["psychiatry"],
  renal: ["renal"],
  repro: ["reproductive"],
  resp: ["respiratory"]
};

function normalizeToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toSafeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function roundToSingleDecimal(value) {
  return Math.round(value * 10) / 10;
}

function getResourceDefinition(resourceId) {
  return RESOURCE_PROGRESS_DEFINITIONS[resourceId] || null;
}

function getFaSectionForSectionId(sectionId) {
  const aliases = SECTION_NAME_ALIASES[sectionId] || [];

  return (
    faPageMap.sections.find((section) => {
      const normalized = normalizeToken(section.system);
      return aliases.includes(normalized);
    }) || null
  );
}

function calculateLegacyFaPagesCompleted(state = {}) {
  return sections.reduce((sum, section) => {
    const faSection = getFaSectionForSectionId(section.id);

    if (!faSection) {
      return sum;
    }

    const sectionProgress = state.systemProgress?.[section.id];

    if (sectionProgress?.faRead) {
      return sum + faSection.totalPages;
    }

    const relatedTopics = SECTION_TOPIC_MAP[section.id] || [];

    if (!relatedTopics.length) {
      return sum;
    }

    const completedTopicCount = relatedTopics.filter((topic) =>
      state.doneTopics?.includes(topic.title)
    ).length;

    if (!completedTopicCount) {
      return sum;
    }

    return sum + Math.round((completedTopicCount / relatedTopics.length) * faSection.totalPages);
  }, 0);
}

function countLoggedNbmes(state = {}) {
  return (state.assessments || []).filter((assessment) => {
    return assessment.kind === "NBME" || String(assessment.label || "").startsWith("NBME");
  }).length;
}

function countLoggedAnkiReviews(state = {}) {
  return Object.values(state.logs || {}).reduce(
    (sum, entry) => sum + Math.max(0, toSafeNumber(entry?.anki)),
    0
  );
}

function inferLegacyCompletedUnits(resourceId, state = {}) {
  const completedResources = state.completedResources || [];

  switch (resourceId) {
    case "first-aid":
      return calculateLegacyFaPagesCompleted(state);
    case "uworld":
      return Math.max(0, toSafeNumber(state.totalQuestions));
    case "pathoma":
      if (completedResources.includes("pathoma-full")) {
        return 25;
      }

      return completedResources.includes("pathoma-1-3") ? 9 : 0;
    case "sketchy-micro":
      return completedResources.includes("sketchy-micro") ? 47 : 0;
    case "sketchy-pharm":
      return completedResources.includes("sketchy-pharm") ? 52 : 0;
    case "anki":
      return countLoggedAnkiReviews(state);
    case "nbme":
      return countLoggedNbmes(state);
    default:
      return 0;
  }
}

function normalizeCompletedUnits(value, totalUnits) {
  const numeric = Math.max(0, toSafeNumber(value));

  if (totalUnits > 0) {
    return clamp(roundToSingleDecimal(numeric), 0, totalUnits);
  }

  return roundToSingleDecimal(numeric);
}

export function getResourceProgressDefinitions(options = {}) {
  const { includeHidden = false } = options;

  return RESOURCE_PROGRESS_DEFINITION_LIST.filter(
    (definition) => includeHidden || !definition.hiddenByDefault
  );
}

export function createDefaultResourceProgress() {
  return RESOURCE_PROGRESS_DEFINITION_LIST.reduce((accumulator, definition) => {
    accumulator[definition.id] = {
      totalUnits: definition.totalUnits,
      completedUnits: 0,
      unit: definition.unit,
      lastUpdated: null
    };
    return accumulator;
  }, {});
}

export function hydrateResourceProgress(savedProgress, state = {}) {
  const defaults = createDefaultResourceProgress();

  return Object.fromEntries(
    Object.entries(defaults).map(([resourceId, entry]) => {
      const definition = getResourceDefinition(resourceId);
      const savedEntry = savedProgress?.[resourceId] || {};
      const inferredCompleted = inferLegacyCompletedUnits(resourceId, state);
      const completedUnits = normalizeCompletedUnits(
        Math.max(toSafeNumber(savedEntry.completedUnits), inferredCompleted),
        definition.totalUnits
      );

      return [
        resourceId,
        {
          totalUnits: definition.totalUnits,
          completedUnits,
          unit: definition.unit,
          lastUpdated:
            typeof savedEntry.lastUpdated === "string" && savedEntry.lastUpdated
              ? savedEntry.lastUpdated
              : null
        }
      ];
    })
  );
}

export function resolveResourceProgress(state = {}) {
  const hydrated = hydrateResourceProgress(state.resourceProgress, state);

  return {
    ...hydrated,
    "first-aid": {
      ...hydrated["first-aid"],
      completedUnits: normalizeCompletedUnits(
        Math.max(
          hydrated["first-aid"].completedUnits,
          calculateLegacyFaPagesCompleted(state)
        ),
        hydrated["first-aid"].totalUnits
      )
    },
    uworld: {
      ...hydrated.uworld,
      completedUnits: normalizeCompletedUnits(
        Math.max(hydrated.uworld.completedUnits, Math.max(0, toSafeNumber(state.totalQuestions))),
        hydrated.uworld.totalUnits
      )
    },
    anki: {
      ...hydrated.anki,
      completedUnits: normalizeCompletedUnits(
        Math.max(hydrated.anki.completedUnits, countLoggedAnkiReviews(state)),
        hydrated.anki.totalUnits
      )
    },
    nbme: {
      ...hydrated.nbme,
      completedUnits: normalizeCompletedUnits(
        Math.max(hydrated.nbme.completedUnits, countLoggedNbmes(state)),
        hydrated.nbme.totalUnits
      )
    }
  };
}

export function getTrackedResourceEntry(state = {}, resourceId) {
  return resolveResourceProgress(state)[resourceId] || null;
}

export function getUWorldCompletedUnits(state = {}) {
  return getTrackedResourceEntry(state, "uworld")?.completedUnits || 0;
}

export function getUWorldCompletionPct(state = {}) {
  return calculateResourcePercent(getTrackedResourceEntry(state, "uworld"));
}

export function getFirstAidCompletedUnits(state = {}) {
  return getTrackedResourceEntry(state, "first-aid")?.completedUnits || 0;
}

export function getNbmeCompletedUnits(state = {}) {
  return getTrackedResourceEntry(state, "nbme")?.completedUnits || 0;
}

export function calculateResourcePercent(entry) {
  if (!entry?.totalUnits) {
    return 0;
  }

  return clamp((toSafeNumber(entry.completedUnits) / entry.totalUnits) * 100, 0, 100);
}

export function formatResourcePercent(entry) {
  const percent = calculateResourcePercent(entry);
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(1);
}

export function getRemainingUnits(entry) {
  if (!entry?.totalUnits) {
    return 0;
  }

  return roundToSingleDecimal(Math.max(0, entry.totalUnits - toSafeNumber(entry.completedUnits)));
}

export function formatResourceQuantity(value) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(1);
}

export function getResourceThresholdsCrossed(previousUnits, nextUnits, totalUnits) {
  if (!totalUnits) {
    return [];
  }

  const previousPct = (toSafeNumber(previousUnits) / totalUnits) * 100;
  const nextPct = (toSafeNumber(nextUnits) / totalUnits) * 100;

  return RESOURCE_PROGRESS_THRESHOLDS.filter(
    (threshold) => previousPct < threshold && nextPct >= threshold
  );
}

export function createResourceProgressPatch(state = {}, resourceId, amount) {
  const definition = getResourceDefinition(resourceId);

  if (!definition || definition.readOnly) {
    return null;
  }

  const numericAmount = Math.max(0, toSafeNumber(amount));

  if (!numericAmount) {
    return null;
  }

  const resolvedProgress = resolveResourceProgress(state);
  const currentEntry = resolvedProgress[resourceId];
  const previousUnits = currentEntry?.completedUnits || 0;
  const nextUnits =
    definition.totalUnits > 0
      ? clamp(previousUnits + numericAmount, 0, definition.totalUnits)
      : previousUnits + numericAmount;

  if (nextUnits === previousUnits) {
    return null;
  }

  return {
    definition,
    previousUnits,
    nextUnits,
    thresholdsCrossed: getResourceThresholdsCrossed(
      previousUnits,
      nextUnits,
      definition.totalUnits
    ),
    nextProgress: {
      ...(state.resourceProgress || {}),
      [resourceId]: {
        totalUnits: definition.totalUnits,
        completedUnits: nextUnits,
        unit: definition.unit,
        lastUpdated: new Date().toISOString()
      }
    }
  };
}
