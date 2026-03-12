import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import avatarAttack from "../assets/doc/attack.png";
import avatarExhausted from "../assets/doc/exhausted.png";
import avatarReady from "../assets/doc/ready.png";
import MilestoneCelebration from "../components/journey/MilestoneCelebration";
import MomentumMeter from "../components/journey/MomentumMeter";
import Logo from "../components/Logo";
import Card from "../components/ui/Card";
import { sections, topics } from "../data/warRoomData";
import {
  COMMAND_CENTER_STORAGE_KEY,
  createCommandCenterState,
  hydrateCommandCenterState
} from "../lib/commandCenter";
import { generateCoachingPlan } from "../lib/coachingEngine";
import { getQuoteByKey, pickContextualQuote, quoteKey } from "../lib/coachQuotes";
import {
  buildGreeting,
  ENERGY_OPTIONS,
  findLatestQuoteKey,
  HOUR_OPTIONS,
  mapEnergyToLogValue
} from "../lib/dailyFlow";
import {
  calculateNextMomentum,
  getLatestMomentum,
  getMostRecentCheckIn,
  getNewMilestones,
  resolveAvatarPose,
  resolveQuoteCategory,
  resolveSessionType
} from "../lib/journey";
import { useNotionCache, useNotionStatus } from "../lib/notionSync";
import { usePersistentState, useStorageJson, writeStorageJson } from "../lib/persistence";
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

export default function HomePage() {
  const navigate = useNavigate();
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
  const notionCache = useNotionCache();
  const notionStatus = useNotionStatus();

  const today = todayKey();
  const todayCheckIn = state.checkIns[today] || null;
  const latestMomentum = todayCheckIn?.momentum ?? getLatestMomentum(state.checkIns);
  const todaysQuote = todayCheckIn?.quoteKey ? getQuoteByKey(todayCheckIn.quoteKey) : null;
  const [checkInDraft, setCheckInDraft] = useState({
    energy: todayCheckIn?.energy || "medium",
    hours: String(todayCheckIn?.hours || 2)
  });
  const [celebration, setCelebration] = useState(null);

  useEffect(() => {
    setCheckInDraft({
      energy: todayCheckIn?.energy || "medium",
      hours: String(todayCheckIn?.hours || 2)
    });
  }, [todayCheckIn?.energy, todayCheckIn?.hours]);

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

    navigate("/plan");
  }

  const avatarPose = celebration ? "attack" : resolveAvatarPose(todayCheckIn || checkInDraft);
  const avatarSource = AVATAR_BY_POSE[avatarPose];
  const lastCheckIn = getMostRecentCheckIn(state.checkIns, today);
  const greeting = buildGreeting(new Date());
  const heroQuote = todaysQuote || {
    text: "One step at a time. One punch at a time. One round at a time.",
    source: "Rocky Balboa"
  };
  const stanceLabel = todayCheckIn
    ? `${todayCheckIn.energy} energy · ${todayCheckIn.hours}h locked today`
    : lastCheckIn
      ? `Last stance: ${lastCheckIn.date} · ${lastCheckIn.hours}h`
      : "No stance locked yet.";
  const upcomingTask = notionCache.schedule.today || notionCache.schedule.upcoming[0] || null;
  const openWeakTopics = notionCache.weakTopics.filter((topic) => !topic.reviewed).length;
  const liveResources = [...notionCache.resources]
    .sort((left, right) => right.progressPct - left.progressPct)
    .slice(0, 3);

  return (
    <div className="page-stagger space-y-4">
      <MilestoneCelebration
        milestone={celebration}
        soundEnabled={Boolean(state.settings?.celebrationSoundEnabled)}
        onDone={() => setCelebration(null)}
      />

      <section className="hero-card p-5 text-center sm:p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="flex justify-center">
            <Logo compact className="justify-center" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              {greeting.title}
            </h1>
            <p className="mx-auto max-w-2xl text-sm leading-7 text-mist">{greeting.tone}</p>
          </div>

          <div
            className="panel-soft px-4 py-4"
            data-quote-card="true"
            data-quote-source={heroQuote.source}
          >
            <p className="hero-quote text-2xl leading-tight sm:text-[2.1rem]">
              &ldquo;{heroQuote.text}&rdquo;
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-mist">
              {heroQuote.source}
            </p>
          </div>

          <div className="flex justify-center">
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-2">
              <img
                src={avatarSource}
                alt="The Doc avatar"
                className="h-14 w-14 rounded-[14px] object-cover sm:h-16 sm:w-16"
                data-avatar-pose={avatarPose}
              />
            </div>
          </div>
        </div>
      </section>

      <MomentumMeter
        value={latestMomentum}
        label={`Day ${Object.keys(state.checkIns || {}).length || 1} · ${Math.round(latestMomentum * 100)}% momentum`}
        compact
      />

      <Card className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-teal">Notion Pulse</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Live command summary.</h2>
          </div>
          <p className="text-sm text-mist">
            {notionStatus.message}
            {notionStatus.lastSyncedAt
              ? ` · ${new Date(notionStatus.lastSyncedAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit"
                })}`
              : ""}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="panel-soft p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Next task</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {upcomingTask?.system || "Plan sync pending"}
            </p>
            <p className="mt-2 text-xs text-slate-300">
              {upcomingTask?.date ? `${upcomingTask.date} · ${upcomingTask.label}` : "Notion schedule will show up here once synced."}
            </p>
          </div>
          <div className="panel-soft p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Weak topics</p>
            <p className="mt-2 text-3xl font-bold text-coral">{openWeakTopics}</p>
            <p className="mt-2 text-xs text-slate-300">Open flags waiting for review.</p>
          </div>
          <div className="panel-soft p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Resources live</p>
            <p className="mt-2 text-3xl font-bold text-teal">{notionCache.resources.length}</p>
            <p className="mt-2 text-xs text-slate-300">Tracked directly from Notion.</p>
          </div>
          <div className="panel-soft p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Practice exams</p>
            <p className="mt-2 text-3xl font-bold text-amber">{notionCache.practiceExams.length}</p>
            <p className="mt-2 text-xs text-slate-300">NBME / Free 120 entries synced.</p>
          </div>
        </div>

        {liveResources.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {liveResources.map((resource) => (
              <div key={resource.id} className="rounded-2xl border border-line bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{resource.name}</p>
                  <span className="font-mono text-xs text-teal">{resource.progressPct}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal to-coral"
                    style={{ width: `${resource.progressPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <p className="px-2 text-center text-xs uppercase tracking-[0.18em] text-mist">
        Current stance: {stanceLabel}
      </p>

      <Card as="form" glow className="mx-auto w-full max-w-3xl space-y-4" onSubmit={submitCheckIn}>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-amber">Daily Check-In</p>
          <h2 className="text-2xl font-bold text-white">Lock today&apos;s tempo.</h2>
        </div>

        <div className="space-y-4">
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
                  className={`toggle-pill ${checkInDraft.energy === option.value ? "active" : ""}`}
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
                  className={`toggle-pill toggle-pill-warm ${checkInDraft.hours === option.value ? "active" : ""}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="button-primary w-full">
            Lock Today&apos;s Tempo
          </button>
        </div>
      </Card>
    </div>
  );
}
