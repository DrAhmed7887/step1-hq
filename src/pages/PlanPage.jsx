import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DrillBoard from "../components/plan/DrillBoard";
import TutorPanel from "../components/tutor/TutorPanel";
import MilestoneCelebration from "../components/journey/MilestoneCelebration";
import Card from "../components/ui/Card";
import { sections, topics } from "../data/warRoomData";
import { createCombinedBackup } from "../lib/appBackup";
import {
  COMMAND_CENTER_STORAGE_KEY,
  createCommandCenterState,
  eventsForDate,
  getTrackDefinition,
  hydrateCommandCenterState
} from "../lib/commandCenter";
import {
  CLOUD_SYNC_SETTINGS_KEY,
  createCloudSyncSettings,
  hydrateCloudSyncSettings,
  pushCloudSnapshot
} from "../lib/cloudSync";
import {
  classNames,
  formatEventRange,
  formatLongDate,
  resolveTaskVariant,
  sortOpenTodos
} from "../lib/dailyFlow";
import { getLatestMomentum, THREAD_COLORS } from "../lib/journey";
import { usePersistentState, useStorageJson } from "../lib/persistence";
import {
  createResourceProgressPatch,
  getRemainingUnits,
  getTrackedResourceEntry
} from "../lib/resourceProgress";
import {
  WAR_ROOM_STORAGE_KEY,
  createWarRoomState,
  hydrateWarRoomState,
  todayKey
} from "../lib/warRoom";

function shortEnergyLabel(energy) {
  if (energy === "high") {
    return "High";
  }

  if (energy === "low") {
    return "Low";
  }

  return "Med";
}

