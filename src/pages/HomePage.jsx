import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import avatarAttack from "../assets/ninja/avatar-attack.png";
import avatarExhausted from "../assets/ninja/avatar-exhausted.png";
import avatarReady from "../assets/ninja/avatar-ready.png";
import MilestoneCelebration from "../components/journey/MilestoneCelebration";
import MomentumMeter from "../components/journey/MomentumMeter";
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
    text: "One step at a time. One punch at a time.",
    source: "Rocky Balboa"
  };
  const stanceLabel = todayCheckIn
    ? `${todayCheckIn.energy} energy · ${todayCheckIn.hours}h locked today`
    : lastCheckIn
      ? `Last stance: ${lastCheckIn.date} · ${lastCheckIn.hours}h`
      : "No stance locked yet.";

  return (
    <div className="page-stagger space-y-4">
      <MilestoneCelebration
        milestone={celebration}
        soundEnabled={Boolean(state.settings?.celebrationSoundEnabled)}
        onDone={() => setCelebration(null)}
      />

      <section className="hero-card p-5 text-center sm:p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              {greeting.title}
            </h1>
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
                alt="Daily avatar"
                className="h-14 w-14 pixelated sm:h-16 sm:w-16"
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
