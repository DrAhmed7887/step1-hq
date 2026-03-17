import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import avatarAttack from "../assets/doc/attack.png";
import avatarExhausted from "../assets/doc/exhausted.png";
import avatarReady from "../assets/doc/ready.png";
import MilestoneCelebration from "../components/journey/MilestoneCelebration";
import MomentumMeter from "../components/journey/MomentumMeter";
import Card from "../components/ui/Card";
import { sections, topics } from "../data/warRoomData";
import {
  BACKUP_META_STORAGE_KEY,
  createBackupMeta,
  dismissBackupReminder,
  hydrateBackupMeta,
  resolveBackupReminder
} from "../lib/appBackup";
import {
  COMMAND_CENTER_STORAGE_KEY,
  TRACK_DEFINITIONS,
  createCommandCenterState,
  eventsForDate,
  getTrackDefinition,
  hydrateCommandCenterState
} from "../lib/commandCenter";
import { generateCoachingPlan } from "../lib/coachingEngine";
import { getQuoteByKey, pickContextualQuote, quoteKey } from "../lib/coachQuotes";
import {
  MANUAL_MILESTONE_LABELS,
  THREAD_COLORS,
  calculateNextMomentum,
  getLatestMomentum,
  getMilestoneStatus,
  getNewMilestones,
  getMostRecentCheckIn,
  resolveAvatarPose,
  resolveQuoteCategory,
  resolveSessionType
} from "../lib/journey";
import { usePersistentState, useStorageJson, writeStorageJson } from "../lib/persistence";
import { getUWorldCompletionPct } from "../lib/resourceProgress";
import {
  WAR_ROOM_STORAGE_KEY,
  createWarRoomState,
  hydrateWarRoomState,
  todayKey
} from "../lib/warRoom";

const AVATAR_BY_POSE = {
  exhausted: avatarExhausted,
  ready: avatarReady,
  attack: avatarAttack
};

const ENERGY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" }
];

const HOUR_OPTIONS = [
  { value: "0.5", label: "0-1h" },
  { value: "2", label: "2h" },
  { value: "3", label: "3h" },
  { value: "4.5", label: "4+h" }
];

const MANUAL_MILESTONE_BY_ID = {
  "python-course-finished": "pythonCourseFinished",
  "nlv-visa-submitted": "nlvVisaSubmitted",
  "scholarship-applied": "scholarshipApplied",
  "rwth-enrollment-confirmed": "rwthEnrollmentConfirmed",
  "arrival-in-germany": "arrivalInGermany"
};

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function formatLongDate(dateKey) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

function formatEventRange(event) {
  if (!event.start && !event.end) {
    return "Floating";
  }

  return [event.start, event.end].filter(Boolean).join(" - ");
}

function sortOpenTodos(todos) {
  const priorityWeight = {
    high: 0,
    medium: 1,
    low: 2
  };

  return [...todos]
    .filter((todo) => todo.status !== "done")
    .sort((left, right) => {
      if (priorityWeight[left.priority] !== priorityWeight[right.priority]) {
        return priorityWeight[left.priority] - priorityWeight[right.priority];
      }

      if (left.urgency !== right.urgency) {
        return right.urgency - left.urgency;
      }

      return (left.dueDate || "9999-99-99").localeCompare(right.dueDate || "9999-99-99");
    });
}

function mapEnergyToLogValue(energy) {
  if (energy === "high") {
    return 4;
  }

  if (energy === "low") {
    return 2;
  }

  return 3;
}

function findLatestQuoteKey(checkIns) {
  const latest = Object.values(checkIns || {})
    .filter((entry) => entry?.quoteKey)
    .sort((left, right) => right.date.localeCompare(left.date))[0];

  return latest?.quoteKey || "";
}

function milestoneHint(milestone, warRoomState) {
  if (milestone.complete) {
    return "Complete";
  }

  switch (milestone.id) {
    case "first-nbme":
      return "Log the first NBME in War Room.";
    case "uworld-50":
      return `${Math.round(getUWorldCompletionPct(warRoomState))}% of UWorld logged`;
    case "usmle-exam-day":
      return `Exam date: ${warRoomState.examDate}`;
    default:
      return "Manual milestone";
  }
}

function buildGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return {
      title: "Good morning, Doctor.",
      tone: "Your calmest hour matters most. Start before the day starts negotiating."
    };
  }

  if (hour >= 12 && hour < 18) {
    return {
      title: "Good afternoon, Doctor.",
      tone: "Reset the line. A strong middle of the day can still carry the whole plan."
    };
  }

  if (hour >= 18 && hour < 23) {
    return {
      title: "Good evening, Doctor.",
      tone: "Keep the room quiet, keep the task list small, and make the next hour count."
    };
  }

  return {
    title: "Late night grind?",
    tone: "Protect the essentials. Precision beats forcing one more tired block."
  };
}

function resolveTaskVariant(task) {
  const title = String(task?.title || "").toLowerCase();

  if (title.includes("uworld")) {
    return "success";
  }

  if (title.includes("fa") || title.includes("first aid") || title.includes("pathoma")) {
    return "calm";
  }

  if (title.includes("anki")) {
    return "warning";
  }

  return "default";
}

export default function CommandCenterPage() {
  const [state, setState] = usePersistentState(
    COMMAND_CENTER_STORAGE_KEY,
    createCommandCenterState,
    hydrateCommandCenterState
  );
  const warRoomState = useStorageJson(
    WAR_ROOM_STORAGE_KEY,
    () => createWarRoomState(sections),
    (saved) => hydrateWarRoomState(saved, sections)
  );

  const today = todayKey();
  const todayReflection = state.reflections.find((entry) => entry.date === today) || null;
  const todayCheckIn = state.checkIns[today] || null;
  const latestMomentum = todayCheckIn?.momentum ?? getLatestMomentum(state.checkIns);
  const todaysEvents = eventsForDate(state.events || [], today);
  const openTodos = sortOpenTodos(state.todos || []);
  const topThree = openTodos.slice(0, 3);
  const milestoneStatus = getMilestoneStatus({
    warRoomState,
    commandCenterState: state,
    today
  });
  const todaysQuote = todayCheckIn?.quoteKey ? getQuoteByKey(todayCheckIn.quoteKey) : null;
  const todaysCoachPlan =
    warRoomState.dailyPlan?.date === today ? warRoomState.dailyPlan.snapshot || null : null;
  const backupMeta = useStorageJson(
    BACKUP_META_STORAGE_KEY,
    createBackupMeta,
    hydrateBackupMeta
  );
  const backupReminder = resolveBackupReminder(backupMeta, new Date(`${today}T12:00:00`));
  const [checkInDraft, setCheckInDraft] = useState({
    energy: todayCheckIn?.energy || "medium",
    hours: String(todayCheckIn?.hours || 2)
  });
  const [reflectionDraft, setReflectionDraft] = useState("");
  const [closePromptOpen, setClosePromptOpen] = useState(false);
  const [growthLogOpen, setGrowthLogOpen] = useState(false);
  const [reflectionFlash, setReflectionFlash] = useState(false);
  const [celebration, setCelebration] = useState(null);

  useEffect(() => {
    setCheckInDraft({
      energy: todayCheckIn?.energy || "medium",
      hours: String(todayCheckIn?.hours || 2)
    });
  }, [todayCheckIn?.energy, todayCheckIn?.hours]);

  useEffect(() => {
    if (topThree.length === 0 && !todayReflection) {
      setClosePromptOpen(true);
    }
  }, [todayReflection, topThree.length]);

  useEffect(() => {
    const freshMilestones = getNewMilestones({
      warRoomState,
      commandCenterState: state,
      today
    });

    if (!freshMilestones.length) {
      return;
    }

    setState((current) => ({
      ...current,
      milestonesCompleted: Array.from(
        new Set([...(current.milestonesCompleted || []), ...freshMilestones.map((entry) => entry.id)])
      )
    }));
    setCelebration(freshMilestones[0]);
  }, [
    setState,
    state,
    state.manualMilestones,
    state.milestonesCompleted,
    today,
    warRoomState,
    warRoomState.assessments,
    warRoomState.examDate,
    warRoomState.totalQuestions
  ]);

  function submitCheckIn(event) {
    event.preventDefault();

    const hours = Number(checkInDraft.hours || 0);
    const sessionType = resolveSessionType(hours);
    const quoteCategory = resolveQuoteCategory({
      hours,
      energy: checkInDraft.energy
    });
    const momentum = calculateNextMomentum(state.checkIns, today, sessionType);
    const quote = pickContextualQuote(
      quoteCategory,
      findLatestQuoteKey(state.checkIns)
    );

    const nextEntry = {
      date: today,
      energy: checkInDraft.energy,
      hours,
      sessionType,
      quoteCategory,
      quoteKey: quote ? quoteKey(quote) : "",
      momentum,
      createdAt: todayCheckIn?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const nextCommandCenterState = {
      ...state,
      checkIns: {
        ...state.checkIns,
        [today]: nextEntry
      },
      energyLog: {
        ...state.energyLog,
        morning: mapEnergyToLogValue(checkInDraft.energy)
      }
    };
    const nextDailyStart = {
      ...(warRoomState.dailyStart || {}),
      date: today,
      energy: checkInDraft.energy,
      availableHours: hours
    };
    const nextPlan = generateCoachingPlan({
      warRoomState: {
        ...warRoomState,
        dailyStart: nextDailyStart,
        dailyPlan: {
          ...(warRoomState.dailyPlan || {}),
          date: today
        }
      },
      commandCenterState: nextCommandCenterState,
      sections,
      topics,
      forceRegenerate: true
    });

    setState((current) => ({
      ...current,
      checkIns: {
        ...current.checkIns,
        [today]: nextEntry
      },
      energyLog: {
        ...current.energyLog,
        morning: mapEnergyToLogValue(checkInDraft.energy)
      }
    }));

    writeStorageJson(WAR_ROOM_STORAGE_KEY, {
      ...warRoomState,
      dailyStart: nextDailyStart,
      dailyPlan: {
        date: today,
        primarySectionId: nextPlan.focus.primary.section.id,
        generatedAt: new Date().toISOString(),
        snapshot: nextPlan
      }
    });
  }

  function toggleTodoStatus(todoId) {
    setState((current) => ({
      ...current,
      todos: current.todos.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              status: todo.status === "done" ? "open" : "done",
              completedAt: todo.status === "done" ? "" : today
            }
          : todo
      )
    }));
  }

  function saveReflection(event) {
    event.preventDefault();
    const reflection = reflectionDraft.trim();

    if (!reflection) {
      return;
    }

    setState((current) => ({
      ...current,
      reflections: [
        {
          date: today,
          reflection: reflection.slice(0, 280),
          momentum: latestMomentum
        },
        ...current.reflections.filter((entry) => entry.date !== today)
      ]
    }));
    setReflectionDraft("");
    setClosePromptOpen(false);
    setReflectionFlash(true);
    window.setTimeout(() => setReflectionFlash(false), 900);
  }

  function markManualMilestone(flagKey) {
    setState((current) => ({
      ...current,
      manualMilestones: {
        ...current.manualMilestones,
        [flagKey]: true
      }
    }));
  }

  const avatarPose = celebration ? "attack" : resolveAvatarPose(todayCheckIn || checkInDraft);
  const avatarSource = AVATAR_BY_POSE[avatarPose];
  const lastCheckIn = getMostRecentCheckIn(state.checkIns, today);
  const greeting = buildGreeting(new Date());
  const heroQuote = todaysQuote || {
    text: "The line holds when you show up before the day makes demands.",
    source: "Coach"
  };
  const visibleTasks = (todaysCoachPlan?.tasks || []).filter(
    (task) => !String(task.title || "").toLowerCase().includes("passive option")
  );
  const passiveTask = (todaysCoachPlan?.tasks || []).find((task) =>
    String(task.title || "").toLowerCase().includes("passive option")
  );

  return (
    <div className="page-stagger space-y-6">
      <MilestoneCelebration
        milestone={celebration}
        soundEnabled={Boolean(state.settings?.celebrationSoundEnabled)}
        onDone={() => setCelebration(null)}
      />

      {backupReminder ? (
        <Card
          variant="warning"
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          data-backup-reminder="true"
        >
          <p className="text-sm text-slate-200">{backupReminder.message}</p>
          <button
            type="button"
            className="button-secondary"
            onClick={() => dismissBackupReminder(backupMeta)}
          >
            Dismiss
          </button>
        </Card>
      ) : null}

      <section className="hero-card">
        <div className="grid gap-6 lg:grid-cols-[1.3fr,0.7fr] lg:items-start">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="pill">Command Center</div>
              <p className="text-xs uppercase tracking-[0.24em] text-mist">{formatLongDate(today)}</p>
            </div>
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.24em] text-teal/80">Daily check-in</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                {greeting.title}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-200">{greeting.tone}</p>
              <p className="max-w-2xl text-sm leading-7 text-mist">
                Protect family time and give the coach real constraints.
              </p>
            </div>

            {todaysQuote ? (
              <div
                className="panel-soft px-5 py-6"
                data-quote-card="true"
                data-quote-source={heroQuote.source}
              >
                <p className="hero-quote text-2xl leading-tight sm:text-[2rem]">
                  &ldquo;{heroQuote.text}&rdquo;
                </p>
                <p className="mt-4 text-right text-xs uppercase tracking-[0.22em] text-mist">
                  {heroQuote.source}
                </p>
              </div>
            ) : (
              <div className="panel-soft px-5 py-6" data-quote-placeholder="true">
                <p className="hero-quote text-2xl leading-tight sm:text-[2rem]">
                  &ldquo;{heroQuote.text}&rdquo;
                </p>
                <p className="mt-4 text-right text-xs uppercase tracking-[0.22em] text-mist">
                  {heroQuote.source}
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <Card glow className="bg-transparent p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Current stance</p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    {todayCheckIn
                      ? `${todayCheckIn.energy} energy · ${todayCheckIn.hours}h`
                      : lastCheckIn
                        ? `${lastCheckIn.date} · ${lastCheckIn.hours}h`
                        : "Not locked in yet"}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    Momentum holds at {Math.round(latestMomentum * 100)}%.
                  </p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-black/20 p-3">
                  <img
                    src={avatarSource}
                    alt="The Doc avatar"
                    className="h-16 w-16 rounded-[16px] object-cover"
                    data-avatar-pose={avatarPose}
                  />
                </div>
              </div>
            </Card>

            <Link
              to="/war-room?tab=map"
              className="panel-soft transition hover:-translate-y-0.5 hover:border-teal/40"
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-mist">View</p>
              <p className="mt-2 text-lg font-semibold text-white">Open War Map</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                See the six-month line, active threads, and milestone landmarks.
              </p>
            </Link>
          </div>
        </div>
      </section>

      <MomentumMeter
        value={latestMomentum}
        label={`Day ${Object.keys(state.checkIns || {}).length || 1} · ${Math.round(latestMomentum * 100)}% momentum`}
        detail="The meter keeps pressure without punishing one bad day. Build it with calm repetition."
      />

      <div className="grid gap-6 lg:grid-cols-[1.08fr,0.92fr]">
        <Card as="form" glow className="space-y-5" onSubmit={submitCheckIn}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber">Daily Check-In</p>
              <h2 className="mt-2 text-3xl font-bold text-white">How&apos;s today looking?</h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-mist">
                Set energy and hours once. The coaching engine will handle the rest.
              </p>
            </div>
            <span className="pill">Core move</span>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-mist">⚡ Energy</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ENERGY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setCheckInDraft((current) => ({
                        ...current,
                        energy: option.value
                      }))
                    }
                    className={classNames(
                      "toggle-pill",
                      checkInDraft.energy === option.value ? "active" : ""
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-mist">🕐 Study Hours</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {HOUR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setCheckInDraft((current) => ({
                        ...current,
                        hours: option.value
                      }))
                    }
                    className={classNames(
                      "toggle-pill toggle-pill-warm",
                      checkInDraft.hours === option.value ? "active" : ""
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="button-primary w-full sm:w-auto">
              Lock Today&apos;s Tempo
            </button>
          </div>
        </Card>

        <Card variant="calm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-calm">Mission Frame</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Keep the surface clean.</h2>
            </div>
            <p className="text-sm text-slate-400">{TRACK_DEFINITIONS.length} tracks active</p>
          </div>

          <div className="mt-5 grid gap-5">
            <div>
              <label className="text-[11px] uppercase tracking-[0.2em] text-mist" htmlFor="weekly-focus">
                Weekly Focus
              </label>
              <input
                id="weekly-focus"
                className="field mt-3"
                placeholder="What is the single most important outcome for this week?"
                value={state.weeklyFocus}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    weeklyFocus: event.target.value
                  }))
                }
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-[0.2em] text-mist" htmlFor="command-notes">
                Command Notes
              </label>
              <textarea
                id="command-notes"
                className="field mt-3 min-h-32"
                value={state.notes}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    notes: event.target.value
                  }))
                }
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {TRACK_DEFINITIONS.map((track) => {
                const trackTodos = state.todos.filter(
                  (todo) => todo.linkedTrackIds?.includes(track.id) && todo.status !== "done"
                ).length;

                return (
                  <div key={track.id} className="panel-soft">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mist">{track.id}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{track.shortLabel}</p>
                    <p className="mt-1 text-sm text-slate-300">{trackTodos} open tasks</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      <Card glow className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-teal">Today&apos;s Plan</p>
            <h2 className="mt-2 text-3xl font-bold text-white">
              {todaysCoachPlan ? "Your work is already reduced to the next right moves." : "Generate the day, then follow the list."}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-mist">
              The engine is using the real sequencing rules, daily hour template, and current weak point.
            </p>
          </div>
          {todaysCoachPlan?.dailyTemplate ? (
            <div className="panel-soft min-w-[200px]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Template</p>
              <p className="mt-2 text-base font-semibold text-white">{todaysCoachPlan.dailyTemplate.label}</p>
              <p className="mt-1 text-sm text-slate-300">{todaysCoachPlan.phase.label}</p>
            </div>
          ) : null}
        </div>

        {todaysCoachPlan ? (
          <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-3">
              {visibleTasks.map((task) => (
                <Card
                  key={task.id}
                  as="article"
                  variant={resolveTaskVariant(task)}
                  className="p-4 sm:p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-teal/30 bg-teal/10 text-sm text-teal">
                      □
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="text-base font-semibold text-white">{task.title}</p>
                        <span className="pill border-white/10 text-white/80">{task.minutes} min</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{task.detail}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              {passiveTask ? (
                <Card variant="warning" className="p-4 sm:p-5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-amber">Passive Option</p>
                  <p className="mt-2 text-base font-semibold text-white">{passiveTask.title.replace("Passive option:", "Passive:")}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{passiveTask.detail}</p>
                </Card>
              ) : null}

              <Card variant="success" className="p-4 sm:p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-teal">Next Best Move</p>
                <p className="mt-2 text-base font-semibold text-white">
                  {todaysCoachPlan.nextBestMove?.recommendation?.name || "No recommendation unlocked yet"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {todaysCoachPlan.nextBestMove?.recommendation?.notes ||
                    todaysCoachPlan.nextBestMove?.gates?.[0]?.message ||
                    "Check in first to generate the next move."}
                </p>
              </Card>

              <Card className="p-4 sm:p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Coaching Notes</p>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  {(todaysCoachPlan.rules || []).map((rule) => (
                    <p key={rule}>{rule}</p>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <div className="panel-soft border border-dashed border-white/10 p-6 text-sm text-mist">
            Lock today&apos;s tempo to generate the study list.
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
        <Card variant="calm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-calm">Front Line</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Today&apos;s front line.</h2>
            </div>
            <p className="text-sm text-slate-400">{topThree.length} active</p>
          </div>

          <div className="mt-5 space-y-3">
            {topThree.length ? (
              topThree.map((todo, index) => (
                <article key={todo.id} className="panel-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/20 text-sm font-semibold text-slate-200">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-base font-semibold text-white">{todo.title}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(todo.linkedTrackIds || []).map((trackId) => {
                            const track = getTrackDefinition(trackId);
                            return (
                              <span
                                key={`${todo.id}-${trackId}`}
                                className="rounded-full border px-2.5 py-1 text-[11px]"
                                style={{
                                  borderColor: `${THREAD_COLORS[trackId]}55`,
                                  color: THREAD_COLORS[trackId]
                                }}
                              >
                                {track.id}
                              </span>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-sm text-slate-400">
                          {todo.priority} priority · urgency {todo.urgency}
                          {todo.dueDate ? ` · due ${todo.dueDate}` : ""}
                        </p>
                      </div>
                    </div>
                    <button type="button" className="button-secondary" onClick={() => toggleTodoStatus(todo.id)}>
                      Mark Done
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-line p-6 text-sm text-mist">
                No open tasks in the front line. Close the day cleanly.
              </div>
            )}
          </div>

          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Protected Blocks</p>
            <div className="mt-3 space-y-2">
              {todaysEvents.length ? (
                todaysEvents.map((event) => (
                  <div key={event.id} className="panel-soft flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-slate-200">{event.title}</span>
                    <span className="font-mono text-slate-400">{formatEventRange(event)}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-mist">
                  No fixed blocks on the calendar today.
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card variant="warning">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber">Milestones</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Only major markers trigger a celebration.</h2>
            </div>
            <label className="flex items-center gap-2 rounded-full border border-line px-3 py-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={Boolean(state.settings?.celebrationSoundEnabled)}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    settings: {
                      ...current.settings,
                      celebrationSoundEnabled: event.target.checked
                    }
                  }))
                }
              />
              Celebration sound
            </label>
          </div>

          <div className="mt-5 space-y-3">
            {milestoneStatus.map((milestone) => {
              const manualFlag = MANUAL_MILESTONE_BY_ID[milestone.id];

              return (
                <article key={milestone.id} className="panel-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{milestone.label}</p>
                      <p className="mt-1 text-sm text-slate-400">{milestoneHint(milestone, warRoomState)}</p>
                    </div>
                    {milestone.complete ? (
                      <span className="rounded-full border border-teal/20 px-3 py-1 text-xs text-teal">
                        Complete
                      </span>
                    ) : manualFlag ? (
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => markManualMilestone(manualFlag)}
                      >
                        Mark Complete
                      </button>
                    ) : (
                      <span className="rounded-full border border-line px-3 py-1 text-xs text-slate-400">
                        Watching
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className={classNames(reflectionFlash ? "animate-teal-confirm" : "")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber">Reflection Close</p>
            <h2 className="mt-2 text-3xl font-bold text-white">What clicked today?</h2>
            <p className="mt-2 text-sm leading-7 text-mist">
              One thing understood today that was not understood yesterday. No journaling. No editing.
            </p>
          </div>
          <div className="flex gap-2">
            {!todayReflection ? (
              <button type="button" className="button-primary" onClick={() => setClosePromptOpen(true)}>
                Close Day
              </button>
            ) : null}
            <button type="button" className="button-secondary" onClick={() => setGrowthLogOpen((current) => !current)}>
              {growthLogOpen ? "Hide Growth Log" : "Show Growth Log"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr,0.9fr]">
          <div>
            {todayReflection ? (
              <article className="panel-soft border border-teal/30 bg-teal/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-teal">Locked In</p>
                <p className="mt-3 text-sm leading-7 text-white">{todayReflection.reflection}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-300">
                  Momentum {Math.round((todayReflection.momentum || 0) * 100)}%
                </p>
              </article>
            ) : closePromptOpen ? (
              <form className="space-y-4" onSubmit={saveReflection}>
                <textarea
                  className="field min-h-32"
                  maxLength={280}
                  placeholder="One thing I understood today that I didn't yesterday..."
                  value={reflectionDraft}
                  onChange={(event) => setReflectionDraft(event.target.value)}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">{reflectionDraft.length}/280</p>
                  <button type="submit" className="button-primary">
                    Lock it in
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded-2xl border border-dashed border-line p-6 text-sm text-mist">
                Keep it sealed until the day is actually done.
              </div>
            )}
          </div>

          <div className={classNames("space-y-3", growthLogOpen ? "" : "hidden xl:block")}>
            <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Growth Log</p>
            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {state.reflections.length ? (
                state.reflections.map((entry) => (
                  <article key={entry.date} className="panel-soft">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-mist">{entry.date}</p>
                      <span className="rounded-full border border-teal/20 px-2 py-1 text-[11px] text-teal">
                        {Math.round((entry.momentum || 0) * 100)}%
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white">{entry.reflection}</p>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-line p-6 text-sm text-mist">
                  Nothing logged yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
