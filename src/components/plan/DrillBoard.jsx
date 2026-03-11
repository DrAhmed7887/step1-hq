import { useEffect, useMemo, useState } from "react";
import {
  calculateResourcePercent,
  formatResourcePercent,
  formatResourceQuantity,
  getRemainingUnits,
  getResourceProgressDefinitions,
  resolveResourceProgress
} from "../../lib/resourceProgress";

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function quantityLabel(value, unit) {
  return `${formatResourceQuantity(value)} ${unit}`;
}

function percentLabel(entry) {
  if (!entry.totalUnits) {
    return "TRACK";
  }

  return `${formatResourcePercent(entry)}%`;
}

function barWidth(entry) {
  if (!entry.totalUnits) {
    return entry.completedUnits > 0 ? 100 : 12;
  }

  return calculateResourcePercent(entry);
}

export default function DrillBoard({
  warRoomState,
  readOnly = false,
  onLog = null
}) {
  const progress = useMemo(() => resolveResourceProgress(warRoomState), [warRoomState]);
  const [drafts, setDrafts] = useState({});
  const [flashId, setFlashId] = useState("");
  const definitions = useMemo(() => getResourceProgressDefinitions(), []);

  useEffect(() => {
    if (!flashId) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setFlashId(""), 450);
    return () => window.clearTimeout(timeoutId);
  }, [flashId]);

  function submitLog(resourceId) {
    const amount = Number(drafts[resourceId] || 0);
    const didLog = onLog?.(resourceId, amount);

    if (!didLog) {
      return;
    }

    setDrafts((current) => ({
      ...current,
      [resourceId]: ""
    }));
    setFlashId(resourceId);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="war-display text-sm uppercase tracking-[0.28em] text-amber">Drill Board</p>
          <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            Mission progress across the active stack.
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-mist">
          Log the rep count and watch the bar move. No guessing how much is left.
        </p>
      </div>

      <div className="space-y-4">
        {definitions.map((definition) => {
          const entry = progress[definition.id];

          if (!entry) {
            return null;
          }

          const remainingUnits = getRemainingUnits(entry);
          const isTrackOnly = !entry.totalUnits;
          const rowReadOnly = readOnly || definition.readOnly;

          return (
            <article key={definition.id} className="drill-row">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{definition.label}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {entry.totalUnits
                      ? `${quantityLabel(entry.completedUnits, definition.unit)} / ${quantityLabel(
                          entry.totalUnits,
                          definition.unit
                        )}`
                      : `${quantityLabel(entry.completedUnits, definition.unit)} logged`}
                  </p>
                </div>
                <p className="font-mono text-sm uppercase tracking-[0.18em] text-slate-300">
                  {percentLabel(entry)}
                </p>
              </div>

              <div className="mt-3 drill-bar-track">
                <div
                  className={classNames(
                    "drill-bar-fill",
                    flashId === definition.id ? "flash" : "",
                    isTrackOnly ? "drill-bar-fill-trackonly" : ""
                  )}
                  style={{ width: `${barWidth(entry)}%` }}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {rowReadOnly ? (
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-mist">
                    {definition.readOnlyLabel || "Read only"}
                  </span>
                ) : (
                  <>
                    <label className="sr-only" htmlFor={`drill-${definition.id}`}>
                      {definition.inputLabel}
                    </label>
                    <input
                      id={`drill-${definition.id}`}
                      className="field h-11 w-28 px-3 py-2.5"
                      type="number"
                      min="0"
                      step={definition.unit === "hours" ? "0.5" : "1"}
                      value={drafts[definition.id] || ""}
                      placeholder="0"
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [definition.id]: event.target.value
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="button-primary h-11 w-11 rounded-[14px] px-0 py-0 text-lg"
                      onClick={() => submitLog(definition.id)}
                      aria-label={`Log ${definition.label}`}
                    >
                      +
                    </button>
                    <p className="text-xs uppercase tracking-[0.18em] text-mist">
                      {isTrackOnly
                        ? "Live tally"
                        : remainingUnits > 0
                          ? `${quantityLabel(remainingUnits, definition.unit)} remaining`
                          : "Mission complete"}
                    </p>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

