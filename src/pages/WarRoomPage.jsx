import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { sections, searchTopics, topics } from "../data/warRoomData";
import {
  buildResilienceBenchmark,
  getConstraintProfile
} from "../data/resilienceData";
import {
  usePersistentState,
  useStorageJson,
  writeStorageJson
} from "../lib/persistence";
import {
  CLOUD_SYNC_SETTINGS_KEY,
  createCloudSyncSettings,
  hydrateCloudSyncSettings,
  pullCloudSnapshot,
  pushCloudSnapshot
} from "../lib/cloudSync";
import {
  COMMAND_CENTER_STORAGE_KEY,
  createCommandCenterState,
  eventsForDate,
  hydrateCommandCenterState
} from "../lib/commandCenter";
import { generateCoachingPlan, resolveDailyCoachInputs } from "../lib/coachingEngine";
import { createCombinedBackup, normalizeImportedBackup } from "../lib/appBackup";
import MilestoneCelebration from "../components/journey/MilestoneCelebration";
import WarMapPanel from "../components/journey/WarMapPanel";
import SettingsPanel from "../components/settings/SettingsPanel";
import CoachStatusPanel from "../components/war-room/CoachStatusPanel";
import { getLatestMomentum, getNewMilestones } from "../lib/journey";
import {
  WAR_ROOM_STORAGE_KEY,
  ERROR_TAXONOMY,
  calculateAccuracy,
  calculateStreak,
  calculateTotals,
  createWarRoomState,
  hydrateWarRoomState,
  interpolatePassProbability,
  todayKey
} from "../lib/warRoom";

const tabs = [
  { id: "coach", label: "Coach" },
  { id: "hq", label: "HQ" },
  { id: "systems", label: "Systems" },
  { id: "uworld", label: "UWorld" },
  { id: "nbmes", label: "NBMEs" },
  { id: "incorrects", label: "Incorrects" },
  { id: "map", label: "Map" }
];
const TAB_IDS = tabs.map((entry) => entry.id);

function StatCard({ label, value, accent, hint }) {
  return (
    <div className="panel-soft p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-mist">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className={`font-mono text-3xl font-bold ${accent}`}>{value}</p>
        {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, body }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.2em] text-amber">{eyebrow}</p>
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      {body ? <p className="max-w-3xl text-sm leading-7 text-mist">{body}</p> : null}
    </div>
  );
}

function ChartShell({ title, body, children }) {
  return (
    <section className="panel p-5 sm:p-6">
      <SectionTitle eyebrow="Charts" title={title} body={body} />
      <div className="mt-5 h-80">{children}</div>
    </section>
  );
}

function StoryCard({ story }) {
  return (
    <article className="rounded-3xl border border-line bg-white/5 p-4">
      <h3 className="text-lg font-semibold text-white">{story.title}</h3>
      <p className="mt-2 text-sm text-mist">
        {story.weeklyHours} hrs/week · {story.prepMonths} months · {story.dailyPattern}
      </p>
      <p className="mt-3 text-sm text-slate-300">
        <span className="font-semibold text-white">Setback:</span> {story.setbacks}
      </p>
      <p className="mt-2 text-sm text-slate-300">
        <span className="font-semibold text-white">Turning point:</span> {story.turningPoint}
      </p>
      <p className="mt-2 text-sm text-teal">{story.result}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {story.badges.map((badge) => (
          <span key={badge} className="rounded-full border border-coral/30 px-3 py-1 text-xs text-coral">
            {badge}
          </span>
        ))}
      </div>
    </article>
  );
}

function createEmptyBulkRow(sectionId = sections[0].id) {
  return {
    id: crypto.randomUUID(),
    sectionId,
    questions: "",
    correct: ""
  };
}

function createKnowledgeGapRow(sectionId = sections.find((section) => section.kind === "systems")?.id || sections[0].id) {
  return {
    id: crypto.randomUUID(),
    system: sectionId,
    count: ""
  };
}

function createNbmeAnalysisDraft(date = todayKey()) {
  return {
    nbmeId: "",
    label: "",
    date,
    percentCorrect: "",
    totalQuestions: "200",
    knowledgeGaps: [createKnowledgeGapRow()],
    trickQuestions: "",
    carelessness: ""
  };
}

function weekKeys() {
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return todayKey(date);
  });
}

function shortDateLabel(dateKey) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function buildRecentPerformance(logs, length = 14) {
  const entries = Object.entries(logs)
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-length);

  return entries.map(([date, log]) => ({
    date,
    label: shortDateLabel(date),
    questions: Number(log.questions || 0),
    hours: Number(log.hours || 0),
    accuracy: calculateAccuracy(Number(log.correct || 0), Number(log.questions || 0))
  }));
}

function buildSystemChartData(state) {
  return sections.map((section) => {
    const relatedTopics = topics.filter((topic) => topic.sectionId === section.id);
    const doneCount = relatedTopics.filter((topic) => state.doneTopics.includes(topic.title)).length;
    const progress = state.systemProgress[section.id];
    return {
      id: section.id,
      section: section.name.replace(" / ", " ").slice(0, 14),
      color: section.color,
      questions: progress.questionsDone,
      accuracy: calculateAccuracy(progress.correct, progress.questionsDone),
      completion: relatedTopics.length ? Math.round((doneCount / relatedTopics.length) * 100) : 0
    };
  });
}

function buildFatigueChartData(entries) {
  const byContext = entries.reduce((accumulator, entry) => {
    if (!accumulator[entry.context]) {
      accumulator[entry.context] = {
        context: entry.context,
        totalAccuracy: 0,
        totalEnergy: 0,
        count: 0
      };
    }

    accumulator[entry.context].totalAccuracy += Number(entry.accuracy || 0);
    accumulator[entry.context].totalEnergy += Number(entry.energy || 0);
    accumulator[entry.context].count += 1;
    return accumulator;
  }, {});

  return Object.values(byContext)
    .map((entry) => ({
      context: entry.context.length > 18 ? `${entry.context.slice(0, 18)}…` : entry.context,
      accuracy: Math.round(entry.totalAccuracy / entry.count),
      energy: Number((entry.totalEnergy / entry.count).toFixed(1))
    }))
    .sort((left, right) => left.accuracy - right.accuracy);
}

function buildNbmeChartData(assessments) {
  return [...assessments]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((assessment) => ({
      label: assessment.label,
      epc: assessment.epc,
      passProbability: Math.round(interpolatePassProbability(assessment.epc) * 100)
    }));
}

function forecastHeadline(forecast) {
  if (!forecast || forecast.level === "insufficient_data") {
    return "Insufficient data";
  }

  return `${forecast.probability}%`;
}

function forecastSubline(forecast) {
  if (!forecast || forecast.level === "insufficient_data") {
    return "Log a study block or assessment first.";
  }

  return "Based on UW avg, NBME, FA progress";
}

