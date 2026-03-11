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
