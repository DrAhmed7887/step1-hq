import { TOTAL_UWORLD, todayKey } from "./warRoom.js";

export const JOURNEY_START_KEY = "2026-03-01";
export const WAR_MAP_WEEKS = 26;

export const THREAD_COLORS = {
  USMLE: "#ff6b57",
  AI: "#32c6b7",
  MASTERS: "#60a5fa",
  LIFE_OPS: "#f8b84e"
};

export const MOMENTUM_CONFIG = {
  DECAY_RATE: 0.05,
  MIN_GAIN: 0.02,
  NORMAL_GAIN: 0.05,
  GREAT_GAIN: 0.08,
  MAX: 1,
  MIN: 0
};

export const MANUAL_MILESTONE_LABELS = {
  pythonCourseFinished: "Python course finished",
  nlvVisaSubmitted: "NLV visa submitted",
  scholarshipApplied: "Scholarship applied",
  rwthEnrollmentConfirmed: "RWTH enrollment confirmed",
  arrivalInGermany: "Arrival in Germany"
};

export const MILESTONE_DEFINITIONS = [
  {
    id: "first-nbme",
    shortLabel: "NB",
    label: "First NBME taken",
    trackId: "USMLE",
    date: "2026-03-22"
  },
  {
    id: "uworld-50",
    shortLabel: "50",
    label: "50% UWorld complete",
    trackId: "USMLE",
    date: "2026-05-10"
  },
  {
    id: "python-course-finished",
    shortLabel: "PY",
    label: "Python course finished",
    trackId: "AI",
    date: "2026-04-12"
  },
  {
    id: "nlv-visa-submitted",
    shortLabel: "NV",
    label: "NLV visa submitted",
    trackId: "LIFE_OPS",
    date: "2026-05-24"
  },
  {
    id: "scholarship-applied",
    shortLabel: "SC",
    label: "Scholarship applied",
    trackId: "MASTERS",
    date: "2026-06-21"
  },
  {
    id: "usmle-exam-day",
    shortLabel: "EX",
    label: "USMLE exam day",
    trackId: "USMLE",
    date: "2026-08-15"
  },
  {
    id: "rwth-enrollment-confirmed",
    shortLabel: "RW",
    label: "RWTH enrollment confirmed",
    trackId: "MASTERS",
    date: "2026-08-30"
  },
  {
    id: "arrival-in-germany",
    shortLabel: "DE",
    label: "Arrival in Germany",
    trackId: "LIFE_OPS",
    date: "2026-09-13"
  }
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function midpointDate(left, right) {
  return new Date((left.getTime() + right.getTime()) / 2);
}

function normalizeDate(dateLike) {
  return new Date(`${dateLike}T12:00:00`);
}

function differenceInDays(left, right) {
  return Math.round((normalizeDate(right) - normalizeDate(left)) / 86400000);
}

function isDateWithinRange(dateKey, startKey, endKey) {
  return dateKey >= startKey && dateKey <= endKey;
}

function normalizeCompletedTracks(items = [], startKey, endKey) {
  return items.reduce((accumulator, item) => {
    if (item?.status !== "done" || !item.completedAt || !isDateWithinRange(item.completedAt, startKey, endKey)) {
      return accumulator;
    }

    (item.linkedTrackIds || []).forEach((trackId) => {
      accumulator[trackId] = (accumulator[trackId] || 0) + 1;
    });
    return accumulator;
  }, {});
}

function normalizeAssessmentTracks(items = [], startKey, endKey) {
  return items.reduce((accumulator, item) => {
    if (!item?.date || !isDateWithinRange(item.date, startKey, endKey)) {
      return accumulator;
    }

    accumulator.USMLE = (accumulator.USMLE || 0) + 1;
    return accumulator;
  }, {});
}

function normalizeStudyTracks(logs = {}, startKey, endKey) {
  return Object.entries(logs).reduce((accumulator, [dateKey, entry]) => {
    if (!isDateWithinRange(dateKey, startKey, endKey)) {
      return accumulator;
    }

    if (Number(entry?.questions || 0) > 0 || Number(entry?.hours || 0) > 0 || Number(entry?.anki || 0) > 0) {
      accumulator.USMLE = (accumulator.USMLE || 0) + 1;
    }

    return accumulator;
  }, {});
}

function normalizeMilestoneTracks(milestones, startKey, endKey) {
  return milestones.reduce((accumulator, milestone) => {
    if (!milestone.complete || !isDateWithinRange(milestone.date, startKey, endKey)) {
      return accumulator;
    }

    accumulator[milestone.trackId] = (accumulator[milestone.trackId] || 0) + 1;
    return accumulator;
  }, {});
}

export function resolveSessionType(hours) {
  const numericHours = Number(hours || 0);

  if (numericHours <= 1) {
    return "minimum";
  }

  if (numericHours >= 4) {
    return "great";
  }

  return "normal";
}

export function resolveQuoteCategory({ hours = 0, energy = "medium" }) {
  const numericHours = Number(hours || 0);

  if (numericHours <= 1 || energy === "low") {
    return "exhausted";
  }

  if (numericHours >= 4 || energy === "high") {
    return "attack";
  }

  return "normal";
}

export function resolveAvatarPose(entry) {
  const category = resolveQuoteCategory(entry);

  if (category === "attack") {
    return "attack";
  }

  if (category === "exhausted") {
    return "exhausted";
  }

  return "ready";
}

export function updateMomentum(currentMomentum, daysSinceLastCheckIn, todaySessionType) {
  let momentum = Number.isFinite(Number(currentMomentum)) ? Number(currentMomentum) : 0;
  const missedDays = Math.max(0, Number(daysSinceLastCheckIn || 0) - 1);

  momentum -= missedDays * MOMENTUM_CONFIG.DECAY_RATE;
  momentum = clamp(momentum, MOMENTUM_CONFIG.MIN, MOMENTUM_CONFIG.MAX);

  const gains = {
    minimum: MOMENTUM_CONFIG.MIN_GAIN,
    normal: MOMENTUM_CONFIG.NORMAL_GAIN,
    great: MOMENTUM_CONFIG.GREAT_GAIN
  };

  momentum += gains[todaySessionType] || MOMENTUM_CONFIG.NORMAL_GAIN;
  return clamp(momentum, MOMENTUM_CONFIG.MIN, MOMENTUM_CONFIG.MAX);
}

export function getMostRecentCheckIn(checkIns = {}, dateKey = todayKey()) {
  const ordered = Object.values(checkIns)
    .filter((entry) => entry?.date && entry.date < dateKey)
    .sort((left, right) => right.date.localeCompare(left.date));

  return ordered[0] || null;
}

export function calculateNextMomentum(checkIns = {}, dateKey = todayKey(), sessionType = "normal") {
  const previousCheckIn = getMostRecentCheckIn(checkIns, dateKey);
  const currentMomentum = previousCheckIn?.momentum || 0;
  const daysSinceLastCheckIn = previousCheckIn ? differenceInDays(previousCheckIn.date, dateKey) : 1;
  return updateMomentum(currentMomentum, daysSinceLastCheckIn, sessionType);
}

export function getLatestMomentum(checkIns = {}) {
  const latest = Object.values(checkIns)
    .filter((entry) => entry?.date)
    .sort((left, right) => right.date.localeCompare(left.date))[0];

  return latest?.momentum || 0;
}

export function getMomentumColor(value) {
  if (value < 0.2) {
    return "#9f1239";
  }

  if (value < 0.5) {
    return "#f59e0b";
  }

  if (value < 0.8) {
    return "#14b8a6";
  }

  return "#22c55e";
}

export function getMomentumBandLabel(value) {
  if (value < 0.2) {
    return "Rekindle";
  }

  if (value < 0.5) {
    return "Returning";
  }

  if (value < 0.8) {
    return "Rolling";
  }

  return "Locked";
}

export function getMilestoneStatus({ warRoomState, commandCenterState, today = todayKey() }) {
  const manualFlags = commandCenterState?.manualMilestones || {};
  const examDate = warRoomState?.examDate || "2026-08-15";

  return MILESTONE_DEFINITIONS.map((milestone) => {
    let complete = false;

    switch (milestone.id) {
      case "first-nbme":
        complete = (warRoomState?.assessments || []).some((entry) => entry.kind === "NBME");
        break;
      case "uworld-50":
        complete = Number(warRoomState?.totalQuestions || 0) >= TOTAL_UWORLD * 0.5;
        break;
      case "python-course-finished":
        complete = Boolean(manualFlags.pythonCourseFinished);
        break;
      case "nlv-visa-submitted":
        complete = Boolean(manualFlags.nlvVisaSubmitted);
        break;
      case "scholarship-applied":
        complete = Boolean(manualFlags.scholarshipApplied);
        break;
      case "usmle-exam-day":
        complete = today >= examDate;
        break;
      case "rwth-enrollment-confirmed":
        complete = Boolean(manualFlags.rwthEnrollmentConfirmed);
        break;
      case "arrival-in-germany":
        complete = Boolean(manualFlags.arrivalInGermany);
        break;
      default:
        complete = false;
    }

    return {
      ...milestone,
      complete
    };
  });
}

export function getNewMilestones({ warRoomState, commandCenterState, today = todayKey() }) {
  const completedIds = commandCenterState?.milestonesCompleted || [];

  return getMilestoneStatus({ warRoomState, commandCenterState, today }).filter(
    (milestone) => milestone.complete && !completedIds.includes(milestone.id)
  );
}

export function buildWarMapWeeks({ warRoomState, commandCenterState, today = todayKey() }) {
  const milestones = getMilestoneStatus({ warRoomState, commandCenterState, today });
  const startDate = normalizeDate(JOURNEY_START_KEY);

  return Array.from({ length: WAR_MAP_WEEKS }).map((_, index) => {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + index * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startKey = todayKey(weekStart);
    const endKey = todayKey(weekEnd);
    const studyTouches = normalizeStudyTracks(warRoomState?.logs, startKey, endKey);
    const todoTouches = normalizeCompletedTracks(commandCenterState?.todos, startKey, endKey);
    const assessmentTouches = normalizeAssessmentTracks(warRoomState?.assessments, startKey, endKey);
    const milestoneTouches = normalizeMilestoneTracks(milestones, startKey, endKey);

    const trackActivity = {
      USMLE:
        (studyTouches.USMLE || 0) +
        (todoTouches.USMLE || 0) +
        (assessmentTouches.USMLE || 0) +
        (milestoneTouches.USMLE || 0),
      AI: (todoTouches.AI || 0) + (milestoneTouches.AI || 0),
      MASTERS: (todoTouches.MASTERS || 0) + (milestoneTouches.MASTERS || 0),
      LIFE_OPS: (todoTouches.LIFE_OPS || 0) + (milestoneTouches.LIFE_OPS || 0)
    };

    const totalActivity = Object.values(trackActivity).reduce((sum, value) => sum + value, 0);
    const current = isDateWithinRange(today, startKey, endKey);
    const past = endKey < today;
    const status = current ? "current" : past ? (totalActivity > 0 ? "completed" : "quiet") : "future";

    return {
      id: `week-${index + 1}`,
      index,
      startKey,
      endKey,
      status,
      totalActivity,
      label: midpointDate(weekStart, weekEnd).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      }),
      monthLabel:
        index === 0 ||
        midpointDate(weekStart, weekEnd).getMonth() !==
          midpointDate(
            new Date(startDate.getTime() + (index - 1) * 7 * 86400000),
            new Date(startDate.getTime() + ((index - 1) * 7 + 6) * 86400000)
          ).getMonth()
          ? midpointDate(weekStart, weekEnd).toLocaleDateString("en-US", { month: "short" })
          : "",
      trackActivity,
      milestones: milestones.filter((milestone) => isDateWithinRange(milestone.date, startKey, endKey))
    };
  });
}