const CHECK_IN_HOUR_OPTIONS = [
  { value: "0", label: "0" },
  { value: "0.5", label: "0.5" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3.5", label: "3+" }
];

function normalizeCoachHourSelection(value) {
  const numeric = Number(value || 0);

  if (numeric >= 3) {
    return "3.5";
  }

  if (numeric === 0.5) {
    return "0.5";
  }

  if (numeric === 1) {
    return "1";
  }

  if (numeric === 2) {
    return "2";
  }

  return "0";
}

function formatCoachHours(value) {
  const numeric = Number(value || 0);

  if (numeric >= 3) {
    return "3+ hours";
  }

  if (numeric === 1) {
    return "1 hour";
  }

  if (numeric === 0.5) {
    return "0.5 hours";
  }

  if (numeric === 0) {
    return "0 hours";
  }

  return `${numeric} hours`;
}

export default function WarRoomPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = usePersistentState(
    WAR_ROOM_STORAGE_KEY,
    () => createWarRoomState(sections),
    (saved) => hydrateWarRoomState(saved, sections)
  );
  const [cloudSettings, setCloudSettings] = usePersistentState(
    CLOUD_SYNC_SETTINGS_KEY,
    createCloudSyncSettings,
    hydrateCloudSyncSettings
  );
  const [tab, setTab] = useState(() => {
    const requestedTab = searchParams.get("tab");
    return TAB_IDS.includes(requestedTab) ? requestedTab : "coach";
  });
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ tone: "text-mist", message: "" });
  const [problemDraft, setProblemDraft] = useState({
    source: "UWorld",
    topicTitle: topics[0].title,
    taxonomy: ERROR_TAXONOMY[0].id,
    note: "",
    qids: "",
    date: todayKey()
  });
  const [assessmentDraft, setAssessmentDraft] = useState({
    kind: "NBME",
    label: "NBME 26",
    epc: "",
    date: todayKey(),
    notes: ""
  });
  const [nbmeView, setNbmeView] = useState("scores");
  const [nbmeAnalysisDraft, setNbmeAnalysisDraft] = useState(() =>
    createNbmeAnalysisDraft(todayKey())
  );
  const [fatigueDraft, setFatigueDraft] = useState({
    date: todayKey(),
    context: "Uninterrupted 60-minute session",
    type: "UWorld block",
    accuracy: "",
    energy: "3",
    notes: ""
  });

  const [coachCheckIn, setCoachCheckIn] = useState({
    energy: "",
    hours: "",
    blockers: ""
  });
  const [showCoachPlan, setShowCoachPlan] = useState(
    () => state.dailyPlan?.date === todayKey() && Boolean(state.dailyPlan?.snapshot)
  );
  const [bulkRows, setBulkRows] = useState([
    createEmptyBulkRow("cardio"),
    createEmptyBulkRow("renal")
  ]);
  const [quizDraft, setQuizDraft] = useState({
    topicTitle: topics[0].title,
    sectionHint: "",
    loading: false,
    result: "",
    error: ""
  });
  const [inboxDraft, setInboxDraft] = useState("");
  const [ankiQids, setAnkiQids] = useState("");
  const [ankiSyncStatus, setAnkiSyncStatus] = useState({ tone: "text-mist", message: "" });
  const [celebration, setCelebration] = useState(null);

  const deferredSearch = useDeferredValue(search);
  const searchResults = useMemo(() => searchTopics(deferredSearch), [deferredSearch]);
  const activeTopic =
    selectedTopic || searchResults[0] || topics.find((topic) => topic.title === problemDraft.topicTitle);
  const commandCenterSnapshot = useStorageJson(
    COMMAND_CENTER_STORAGE_KEY,
    createCommandCenterState,
    hydrateCommandCenterState
  );
  const recentPerformance = useMemo(() => buildRecentPerformance(state.logs), [state.logs]);
  const systemChartData = useMemo(() => buildSystemChartData(state), [state]);
  const fatigueChartData = useMemo(
    () => buildFatigueChartData(state.fatigueEntries),
    [state.fatigueEntries]
  );
  const nbmeChartData = useMemo(() => buildNbmeChartData(state.assessments), [state.assessments]);
  const nbmeAssessments = useMemo(
    () =>
      [...state.assessments]
        .filter((assessment) => assessment.kind === "NBME" || assessment.label.startsWith("NBME"))
        .sort((left, right) => right.date.localeCompare(left.date)),
    [state.assessments]
  );

  const today = todayKey();
  const todayLog = state.logs[today] || {
    questions: 0,
    correct: 0,
    hours: 0,
    anki: 0,
    sectionId: ""
  };
  const totals = calculateTotals(state.logs);
  const accuracy = calculateAccuracy(totals.totalCorrect, totals.totalQuestions);
  const daysLeft = Math.max(
    0,
    Math.floor((new Date(`${state.examDate}T09:00:00`) - new Date()) / 86400000)
  );
  const recentDailyHours =
    recentPerformance.length > 0
      ? Number(
          (
            recentPerformance.reduce((sum, entry) => sum + Number(entry.hours || 0), 0) /
            recentPerformance.length
          ).toFixed(1)
        )
      : 0;
  const resilience = buildResilienceBenchmark(
    commandCenterSnapshot.constraintProfileId,
    recentDailyHours
  );

  const dailyCoachInputs = useMemo(
    () => resolveDailyCoachInputs(state.dailyStart, commandCenterSnapshot),
    [state.dailyStart, commandCenterSnapshot]
  );
  const coachPlan = useMemo(
    () =>
      generateCoachingPlan({
        warRoomState: {
          ...state,
          dailyStart: dailyCoachInputs
        },
        commandCenterState: commandCenterSnapshot,
        sections,
        topics
      }),
    [commandCenterSnapshot, dailyCoachInputs, state]
  );
  const week = weekKeys().map((key) => ({ key, ...state.logs[key] }));
  const todaysEvents = eventsForDate(commandCenterSnapshot.events || [], today);
  const hasLockedPlanToday =
    state.dailyPlan?.date === today && Boolean(state.dailyPlan?.snapshot);
  const upcomingDates = Array.from({ length: 5 }).map((_, index) => {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() + index);
    return todayKey(date);
  });
  const renderedProblems = state.problems.map((problem) => {
    const frequency = state.problems.filter(
      (entry) => entry.recurrenceKey === problem.recurrenceKey
    ).length;
    const topic = topics.find((entry) => entry.title === problem.topicTitle);
    const section = sections.find((entry) => entry.id === problem.sectionId);
    return {
      ...problem,
      frequency,
      topic,
      section,
      taxonomy: ERROR_TAXONOMY.find((entry) => entry.id === problem.taxonomy)
    };
  });
  const latestMomentum = getLatestMomentum(commandCenterSnapshot.checkIns || {});

  useEffect(() => {
    if (
      state.dailyStart?.date !== dailyCoachInputs.date ||
      state.dailyStart?.energy !== dailyCoachInputs.energy ||
      Number(state.dailyStart?.availableHours || 0) !== Number(dailyCoachInputs.availableHours || 0)
    ) {
      setState((current) => ({
        ...current,
        dailyStart: {
          ...dailyCoachInputs,
          note:
            current.dailyStart?.date === dailyCoachInputs.date
              ? current.dailyStart?.note || ""
              : dailyCoachInputs.note || ""
        }
      }));
    }
  }, [dailyCoachInputs, setState, state.dailyStart?.availableHours, state.dailyStart?.date, state.dailyStart?.energy]);

  useEffect(() => {
    if (state.dailyPlan?.date !== today && showCoachPlan) {
      setShowCoachPlan(false);
    }
  }, [showCoachPlan, state.dailyPlan?.date, today]);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");

    if (requestedTab && TAB_IDS.includes(requestedTab) && requestedTab !== tab) {
      setTab(requestedTab);
    }
  }, [searchParams, tab]);

  useEffect(() => {
    if (nbmeAnalysisDraft.nbmeId || !nbmeAssessments.length) {
      return;
    }

    const latest = nbmeAssessments[0];
    setNbmeAnalysisDraft((current) => ({
      ...current,
      nbmeId: latest.id,
      label: latest.label,
      date: latest.date,
      percentCorrect: String(latest.epc || ""),
      totalQuestions: current.totalQuestions || "200"
    }));
  }, [nbmeAnalysisDraft.nbmeId, nbmeAssessments]);

  useEffect(() => {
    const freshMilestones = getNewMilestones({
      warRoomState: state,
      commandCenterState: commandCenterSnapshot,
      today
    });

    if (!freshMilestones.length) {
      return;
    }

    writeStorageJson(COMMAND_CENTER_STORAGE_KEY, {
      ...commandCenterSnapshot,
      milestonesCompleted: Array.from(
        new Set([
          ...(commandCenterSnapshot.milestonesCompleted || []),
          ...freshMilestones.map((entry) => entry.id)
        ])
      )
    });
    setCelebration(freshMilestones[0]);
  }, [commandCenterSnapshot, state, state.assessments, state.examDate, state.totalQuestions, today]);

  function updateActiveTab(nextTab) {
    setTab(nextTab);
    const nextParams = new URLSearchParams(searchParams);

    if (nextTab === "coach") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", nextTab);
    }

    setSearchParams(nextParams, { replace: true });
  }

  function patchState(next) {
    setState((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      return {
        ...current,
        ...resolved
      };
    });
  }

  function updateDailyStart(partial) {
    patchState({
      dailyStart: {
        ...dailyCoachInputs,
        ...partial,
        date: today
      }
    });
  }

  function buildCombinedBackup() {
    return createCombinedBackup({
      warRoom: state,
      commandCenter: commandCenterSnapshot,
      syncSettings: cloudSettings
    });
  }

  function setLogField(field, value) {
    const nextLog = {
      ...todayLog,
      [field]: field === "sectionId" ? value : Math.max(0, Number(value) || 0)
    };
    const nextLogs = {
      ...state.logs,
      [today]: nextLog
    };
    const nextTotals = calculateTotals(nextLogs);
    patchState({
      logs: nextLogs,
      totalQuestions: nextTotals.totalQuestions,
      totalCorrect: nextTotals.totalCorrect,
      streak: calculateStreak(nextLogs)
    });
  }

  function applyTodayLogToSystem() {
    if (!todayLog.sectionId || !todayLog.questions) {
      return;
    }

    const previous = state.systemProgress[todayLog.sectionId];
    patchState({
      systemProgress: {
        ...state.systemProgress,
        [todayLog.sectionId]: {
          ...previous,
          questionsDone: previous.questionsDone + Number(todayLog.questions || 0),
          correct: previous.correct + Number(todayLog.correct || 0),
          lastStudied: today
        }
      }
    });
  }

  function updateBulkRow(rowId, field, value) {
    setBulkRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: field === "sectionId" ? value : value
            }
          : row
      )
    );
  }

  function applyBulkLog() {
    const validRows = bulkRows.filter(
      (row) => row.sectionId && Number(row.questions) > 0 && Number(row.correct) >= 0
    );

    if (!validRows.length) {
      return;
    }

    const totalQuestionsAdded = validRows.reduce(
      (sum, row) => sum + Number(row.questions || 0),
      0
    );
    const totalCorrectAdded = validRows.reduce((sum, row) => sum + Number(row.correct || 0), 0);
    const nextSystemProgress = { ...state.systemProgress };

    validRows.forEach((row) => {
      const previous = nextSystemProgress[row.sectionId];
      nextSystemProgress[row.sectionId] = {
        ...previous,
        questionsDone: previous.questionsDone + Number(row.questions || 0),
        correct: previous.correct + Number(row.correct || 0),
        lastStudied: today
      };
    });

    const nextLog = {
      ...todayLog,
      questions: Number(todayLog.questions || 0) + totalQuestionsAdded,
      correct: Number(todayLog.correct || 0) + totalCorrectAdded
    };
    const nextLogs = {
      ...state.logs,
      [today]: nextLog
    };
    const nextTotals = calculateTotals(nextLogs);

    patchState({
      logs: nextLogs,
      systemProgress: nextSystemProgress,
      totalQuestions: nextTotals.totalQuestions,
      totalCorrect: nextTotals.totalCorrect,
      streak: calculateStreak(nextLogs)
    });

    setBulkRows([createEmptyBulkRow()]);
  }

  function toggleTopicCompletion(title) {
    const exists = state.doneTopics.includes(title);
    const topic = topics.find((entry) => entry.title === title);
    patchState({
      doneTopics: exists
        ? state.doneTopics.filter((entry) => entry !== title)
        : [...state.doneTopics, title],
      systemProgress: topic
        ? {
            ...state.systemProgress,
            [topic.sectionId]: {
              ...state.systemProgress[topic.sectionId],
              lastStudied: today
            }
          }
        : state.systemProgress
    });
  }

  function toggleBookmark(title) {
    const exists = state.bookmarks.includes(title);
    patchState({
      bookmarks: exists
        ? state.bookmarks.filter((entry) => entry !== title)
        : [...state.bookmarks, title]
    });
  }

  function updateSystem(sectionId, field, value) {
    const current = state.systemProgress[sectionId];
    patchState({
      systemProgress: {
        ...state.systemProgress,
        [sectionId]: {
          ...current,
          [field]:
            typeof current[field] === "boolean"
              ? Boolean(value)
              : field === "notes"
                ? value
                : Math.max(0, Number(value) || 0),
          lastStudied:
            field === "notes" && !value
              ? current.lastStudied
              : today
        }
      }
    });
  }

  function addProblem(event) {
    event.preventDefault();
    const topic = topics.find((entry) => entry.title === problemDraft.topicTitle);

    patchState({
      problems: [
        {
          id: crypto.randomUUID(),
          ...problemDraft,
          sectionId: topic?.sectionId || "",
          recurrenceKey: problemDraft.topicTitle
        },
        ...state.problems
      ]
    });

    setProblemDraft((current) => ({
      ...current,
      note: "",
      qids: ""
    }));
  }

  function addAssessment(event) {
    event.preventDefault();
    const epc = Math.max(0, Number(assessmentDraft.epc) || 0);
    const id = crypto.randomUUID();
    const isFree120 = assessmentDraft.label === "Free120";
    const record = {
      id,
      kind: isFree120 ? "Free120" : "NBME",
      label: assessmentDraft.label,
      epc,
      percentCorrect: epc,
      date: assessmentDraft.date,
      notes: assessmentDraft.notes
    };

    patchState({
      assessments: [
        ...state.assessments,
        record
      ]
    });
    if (!isFree120) {
      setNbmeView("analysis");
      setNbmeAnalysisDraft({
        nbmeId: id,
        label: record.label,
        date: record.date,
        percentCorrect: String(epc),
        totalQuestions: "200",
        knowledgeGaps: [createKnowledgeGapRow()],
        trickQuestions: "",
        carelessness: ""
      });
    }

    setAssessmentDraft((current) => ({
      ...current,
      epc: "",
      notes: ""
    }));
  }

  function updateKnowledgeGapRow(rowId, field, value) {
    setNbmeAnalysisDraft((current) => ({
      ...current,
      knowledgeGaps: current.knowledgeGaps.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: value
            }
          : row
      )
    }));
  }

  function addKnowledgeGapRow() {
    setNbmeAnalysisDraft((current) => ({
      ...current,
      knowledgeGaps: [...current.knowledgeGaps, createKnowledgeGapRow()]
    }));
  }

  function removeKnowledgeGapRow(rowId) {
    setNbmeAnalysisDraft((current) => ({
      ...current,
      knowledgeGaps:
        current.knowledgeGaps.length <= 1
          ? current.knowledgeGaps
          : current.knowledgeGaps.filter((row) => row.id !== rowId)
    }));
  }

  function selectNbmeForAnalysis(assessmentId) {
    const selected = nbmeAssessments.find((assessment) => assessment.id === assessmentId);

    if (!selected) {
      return;
    }

    const existing = (state.nbmeAnalyses || []).find((entry) => entry.nbmeId === assessmentId);

    setNbmeAnalysisDraft({
      nbmeId: selected.id,
      label: selected.label,
      date: selected.date,
      percentCorrect: String(selected.epc || ""),
      totalQuestions: String(existing?.totalQuestions || 200),
      knowledgeGaps:
        existing?.analysis?.knowledgeGaps?.length
          ? existing.analysis.knowledgeGaps.map((gap) => ({
              id: crypto.randomUUID(),
              system: gap.system,
              count: String(gap.count || "")
            }))
          : [createKnowledgeGapRow()],
      trickQuestions: String(existing?.analysis?.trickQuestions || ""),
      carelessness: String(existing?.analysis?.carelessness || "")
    });
  }

  function saveNbmeAnalysis(event) {
    event.preventDefault();

    if (!nbmeAnalysisDraft.nbmeId) {
      return;
    }

    const entry = {
      nbmeId: nbmeAnalysisDraft.nbmeId,
      date: nbmeAnalysisDraft.date,
      percentCorrect: Math.max(0, Number(nbmeAnalysisDraft.percentCorrect) || 0),
      totalQuestions: Math.max(1, Number(nbmeAnalysisDraft.totalQuestions) || 200),
      analysis: {
        knowledgeGaps: nbmeAnalysisDraft.knowledgeGaps
          .filter((gap) => gap.system && Number(gap.count) > 0)
          .map((gap) => ({
            system: gap.system,
            count: Number(gap.count || 0)
          })),
        trickQuestions: Math.max(0, Number(nbmeAnalysisDraft.trickQuestions) || 0),
        carelessness: Math.max(0, Number(nbmeAnalysisDraft.carelessness) || 0)
      }
    };

    patchState({
      nbmeAnalyses: [
        entry,
        ...(state.nbmeAnalyses || []).filter((analysis) => analysis.nbmeId !== entry.nbmeId)
      ]
    });
  }

  function addFatigueEntry(event) {
    event.preventDefault();
    patchState({
      fatigueEntries: [
        {
          id: crypto.randomUUID(),
          ...fatigueDraft,
          accuracy: Math.max(0, Number(fatigueDraft.accuracy) || 0),
          energy: Math.max(1, Number(fatigueDraft.energy) || 1)
        },
        ...state.fatigueEntries
      ]
    });

    setFatigueDraft((current) => ({
      ...current,
      accuracy: "",
      notes: ""
    }));
  }

  async function generateQuiz() {
    const topic = topics.find((entry) => entry.title === quizDraft.topicTitle);
    const section = sections.find((entry) => entry.id === topic?.sectionId);
    
    const phase1Prompt = `Role: Board-certified physician and expert NBME/USMLE item-writer.
Task: Create ONE clinical vignette MCQ testing: ${quizDraft.topicTitle}
Format: Single-best-answer. 4-sentence vignette with demographics, chief concern, vitals, PE, labs. 5 choices (A-E). Explain correct + all distractors.
Context: Physician preparing for Step 1. First Aid pages: ${topic?.fa || "N/A"}. Section: ${section?.name || "N/A"}.
Additional focus: ${quizDraft.sectionHint || "None"}.`;

    setQuizDraft((current) => ({ ...current, loading: true, result: "Phase 1: Generating clinical vignette...", error: "" }));

    try {
      const useProxy = state.aiSettings.mode === "proxy";
      const headers = useProxy
        ? { "content-type": "application/json" }
        : {
            "content-type": "application/json",
            "x-api-key": state.aiSettings.apiKey,
            "anthropic-version": "2023-06-01"
          };
      const endpoint = useProxy ? "/api/anthropic" : state.aiSettings.endpoint;

      const phase1Res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: state.aiSettings.model,
          max_tokens: 900,
          messages: [{ role: "user", content: phase1Prompt }]
        })
      });

      if (!phase1Res.ok) throw new Error(`Phase 1 failed: ${phase1Res.status}`);
      const phase1Json = await phase1Res.json();
      const phase1Text =
        phase1Json.content?.map((item) => item.text).filter(Boolean).join("\n\n") ||
        phase1Json.output || "No content returned.";

      setQuizDraft((current) => ({ ...current, result: "Phase 2: Self-critique and refining..." }));

      const phase2Prompt = `Here is a drafted USMLE Step 1 clinical vignette:

${phase1Text}

Critically review the MCQ:
1. Real clinical scenario or pseudovignette?
2. All distractors plausible but definitively incorrect?
3. Correct answer aligns with Step 1 cognitive levels?
4. Rewrite if any issues. Output final compiled vignette and explanations only.`;

      const phase2Res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: state.aiSettings.model,
          max_tokens: 1200,
          messages: [{ role: "user", content: phase2Prompt }]
        })
      });

      if (!phase2Res.ok) throw new Error(`Phase 2 failed: ${phase2Res.status}`);
      const phase2Json = await phase2Res.json();
      const phase2Text =
        phase2Json.content?.map((item) => item.text).filter(Boolean).join("\n\n") ||
        phase2Json.output || "No content returned.";

      setQuizDraft((current) => ({
        ...current,
        loading: false,
        result: phase2Text
      }));
    } catch (error) {
      setQuizDraft((current) => ({
        ...current,
        loading: false,
        result: "",
        error: error.message || "Quiz generation failed. Check your proxy or direct API settings."
      }));
    }
  }

  function addInboxItem(event) {
    event.preventDefault();
    if (!inboxDraft.trim()) return;

    const nextInbox = [
      {
        id: crypto.randomUUID(),
        text: inboxDraft,
        createdAt: new Date().toISOString()
      },
      ...commandCenterSnapshot.inbox
    ];

    writeStorageJson(COMMAND_CENTER_STORAGE_KEY, {
      ...commandCenterSnapshot,
      inbox: nextInbox
    });

    setInboxDraft("");
  }

  async function syncAnkiCards(event) {
    event.preventDefault();
    if (!ankiQids.trim()) return;

    setAnkiSyncStatus({ tone: "text-mist", message: "Searching Anki..." });
    const qids = ankiQids.split(",").map(id => id.trim()).filter(Boolean);
    if (!qids.length) {
      setAnkiSyncStatus({ tone: "text-coral", message: "No valid QIDs found." });
      return;
    }

    const query = qids.map(qid => `"tag:#AK_Step1_v12::#UWorld::Step::${qid}"`).join(" OR ");

    try {
      const findRes = await fetch("http://localhost:8765", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          action: "findCards",
          version: 6,
          params: { query }
        })
      });
      if (!findRes.ok) throw new Error("AnkiConnect unreachable");
      const findData = await findRes.json();
      if (findData.error) throw new Error(findData.error);

      const cardIds = findData.result;
      if (!cardIds || cardIds.length === 0) {
        setAnkiSyncStatus({ tone: "text-amber", message: `No AnKing cards found for those QIDs.` });
        return;
      }

      const suspendRes = await fetch("http://localhost:8765", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          action: "unsuspend",
          version: 6,
          params: { cards: cardIds }
        })
      });
      const suspendData = await suspendRes.json();
      if (suspendData.error) throw new Error(suspendData.error);

      setAnkiSyncStatus({ tone: "text-mint", message: `${cardIds.length} AnKing cards unsuspended successfully.` });
      setAnkiQids("");
    } catch (error) {
       console.error(error);
       setAnkiSyncStatus({ tone: "text-coral", message: "Failed: Open Anki + install AnkiConnect (addon 2055492159)" });
    }
  }

  async function pushToCloud() {
    if (!cloudSettings.projectUrl || !cloudSettings.anonKey || !cloudSettings.syncKey) {
      setSyncStatus({
        tone: "text-coral",
        message: "Add project URL, anon key, and sync key first."
      });
      return;
    }

    setSyncStatus({ tone: "text-mist", message: "Pushing snapshot..." });

    try {
      await pushCloudSnapshot(cloudSettings, buildCombinedBackup());
      const updatedSettings = {
        ...cloudSettings,
        lastPushedAt: new Date().toISOString()
      };
      setCloudSettings(updatedSettings);
      setSyncStatus({
        tone: "text-mint",
        message: "Cloud snapshot pushed."
      });
    } catch (error) {
      setSyncStatus({
        tone: "text-coral",
        message: error.message || "Cloud push failed."
      });
    }
  }

  async function pullFromCloud() {
    if (!cloudSettings.projectUrl || !cloudSettings.anonKey || !cloudSettings.syncKey) {
      setSyncStatus({
        tone: "text-coral",
        message: "Add project URL, anon key, and sync key first."
      });
      return;
    }

    setSyncStatus({ tone: "text-mist", message: "Pulling snapshot..." });

    try {
      const response = await pullCloudSnapshot(cloudSettings);
      const payload = normalizeImportedBackup(response.payload);

      if (!payload?.warRoom) {
        throw new Error("No remote payload found for that sync key.");
      }

      setState(hydrateWarRoomState(payload.warRoom, sections));

      if (payload.commandCenter) {
        writeStorageJson(COMMAND_CENTER_STORAGE_KEY, payload.commandCenter);
      }

      if (payload.syncSettings) {
        setCloudSettings(hydrateCloudSyncSettings(payload.syncSettings));
      }

      const updatedSettings = {
        ...cloudSettings,
        lastPulledAt: new Date().toISOString()
      };
      setCloudSettings(updatedSettings);
      setSyncStatus({
        tone: "text-mint",
        message: "Cloud snapshot pulled."
      });
    } catch (error) {
      setSyncStatus({
        tone: "text-coral",
        message: error.message || "Cloud pull failed."
      });
    }
  }

  function submitCoachCheckIn() {
    if (!coachCheckIn.energy || !coachCheckIn.hours || !coachCheckIn.blockers) return;

    const nextDailyStart = {
      ...dailyCoachInputs,
      energy: coachCheckIn.energy,
      availableHours: Number(coachCheckIn.hours),
      note: coachCheckIn.blockers === "Clear" ? "" : coachCheckIn.blockers,
      date: today
    };
    const nextPlan = generateCoachingPlan({
      warRoomState: {
        ...state,
        dailyStart: nextDailyStart,
        dailyPlan: {
          ...(state.dailyPlan || {}),
          date: today
        }
      },
      commandCenterState: commandCenterSnapshot,
      sections,
      topics,
      forceRegenerate: true
    });

    patchState({
      dailyStart: nextDailyStart,
      dailyPlan: {
        date: today,
        primarySectionId: nextPlan.focus.primary.section.id,
        generatedAt: new Date().toISOString(),
        snapshot: nextPlan
      }
    });

    setShowCoachPlan(true);
  }

  function openCoachAdjustments() {
    setCoachCheckIn({
      energy: coachPlan.inputs?.energy || dailyCoachInputs.energy,
      hours: normalizeCoachHourSelection(
        coachPlan.inputs?.availableHours ?? dailyCoachInputs.availableHours
      ),
      blockers: coachPlan.inputs?.note || dailyCoachInputs.note || "Clear"
    });
    setShowCoachPlan(false);
  }

  function completeResourceTask(task) {
    const sectionId = coachPlan.focus.primary.section.id;

    patchState((current) => {
      if (current.completedResources?.includes(task.id)) {
        return current;
      }

      const nextCompletedResources = [...(current.completedResources || []), task.id];
      const nextSystemProgress = {
        ...current.systemProgress,
        [sectionId]: {
          ...current.systemProgress[sectionId],
          lastStudied: today
        }
      };
      let nextDoneTopics = current.doneTopics;

      if (task.title.startsWith("First Aid:")) {
        nextSystemProgress[sectionId] = {
          ...nextSystemProgress[sectionId],
          faRead: true
        };
        const relatedTopics = topics
          .filter((topic) => topic.sectionId === sectionId)
          .map((topic) => topic.title);
        nextDoneTopics = Array.from(new Set([...(current.doneTopics || []), ...relatedTopics]));
      }

      if (task.title.startsWith("Pathoma:")) {
        nextSystemProgress[sectionId] = {
          ...nextSystemProgress[sectionId],
          pathomaDone: true
        };
      }

      if (task.title.startsWith("Sketchy")) {
        nextSystemProgress[sectionId] = {
          ...nextSystemProgress[sectionId],
          sketchyDone: true
        };
      }

      return {
        completedResources: nextCompletedResources,
        doneTopics: nextDoneTopics,
        systemProgress: nextSystemProgress
      };
    });
  }

  // --- NEW SPRINT 2 TABS ---

  const renderCoachTab = () => {
    const blockerOptions = ["Clear", "Family", "Work", "Family + Work"];
    const visiblePlan = hasLockedPlanToday ? state.dailyPlan?.snapshot || coachPlan : showCoachPlan ? coachPlan : null;

    return (
      <div className="space-y-6">
        <section className="panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <SectionTitle
              eyebrow="Coach"
              title="Daily check-in"
              body="Give the planner your real energy, real hours, and the blocker that matters most."
            />
            {hasLockedPlanToday ? (
              <button type="button" className="button-secondary" onClick={openCoachAdjustments}>
                Adjust & Regenerate
              </button>
            ) : null}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Energy</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { value: "low", label: "😴 Low" },
                    { value: "medium", label: "😐 Medium" },
                    { value: "high", label: "⚡ High" }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setCoachCheckIn((current) => ({
                          ...current,
                          energy: option.value
                        }))
                      }
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        coachCheckIn.energy === option.value
                          ? "bg-coral text-white"
                          : "border border-line bg-white/5 text-slate-200 hover:border-amber/40"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Available hours</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CHECK_IN_HOUR_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setCoachCheckIn((current) => ({
                          ...current,
                          hours: option.value
                        }))
                      }
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        coachCheckIn.hours === option.value
                          ? "bg-coral text-white"
                          : "border border-line bg-white/5 text-slate-200 hover:border-amber/40"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Primary blocker</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {blockerOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setCoachCheckIn((current) => ({
                          ...current,
                          blockers: option
                        }))
                      }
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        coachCheckIn.blockers === option
                          ? "bg-coral text-white"
                          : "border border-line bg-white/5 text-slate-200 hover:border-amber/40"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" className="button-primary" onClick={submitCoachCheckIn}>
                Generate Today&apos;s Plan
              </button>
            </div>

            <div className="panel-soft p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Current read</p>
              <div className="mt-3 space-y-3 text-sm text-slate-300">
                <p>
                  Energy: <span className="font-semibold text-white">{dailyCoachInputs.energy}</span>
                </p>
                <p>
                  Hours: <span className="font-semibold text-white">{formatCoachHours(dailyCoachInputs.availableHours)}</span>
                </p>
                <p>
                  Calendar pressure: <span className="font-semibold text-white">{todaysEvents.length} protected blocks</span>
                </p>
                <p className="leading-6 text-mist">{coachPlan.message}</p>
              </div>
            </div>
          </div>
        </section>

        {visiblePlan ? (
          <section className="panel p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-teal">YOUR PLAN</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-line bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Opening line</p>
                  <p className="mt-2 text-lg font-semibold text-white">{visiblePlan.message}</p>
                </div>
                {visiblePlan.tasks?.map((task) => (
                  <div key={task.id || task.title} className="rounded-2xl border border-line bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{task.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{task.detail}</p>
                      </div>
                      {task.minutes ? (
                        <span className="rounded-full border border-teal/20 px-3 py-1 text-xs text-teal">
                          {task.minutes} min
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-line bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Next 30</p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {visiblePlan.nextThirty?.title || "No quick task generated"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {visiblePlan.nextThirty?.detail || "The first meaningful move shows up here after check-in."}
                  </p>
                </div>
                <div className="rounded-2xl border border-line bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Recovery mode</p>
                  <p className="mt-2 text-base font-semibold text-white">{visiblePlan.recovery.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {visiblePlan.recovery.targetMinutes} target minutes · {visiblePlan.phase.label}
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    );
  };

  const renderHQTab = () => {
    const weakSystems = coachPlan.priorityWeaknesses?.length
      ? coachPlan.priorityWeaknesses
      : systemChartData
          .filter((sys) => sys.questions > 0)
          .sort((a, b) => a.accuracy - b.accuracy)
          .slice(0, 3)
          .map((sys) => ({
            sectionId: sys.id,
            section: { name: sys.section },
            totalCount: sys.accuracy,
            criticalGap: false,
            nbmeHits: 0
          }));
    const readinessPanel = coachPlan.examReadiness;
    const nextMove =
      coachPlan.nextBestMove?.recommendation?.name ||
      coachPlan.nextBestMove?.gates?.[0]?.message ||
      "Generate your first block.";
    const nextMoveDetail =
      coachPlan.nextBestMove?.recommendation?.notes ||
      coachPlan.nextBestMove?.gates?.[0]?.message ||
      "Setup daily plan in Command Center.";

    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Block 1: Readiness Status */}
          <section className="panel-soft p-6">
            <h2 className="text-xs uppercase tracking-[0.2em] text-mist font-semibold">1. Exam Readiness</h2>
            <div className={`mt-4 text-3xl font-bold ${readinessPanel.tone}`}>{readinessPanel.status}</div>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {readinessPanel.reasons?.map((reason, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className={readinessPanel.tone}>•</span> {reason}
                </li>
              ))}
            </ul>
          </section>

          {/* Block 2: Weak Systems Heatmap */}
          <section className="panel-soft p-6">
            <h2 className="text-xs uppercase tracking-[0.2em] text-mist font-semibold">2. Priority Weaknesses</h2>
            <div className="mt-4 space-y-3">
              {weakSystems.length > 0 ? (
                weakSystems.map((sys) => (
                  <div
                    key={sys.sectionId}
                    className="flex items-center justify-between border-b border-white/5 pb-2 text-sm"
                    data-priority-weakness="true"
                  >
                    <div>
                      <span className="font-semibold text-white">{sys.section.name}</span>
                      {sys.criticalGap ? (
                        <span className="ml-2 rounded-full border border-coral/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-coral">
                          Critical gap
                        </span>
                      ) : null}
                    </div>
                    <span className="font-mono text-coral">
                      {sys.totalCount}
                      {sys.nbmeHits ? ` (${sys.nbmeHits} NBMEs)` : "%"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-mist italic">Not enough UWorld data yet.</div>
              )}
               <button onClick={() => updateActiveTab("systems")} className="text-xs text-teal mt-2 underline">View all systems</button>
            </div>
          </section>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Block 3: Next Best Study Move */}
          <section className="panel-soft p-6 border-l-4 border-l-teal/50">
            <h2 className="text-xs uppercase tracking-[0.2em] text-teal font-semibold">3. Next Best Move</h2>
            <p className="mt-4 text-2xl font-bold text-white leading-tight">{nextMove}</p>
            <p className="mt-2 text-mist text-sm">{nextMoveDetail}</p>
            {coachPlan.nextBestMove?.alternatives?.length ? (
              <div className="mt-4 space-y-1 text-xs text-slate-400">
                {coachPlan.nextBestMove.alternatives.map((resource) => (
                  <p key={resource.id}>Then: {resource.name}</p>
                ))}
              </div>
            ) : null}
          </section>

          {/* Block 4: Assessment Timeline */}
          <section className="panel-soft p-6">
            <h2 className="text-xs uppercase tracking-[0.2em] text-mist font-semibold">4. Assessment Timeline</h2>
            <div className="mt-4 space-y-3 text-sm">
               {[...state.assessments].sort((a,b) => b.date.localeCompare(a.date)).slice(0,3).map(assessment => (
                 <div key={assessment.id} className="flex justify-between border-b border-white/5 pb-2">
                   <span className="font-semibold text-slate-200">{assessment.label}</span>
                   <span className="text-slate-400 font-mono">{assessment.epc}%</span>
                 </div>
               ))}
               {state.assessments.length === 0 && (
                 <div className="text-mist italic">No NBMEs taken yet.</div>
               )}
               <button onClick={() => updateActiveTab("nbmes")} className="text-xs text-teal mt-2 underline">Log new NBME</button>
            </div>
          </section>
        </div>
      </div>
    );
  };

  const renderSystemsTab = () => (
    <div className="space-y-6">
       <section className="panel p-5 sm:p-6">
        <SectionTitle eyebrow="Mapping" title="System Progress" body="Visualizing UWorld completions and First Aid reads." />
        <div className="mt-6 flex flex-wrap gap-4">
          <button type="button" className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${!selectedTopic ? "bg-teal text-ink" : "bg-white/5 hover:bg-white/10"}`} onClick={() => setSelectedTopic(null)}>
            All Systems Map
          </button>
        </div>
        {!selectedTopic && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {systemChartData.map((sys) => (
              <div key={sys.id} className="panel-soft p-4 border border-line cursor-pointer" onClick={() => setSelectedTopic(topics.find(t => t.sectionId === sys.id))}>
                <div className="flex justify-between">
                   <span className="font-semibold text-white">{sys.section}</span>
                   <span className="font-mono text-amber">{sys.accuracy}%</span>
                </div>
                <div className="mt-2 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-teal" style={{width: `${sys.completion}%`}} />
                </div>
              </div>
            ))}
          </div>
        )}
       </section>
    </div>
  );

  const renderUWorldTab = () => (
    <div className="space-y-6">
      <section className="panel p-5">
         <SectionTitle eyebrow="UWorld" title="Execution Logs" body="Record block accuracy and review fatigue." />
         <div className="mt-6 flex gap-3 h-40 items-end">
            {week.map((entry) => {
              const height = entry.questions ? Math.max(20, entry.questions * 2) : 14;
              return (
                <div key={entry.key} className="flex flex-1 flex-col items-center gap-2">
                  <div className="text-[11px] text-slate-400">{entry.questions || 0}</div>
                  <div
                    className={`w-full rounded-t-2xl bg-sky-500/80`}
                    style={{ height }}
                  />
                  <div className="font-mono text-[11px] text-slate-500">
                    {new Date(`${entry.key}T12:00:00`).toLocaleDateString("en-US", { weekday: "narrow" })}
                  </div>
                </div>
              );
            })}
         </div>
         <div className="mt-6">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead><tr className="border-b border-line pb-2 text-mist"><th className="pb-3">Section</th><th className="pb-3">Qs</th><th className="pb-3">Correct</th></tr></thead>
              <tbody>
                {bulkRows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2">
                       <select className="field bg-transparent border-none py-1 h-auto" value={row.sectionId} onChange={(e) => updateBulkRow(row.id, "sectionId", e.target.value)}>
                         {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                       </select>
                    </td>
                    <td className="py-2"><input type="number" className="w-16 bg-transparent text-white border-b border-line px-2" value={row.questions} onChange={(e) => updateBulkRow(row.id, "questions", e.target.value)} /></td>
                    <td className="py-2"><input type="number" className="w-16 bg-transparent text-white border-b border-line px-2" value={row.correct} onChange={(e) => updateBulkRow(row.id, "correct", e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={applyBulkLog} className="button-primary mt-4">Save block</button>
         </div>
      </section>
    </div>
  );

  const renderNBMEsTab = () => (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionTitle
            eyebrow="Assessments"
            title="NBME Tracker"
            body="Log the score first, then force a post-NBME analysis before the next week drifts."
          />
          <div className="flex gap-2">
            {[
              { id: "scores", label: "Scores" },
              { id: "analysis", label: "Post-NBME Analysis" }
            ].map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setNbmeView(entry.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  nbmeView === entry.id
                    ? "bg-coral text-white"
                    : "border border-line bg-white/5 text-slate-200 hover:border-amber/40"
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        {nbmeView === "scores" ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
            <form className="space-y-4" onSubmit={addAssessment}>
              <div>
                <label className="mb-1 block text-xs uppercase text-mist">Assessment Name</label>
                <select
                  className="field w-full"
                  aria-label="Assessment Name"
                  value={assessmentDraft.label}
                  onChange={(event) =>
                    setAssessmentDraft({ ...assessmentDraft, label: event.target.value })
                  }
                >
                  {["NBME 25", "NBME 26", "NBME 27", "NBME 28", "NBME 29", "NBME 30", "NBME 31", "Free120"].map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-mist">Date</label>
                <input
                  type="date"
                  className="field w-full"
                  aria-label="Assessment Date"
                  value={assessmentDraft.date}
                  onChange={(event) =>
                    setAssessmentDraft({ ...assessmentDraft, date: event.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-mist">Percentage Score</label>
                <input
                  type="number"
                  className="field w-full"
                  aria-label="Percentage Score"
                  min="0"
                  max="100"
                  value={assessmentDraft.epc}
                  onChange={(event) =>
                    setAssessmentDraft({ ...assessmentDraft, epc: event.target.value })
                  }
                  placeholder="e.g. 68"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-mist">Notes</label>
                <textarea
                  className="field min-h-24"
                  aria-label="Assessment Notes"
                  value={assessmentDraft.notes}
                  onChange={(event) =>
                    setAssessmentDraft({ ...assessmentDraft, notes: event.target.value })
                  }
                  placeholder="Optional note about testing conditions or timing."
                />
              </div>
              <button type="submit" className="button-primary w-full mt-4">
                Log Assessment
              </button>
            </form>

            <div>
              <p className="mb-4 font-semibold text-white">Past scores</p>
              <div className="space-y-2">
                {[...state.assessments]
                  .sort((left, right) => right.date.localeCompare(left.date))
                  .map((assessment) => (
                    <button
                      key={assessment.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-line bg-white/5 p-3 text-left text-sm transition hover:border-teal/30"
                      onClick={() => {
                        if (assessment.kind === "NBME" || assessment.label.startsWith("NBME")) {
                          selectNbmeForAnalysis(assessment.id);
                          setNbmeView("analysis");
                        }
                      }}
                    >
                      <span>
                        <span className="font-semibold text-slate-100">{assessment.label}</span>
                        <span className="ml-2 text-xs text-slate-400">{assessment.date}</span>
                      </span>
                      <span className="font-mono text-teal">{assessment.epc}%</span>
                    </button>
                  ))}
                {state.assessments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-line p-5 text-sm text-mist">
                    No assessments logged yet.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
            <form className="space-y-5" onSubmit={saveNbmeAnalysis} data-nbme-analysis-form="true">
              <div>
                <label className="mb-1 block text-xs uppercase text-mist">NBME Form</label>
                <select
                  className="field w-full"
                  aria-label="NBME Form"
                  value={nbmeAnalysisDraft.nbmeId}
                  onChange={(event) => selectNbmeForAnalysis(event.target.value)}
                >
                  <option value="">Select a logged NBME</option>
                  {nbmeAssessments.map((assessment) => (
                    <option key={assessment.id} value={assessment.id}>
                      {assessment.label} · {assessment.date}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs uppercase text-mist">Date</label>
                  <input
                    type="date"
                    className="field w-full"
                    aria-label="Analysis Date"
                    value={nbmeAnalysisDraft.date}
                    onChange={(event) =>
                      setNbmeAnalysisDraft((current) => ({
                        ...current,
                        date: event.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase text-mist">Percentage</label>
                  <input
                    type="number"
                    className="field w-full"
                    aria-label="Analysis Percentage"
                    min="0"
                    max="100"
                    value={nbmeAnalysisDraft.percentCorrect}
                    onChange={(event) =>
                      setNbmeAnalysisDraft((current) => ({
                        ...current,
                        percentCorrect: event.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase text-mist">Total Questions</label>
                  <input
                    type="number"
                    className="field w-full"
                    aria-label="Total Questions"
                    min="1"
                    value={nbmeAnalysisDraft.totalQuestions}
                    onChange={(event) =>
                      setNbmeAnalysisDraft((current) => ({
                        ...current,
                        totalQuestions: event.target.value
                      }))
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Now categorize your wrong answers</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs uppercase text-mist">Trick Question</label>
                    <input
                      type="number"
                      className="field w-full"
                      aria-label="Trick Question"
                      min="0"
                      value={nbmeAnalysisDraft.trickQuestions}
                      onChange={(event) =>
                        setNbmeAnalysisDraft((current) => ({
                          ...current,
                          trickQuestions: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase text-mist">Carelessness</label>
                    <input
                      type="number"
                      className="field w-full"
                      aria-label="Carelessness"
                      min="0"
                      value={nbmeAnalysisDraft.carelessness}
                      onChange={(event) =>
                        setNbmeAnalysisDraft((current) => ({
                          ...current,
                          carelessness: event.target.value
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Knowledge Gap</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Map the missed concepts to systems. This is what drives tomorrow&apos;s target block.
                    </p>
                  </div>
                  <button type="button" className="button-secondary" onClick={addKnowledgeGapRow}>
                    Add System
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {nbmeAnalysisDraft.knowledgeGaps.map((row) => (
                    <div key={row.id} className="grid gap-3 sm:grid-cols-[1fr,120px,auto]">
                      <select
                        className="field w-full"
                        value={row.system}
                        onChange={(event) => updateKnowledgeGapRow(row.id, "system", event.target.value)}
                      >
                        {sections.map((section) => (
                          <option key={section.id} value={section.id}>
                            {section.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="field w-full"
                        aria-label="Knowledge Gap Count"
                        min="0"
                        value={row.count}
                        onChange={(event) => updateKnowledgeGapRow(row.id, "count", event.target.value)}
                        placeholder="Count"
                      />
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => removeKnowledgeGapRow(row.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="button-primary" data-save-nbme-analysis="true">
                Save Analysis
              </button>
            </form>

            <div className="space-y-4">
              <div className="panel-soft p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Critical Gaps</p>
                <div className="mt-3 space-y-2">
                  {coachPlan.criticalGaps?.length ? (
                    coachPlan.criticalGaps.map((gap) => (
                      <div key={gap.sectionId} className="rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-slate-100">
                        {gap.section.name} has appeared across {gap.nbmeHits} NBMEs.
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-mist">No repeated weak system yet.</p>
                  )}
                </div>
              </div>

              <div className="panel-soft p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Saved Analyses</p>
                <div className="mt-3 space-y-3">
                  {(state.nbmeAnalyses || []).map((entry) => {
                    const relatedAssessment = nbmeAssessments.find((assessment) => assessment.id === entry.nbmeId);

                    return (
                      <article
                        key={entry.nbmeId}
                        className="rounded-2xl border border-line bg-slate-950/40 p-4"
                        data-nbme-analysis-card="true"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-white">
                            {relatedAssessment?.label || entry.nbmeId}
                          </p>
                          <span className="font-mono text-teal">{entry.percentCorrect}%</span>
                        </div>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-mist">{entry.date}</p>
                        <div className="mt-3 space-y-2 text-sm text-slate-300">
                          <p>Trick questions: {entry.analysis?.trickQuestions || 0}</p>
                          <p>Carelessness: {entry.analysis?.carelessness || 0}</p>
                          <div className="flex flex-wrap gap-2">
                            {(entry.analysis?.knowledgeGaps || []).map((gap) => {
                              const section = sections.find((item) => item.id === gap.system);

                              return (
                                <span
                                  key={`${entry.nbmeId}-${gap.system}`}
                                  className="rounded-full border border-teal/20 px-3 py-1 text-xs text-teal"
                                >
                                  {section?.name || gap.system}: {gap.count}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  {!state.nbmeAnalyses?.length ? (
                    <div className="rounded-2xl border border-dashed border-line p-5 text-sm text-mist">
                      No post-NBME analysis saved yet.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );

  const renderToolsPanels = () => (
    <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
      <section className="panel p-5 sm:p-6">
        <SectionTitle
          eyebrow="Incorrects"
          title="Anki bridge"
          body="Unsuspend tagged AnKing cards from recent UWorld QIDs when you want spaced repetition to follow misses."
        />
        <form className="mt-5 space-y-4" onSubmit={syncAnkiCards}>
          <div>
            <label className="mb-1 block text-xs uppercase text-mist" htmlFor="anki-qids">
              UWorld QIDs
            </label>
            <input
              id="anki-qids"
              className="field"
              value={ankiQids}
              onChange={(event) => setAnkiQids(event.target.value)}
              placeholder="e.g. 1332, 1884, 2059"
            />
          </div>
          <button type="submit" className="button-primary">
            Sync to Anki
          </button>
          <p className={`text-sm ${ankiSyncStatus.tone}`}>{ankiSyncStatus.message}</p>
        </form>
      </section>

      <section className="panel p-5 sm:p-6">
        <SectionTitle
          eyebrow="Cloud"
          title="Remote snapshot"
          body="Optional Supabase Edge sync for cross-device copies. Local backup/export stays the primary safety net."
        />
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase text-mist" htmlFor="cloud-project-url">
              Project URL
            </label>
            <input
              id="cloud-project-url"
              className="field"
              value={cloudSettings.projectUrl}
              onChange={(event) =>
                setCloudSettings((current) => ({
                  ...current,
                  projectUrl: event.target.value
                }))
              }
              placeholder="https://your-project.supabase.co"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase text-mist" htmlFor="cloud-anon-key">
              Anon Key
            </label>
            <input
              id="cloud-anon-key"
              className="field"
              value={cloudSettings.anonKey}
              onChange={(event) =>
                setCloudSettings((current) => ({
                  ...current,
                  anonKey: event.target.value
                }))
              }
              placeholder="Paste the public anon key"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase text-mist" htmlFor="cloud-sync-key">
              Sync Key
            </label>
            <input
              id="cloud-sync-key"
              className="field"
              value={cloudSettings.syncKey}
              onChange={(event) =>
                setCloudSettings((current) => ({
                  ...current,
                  syncKey: event.target.value
                }))
              }
              placeholder="Private snapshot identifier"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" className="button-primary" onClick={pushToCloud}>
              Push Snapshot
            </button>
            <button type="button" className="button-secondary" onClick={pullFromCloud}>
              Pull Snapshot
            </button>
          </div>

          <div className="rounded-2xl border border-line bg-white/5 p-4 text-sm text-slate-300">
            <p className={syncStatus.tone}>{syncStatus.message || "No cloud action yet."}</p>
            <p className="mt-2 text-mist">
              Last push: {cloudSettings.lastPushedAt || "never"} · Last pull:{" "}
              {cloudSettings.lastPulledAt || "never"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );

  const renderIncorrectsTab = () => (
    <div className="space-y-6">
       {renderToolsPanels()}
    </div>
  );

  const renderMapTab = () => (
    <WarMapPanel
      warRoomState={state}
      commandCenterState={commandCenterSnapshot}
      momentum={latestMomentum}
    />
  );

  return (
    <div className="space-y-6">
      <MilestoneCelebration
        milestone={celebration}
        soundEnabled={Boolean(commandCenterSnapshot.settings?.celebrationSoundEnabled)}
        onDone={() => setCelebration(null)}
      />
      {tab !== "coach" ? (
        <CoachStatusPanel plan={coachPlan} onReturnToCoach={() => updateActiveTab("coach")} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => updateActiveTab(entry.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                tab === entry.id
                  ? "bg-coral text-white"
                  : "border border-line bg-white/5 text-slate-200 hover:border-amber/40"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <SettingsPanel />
      </div>

      {tab === "coach" && renderCoachTab()}
      {tab === "hq" && renderHQTab()}
      {tab === "systems" && renderSystemsTab()}
      {tab === "uworld" && renderUWorldTab()}
      {tab === "nbmes" && renderNBMEsTab()}
      {tab === "incorrects" && renderIncorrectsTab()}
      {tab === "map" && renderMapTab()}
    </div>
  );
}