export default function PlanPage() {
  const [commandCenterState, setCommandCenterState] = usePersistentState(
    COMMAND_CENTER_STORAGE_KEY,
    createCommandCenterState,
    hydrateCommandCenterState
  );
  const [warRoomState, setWarRoomState] = usePersistentState(
    WAR_ROOM_STORAGE_KEY,
    () => createWarRoomState(sections),
    (saved) => hydrateWarRoomState(saved, sections)
  );
  const cloudSettings = useStorageJson(
    CLOUD_SYNC_SETTINGS_KEY,
    createCloudSyncSettings,
    hydrateCloudSyncSettings
  );

  const today = todayKey();
  const todayCheckIn = commandCenterState.checkIns[today] || null;
  const todayReflection =
    commandCenterState.reflections.find((entry) => entry.date === today) || null;
  const todaysCoachPlan =
    warRoomState.dailyPlan?.date === today ? warRoomState.dailyPlan.snapshot || null : null;
  const todaysEvents = eventsForDate(commandCenterState.events || [], today);
  const topThree = sortOpenTodos(commandCenterState.todos || []).slice(0, 3);
  const latestMomentum = todayCheckIn?.momentum ?? getLatestMomentum(commandCenterState.checkIns);
  const [reflectionDraft, setReflectionDraft] = useState("");
  const [closePromptOpen, setClosePromptOpen] = useState(false);
  const [growthLogOpen, setGrowthLogOpen] = useState(false);
  const [reflectionFlash, setReflectionFlash] = useState(false);
  const [progressToast, setProgressToast] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [tutorOpen, setTutorOpen] = useState(false);

  useEffect(() => {
    if (!progressToast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setProgressToast(null), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [progressToast]);

  function toggleTodoStatus(todoId) {
    setCommandCenterState((current) => ({
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

  function completeResourceTask(task) {
    const sectionId = todaysCoachPlan?.focus?.primary?.section?.id;

    if (!sectionId || warRoomState.completedResources?.includes(task.id)) {
      return;
    }

    setWarRoomState((current) => {
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
        ...current,
        completedResources: nextCompletedResources,
        doneTopics: nextDoneTopics,
        systemProgress: nextSystemProgress
      };
    });
  }

  function saveReflection(event) {
    event.preventDefault();
    const reflection = reflectionDraft.trim();

    if (!reflection) {
      return;
    }

    setCommandCenterState((current) => ({
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

  function logResourceProgress(resourceId, amount) {
    let patch = null;
    let nextWarRoomState = null;

    setWarRoomState((current) => {
      patch = createResourceProgressPatch(current, resourceId, amount);

      if (!patch) {
        return current;
      }

      nextWarRoomState = {
        ...current,
        resourceProgress: patch.nextProgress
      };
      return nextWarRoomState;
    });

    if (!patch || !nextWarRoomState) {
      return false;
    }

    const updatedEntry = getTrackedResourceEntry(nextWarRoomState, resourceId);
    const remaining = getRemainingUnits(updatedEntry);

    setProgressToast({
      id: crypto.randomUUID(),
      message: `+${patch.nextUnits - patch.previousUnits} ${patch.definition.unit} logged. ${
        updatedEntry.totalUnits ? `${remaining} remaining.` : "Tracker updated."
      }`
    });

    if (patch.thresholdsCrossed.length) {
      const milestone = patch.thresholdsCrossed.at(-1);
      setCelebration({
        label: `${patch.definition.label} ${milestone}% locked`
      });
    }

    if (cloudSettings.projectUrl && cloudSettings.anonKey && cloudSettings.syncKey) {
      void pushCloudSnapshot(
        cloudSettings,
        createCombinedBackup({
          warRoom: nextWarRoomState,
          commandCenter: commandCenterState,
          syncSettings: cloudSettings
        })
      ).catch(() => {});
    }

    return true;
  }

  if (!todayCheckIn || !todaysCoachPlan) {
    return (
      <div className="page-stagger">
        <section className="hero-card">
          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <div className="pill">Plan</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Today&apos;s plan starts on Home.
            </h1>
            <p className="text-sm leading-7 text-mist">
              Check in on the Home screen first to generate today&apos;s plan.
            </p>
            <div className="flex justify-center">
              <Link to="/" className="button-primary">
                Go to Home
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const visibleTasks = (todaysCoachPlan.tasks || []).filter(
    (task) => !String(task.title || "").toLowerCase().includes("passive option")
  );
  const passiveTask = (todaysCoachPlan.tasks || []).find((task) =>
    String(task.title || "").toLowerCase().includes("passive option")
  );
  const completedResources = warRoomState.completedResources || [];

  return (
    <div className="page-stagger space-y-6">
      <MilestoneCelebration
        milestone={celebration}
        soundEnabled={Boolean(commandCenterState.settings?.celebrationSoundEnabled)}
        onDone={() => setCelebration(null)}
      />

      {progressToast ? (
        <div className="drill-toast-shell">
          <div className="drill-toast">{progressToast.message}</div>
        </div>
      ) : null}

      <section className="hero-card">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="pill">Plan</div>
            <p className="text-xs uppercase tracking-[0.22em] text-mist">
              {formatLongDate(today)} · {todayCheckIn.hours}h · {shortEnergyLabel(todayCheckIn.energy)}
            </p>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Today&apos;s Plan
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-mist">
              Stay with the checklist. The day is already reduced to the next right moves.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.08fr,0.92fr]">
        <Card glow className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-teal">Study Tasks</p>
              <h2 className="mt-2 text-3xl font-bold text-white">Generated from the engine.</h2>
            </div>
            {todaysCoachPlan.dailyTemplate ? (
              <div className="panel-soft min-w-[180px]">
                <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Template</p>
                <p className="mt-2 text-base font-semibold text-white">
                  {todaysCoachPlan.dailyTemplate.label}
                </p>
                <p className="mt-1 text-sm text-slate-300">{todaysCoachPlan.phase.label}</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            {visibleTasks.map((task) => {
              const complete = completedResources.includes(task.id);

              return (
                <Card
                  key={task.id}
                  as="article"
                  variant={resolveTaskVariant(task)}
                  className={classNames("p-4 sm:p-5", complete ? "animate-teal-confirm" : "")}
                >
                  <div className="flex items-start gap-4">
                    <button
                      type="button"
                      className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border text-sm ${
                        complete
                          ? "border-teal/30 bg-teal/20 text-teal"
                          : "border-white/10 bg-black/20 text-slate-300"
                      }`}
                      onClick={() => completeResourceTask(task)}
                      aria-label={`Complete ${task.title}`}
                    >
                      {complete ? "✓" : "□"}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="text-base font-semibold text-white">{task.title}</p>
                        <span className="pill border-white/10 text-white/80">{task.minutes} min</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{task.detail}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          {passiveTask ? (
            <Card variant="warning" className="p-4 sm:p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-amber">Passive</p>
              <p className="mt-2 text-base font-semibold text-white">
                {passiveTask.title.replace("Passive option:", "Passive:")}
              </p>
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
                "Check in on Home to regenerate the day."}
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

      <Card variant="success" glow>
        <DrillBoard warRoomState={warRoomState} onLog={logResourceProgress} />
      </Card>

      <Card variant="calm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="war-display text-xs uppercase tracking-[0.22em] text-calm">Front Line</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Existing command tasks.</h2>
          </div>
          <p className="text-sm text-slate-400">{topThree.length} active</p>
        </div>

        <div className="mt-5 space-y-3">
          {topThree.length ? (
            topThree.map((todo) => (
              <article key={todo.id} className="panel-soft p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border text-sm ${
                        todo.status === "done"
                          ? "border-teal/30 bg-teal/20 text-teal"
                          : "border-white/10 bg-black/20 text-slate-300"
                      }`}
                      onClick={() => toggleTodoStatus(todo.id)}
                      aria-label={`Toggle ${todo.title}`}
                    >
                      {todo.status === "done" ? "✓" : "□"}
                    </button>
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
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-line p-6 text-sm text-mist">
              No open tasks in the front line. Close the day cleanly.
            </div>
          )}
        </div>
      </Card>

      <Card>
        <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Protected Blocks</p>
        <div className="mt-3 space-y-2">
          {todaysEvents.length ? (
            todaysEvents.map((event) => (
              <div
                key={event.id}
                className="panel-soft flex items-center justify-between px-4 py-3 text-sm"
              >
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
      </Card>

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
              <button
                type="button"
                className="button-primary"
                onClick={() => setClosePromptOpen(true)}
              >
                Close Day
              </button>
            ) : null}
            <button
              type="button"
              className="button-secondary"
              onClick={() => setGrowthLogOpen((current) => !current)}
            >
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
              {commandCenterState.reflections.length ? (
                commandCenterState.reflections.map((entry) => (
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

      {warRoomState.tutorSettings?.apiKey?.trim() ? (
        <>
          <button
            type="button"
            className="tutor-fab"
            onClick={() => setTutorOpen(true)}
            aria-label="Open USMLE Tutor"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 3c-4.97 0-9 3.44-9 7.7 0 2.38 1.24 4.5 3.2 5.9L5 21l4.09-2.26c.9.21 1.89.32 2.91.32 4.97 0 9-3.44 9-7.7S16.97 3 12 3Zm-3 9.1h6v1.8H9v-1.8Zm0-3.6h9v1.8H9V8.5Z"
              />
            </svg>
          </button>
          <TutorPanel
            apiKey={warRoomState.tutorSettings.apiKey}
            open={tutorOpen}
            onClose={() => setTutorOpen(false)}
          />
        </>
      ) : null}
    </div>
  );
}
