import { useEffect, useState } from "react";
import MilestoneCelebration from "../components/journey/MilestoneCelebration";
import WarMapPanel from "../components/journey/WarMapPanel";
import Card from "../components/ui/Card";
import { sections } from "../data/warRoomData";
import {
  COMMAND_CENTER_STORAGE_KEY,
  createCommandCenterState,
  hydrateCommandCenterState
} from "../lib/commandCenter";
import { MANUAL_MILESTONE_BY_ID, milestoneHint } from "../lib/dailyFlow";
import {
  getLatestMomentum,
  getMilestoneStatus,
  getNewMilestones,
  THREAD_COLORS
} from "../lib/journey";
import { usePersistentState, useStorageJson } from "../lib/persistence";
import {
  WAR_ROOM_STORAGE_KEY,
  createWarRoomState,
  hydrateWarRoomState,
  todayKey
} from "../lib/warRoom";
import { useNotionCache, useNotionStatus } from "../lib/notionSync";

export default function MapPage() {
  const [commandCenterState, setCommandCenterState] = usePersistentState(
    COMMAND_CENTER_STORAGE_KEY,
    createCommandCenterState,
    hydrateCommandCenterState
  );
  const warRoomState = useStorageJson(
    WAR_ROOM_STORAGE_KEY,
    () => createWarRoomState(sections),
    (saved) => hydrateWarRoomState(saved, sections)
  );
  const notionCache = useNotionCache();
  const notionStatus = useNotionStatus();
  const [celebration, setCelebration] = useState(null);
  const today = todayKey();
  const latestMomentum = getLatestMomentum(commandCenterState.checkIns || {});
  const milestoneStatus = getMilestoneStatus({
    warRoomState,
    commandCenterState
  });

  useEffect(() => {
    const freshMilestones = getNewMilestones({
      warRoomState,
      commandCenterState,
      today
    });

    if (!freshMilestones.length) {
      return;
    }

    setCommandCenterState((current) => ({
      ...current,
      milestonesCompleted: Array.from(
        new Set([...(current.milestonesCompleted || []), ...freshMilestones.map((entry) => entry.id)])
      )
    }));
    setCelebration(freshMilestones[0]);
  }, [
    commandCenterState,
    setCommandCenterState,
    today,
    warRoomState,
    warRoomState.assessments,
    warRoomState.examDate,
    warRoomState.totalQuestions
  ]);

  function markManualMilestone(flagKey) {
    setCommandCenterState((current) => ({
      ...current,
      manualMilestones: {
        ...current.manualMilestones,
        [flagKey]: true
      }
    }));
  }

  return (
    <div className="war-room-bg page-stagger space-y-6">
      <MilestoneCelebration
        milestone={celebration}
        soundEnabled={Boolean(commandCenterState.settings?.celebrationSoundEnabled)}
        onDone={() => setCelebration(null)}
      />

      <section className="hero-card">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="pill">Map</div>
            <p className="text-xs uppercase tracking-[0.22em] text-mist">
              March 2026 → September 2026
            </p>
          </div>
          <div className="space-y-2">
            <h1 className="war-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              War Map
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-mist">
              Keep the whole line visible: week nodes, thread continuity, and the milestones that prove motion.
            </p>
          </div>
        </div>
      </section>

      <WarMapPanel
        warRoomState={warRoomState}
        commandCenterState={commandCenterState}
        momentum={latestMomentum}
        allowGrowthLog={false}
      />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-teal">Systems Command</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Notion subject progress</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-mist">
              The systems layer now reads from the Study Stack database so the map stays tied to live completion data.
            </p>
          </div>
          <p className="text-sm text-mist">{notionStatus.message}</p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {notionCache.subjects.length ? (
            notionCache.subjects.map((subject) => (
              <article key={subject.id} className="rounded-3xl border border-line bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{subject.system}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-mist">
                      {subject.phase} · {subject.status}
                    </p>
                  </div>
                  <span className="font-mono text-teal">{subject.progressPct}%</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal to-coral"
                    style={{ width: `${subject.progressPct}%` }}
                  />
                </div>
                <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                  <p>FA: {subject.faDone}/{subject.faTotal}</p>
                  <p>UWorld: {subject.uwDone}/{subject.uwTotal}</p>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-line p-5 text-sm text-mist sm:col-span-2 xl:col-span-3">
              No Notion subject data yet. The local map still works offline, and the live system cards will appear once the Notion proxy responds.
            </div>
          )}
        </div>
      </Card>

      <Card variant="warning">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber">Milestones</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Compact timeline</h2>
          </div>
          <label className="flex items-center gap-2 rounded-full border border-line px-3 py-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={Boolean(commandCenterState.settings?.celebrationSoundEnabled)}
              onChange={(event) =>
                setCommandCenterState((current) => ({
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
              <article
                key={milestone.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white/5 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold"
                    style={{
                      borderColor: milestone.complete
                        ? `${THREAD_COLORS[milestone.trackId]}66`
                        : "rgba(255,255,255,0.12)",
                      color: milestone.complete ? THREAD_COLORS[milestone.trackId] : "#cbd5e1"
                    }}
                  >
                    {milestone.complete ? "✓" : "○"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{milestone.label}</p>
                    <p className="text-xs text-slate-400">{milestoneHint(milestone, warRoomState)}</p>
                  </div>
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
                    Mark
                  </button>
                ) : (
                  <span className="rounded-full border border-line px-3 py-1 text-xs text-slate-400">
                    Watching
                  </span>
                )}
              </article>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
