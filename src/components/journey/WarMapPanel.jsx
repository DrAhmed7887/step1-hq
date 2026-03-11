import { useState } from "react";
import { TRACK_DEFINITIONS } from "../../lib/commandCenter";
import { buildWarMapWeeks, getMilestoneStatus, THREAD_COLORS } from "../../lib/journey";
import MomentumMeter from "./MomentumMeter";
import Card from "../ui/Card";

const SVG_WIDTH = 1120;
const SVG_HEIGHT = 360;
const TRACK_OFFSETS = {
  USMLE: -18,
  AI: -6,
  MASTERS: 6,
  LIFE_OPS: 18
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function buildNodePoints(weeks) {
  const usableWidth = SVG_WIDTH - 120;
  const step = usableWidth / Math.max(weeks.length - 1, 1);

  return weeks.map((week, index) => ({
    ...week,
    x: 60 + step * index,
    y: 180 + Math.sin(index / 2.6) * 24
  }));
}

function buildSmoothPath(points, offset = 0) {
  if (!points.length) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y + offset}`;
  }

  const [first, ...rest] = points;
  let path = `M ${first.x} ${first.y + offset}`;

  for (let index = 0; index < rest.length; index += 1) {
    const current = rest[index];
    const previous = points[index];
    const midpointX = (previous.x + current.x) / 2;
    const midpointY = (previous.y + current.y) / 2 + offset;
    path += ` Q ${previous.x} ${previous.y + offset} ${midpointX} ${midpointY}`;
  }

  const last = points.at(-1);
  return `${path} T ${last.x} ${last.y + offset}`;
}

function weekNodeFill(week) {
  if (week.status === "current") {
    return "#ff6b57";
  }

  if (week.status === "completed") {
    return "#32c6b7";
  }

  if (week.status === "quiet") {
    return "#162335";
  }

  return "#0b1524";
}

function weekNodeStroke(week) {
  if (week.status === "current") {
    return "#ffd0c7";
  }

  if (week.status === "completed") {
    return "#8cd17d";
  }

  if (week.status === "quiet") {
    return "#ff6b57";
  }

  return "#2b3e55";
}

export default function WarMapPanel({
  warRoomState,
  commandCenterState,
  momentum = 0,
  allowGrowthLog = true
}) {
  const [view, setView] = useState("map");
  const weeks = buildWarMapWeeks({
    warRoomState,
    commandCenterState
  });
  const milestoneStatus = getMilestoneStatus({
    warRoomState,
    commandCenterState
  });
  const nodes = buildNodePoints(weeks);
  const path = buildSmoothPath(nodes);

  const activeView = allowGrowthLog ? view : "map";

  return (
    <Card glow>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="war-display text-xs uppercase tracking-[0.24em] text-amber">War Map</p>
          <h2 className="war-display mt-2 text-2xl font-bold text-white">
            March to September, laid out week by week.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-mist">
            One path, four threads, and only real work. Quiet weeks stay visible. Active weeks keep the line lit.
          </p>
        </div>
        {allowGrowthLog ? (
          <div className="segmented-shell">
            <button
              type="button"
              onClick={() => setView("map")}
              className={classNames("segmented-pill", view === "map" ? "active" : "")}
            >
              War Map
            </button>
            <button
              type="button"
              onClick={() => setView("growth")}
              className={classNames("segmented-pill", view === "growth" ? "active" : "")}
            >
              Growth Log
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.4fr,0.9fr]">
        <MomentumMeter
          value={momentum}
          compact
          detail="Momentum is shared across the app. Study days charge it; gaps drain it slowly."
        />
        <div className="panel-soft p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Threads</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TRACK_DEFINITIONS.map((track) => (
              <span
                key={track.id}
                className="rounded-full border px-3 py-1 text-xs font-medium"
                style={{
                  borderColor: `${THREAD_COLORS[track.id]}55`,
                  color: THREAD_COLORS[track.id]
                }}
              >
                {track.id}
              </span>
            ))}
          </div>
        </div>
      </div>

      {activeView === "map" ? (
        <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="h-auto w-full"
            role="img"
            aria-label="War map timeline"
          >
            <defs>
              <filter id="weekGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path d={path} fill="none" stroke="#21354d" strokeWidth="8" strokeLinecap="round" />

            {TRACK_DEFINITIONS.map((track) =>
              nodes.map((node, index) => {
                const next = nodes[index + 1];

                if (!next) {
                  return null;
                }

                const active =
                  Number(node.trackActivity[track.id] || 0) > 0 ||
                  Number(next.trackActivity[track.id] || 0) > 0;

                return (
                  <line
                    key={`${track.id}-${node.id}`}
                    x1={node.x}
                    y1={node.y + TRACK_OFFSETS[track.id]}
                    x2={next.x}
                    y2={next.y + TRACK_OFFSETS[track.id]}
                    stroke={THREAD_COLORS[track.id]}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={
                      node.status === "completed" && next.status === "completed" ? undefined : "8 10"
                    }
                    opacity={active ? 0.95 : 0.14}
                  />
                );
              })
            )}

            {nodes.map((node) =>
              node.monthLabel ? (
                <text
                  key={`${node.id}-month`}
                  x={node.x}
                  y="42"
                  textAnchor="middle"
                  className="war-display fill-slate-500 text-[12px] uppercase tracking-[0.3em]"
                >
                  {node.monthLabel}
                </text>
              ) : null
            )}

            {nodes.map((node) => (
              <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
                {node.status === "current" ? (
                  <circle
                    r="18"
                    fill="none"
                    stroke="rgba(34,211,238,0.45)"
                    strokeWidth="2"
                    className="animate-radar-pulse"
                  />
                ) : null}
                <circle
                  r={node.status === "current" ? 12 : 10}
                  fill={weekNodeFill(node)}
                  stroke={weekNodeStroke(node)}
                  strokeWidth="2"
                  filter={node.status === "completed" ? "url(#weekGlow)" : undefined}
                  className={node.status === "current" ? "animate-war-node" : undefined}
                  data-week-node="true"
                />
                <circle
                  r={node.status === "current" ? 4 : 3}
                  fill={node.status === "future" ? "#334155" : "#ffffff"}
                  opacity={node.status === "future" ? 0.45 : 0.8}
                />
                <text
                  y="28"
                  textAnchor="middle"
                  className="fill-slate-500 text-[11px]"
                >
                  {node.label}
                </text>
              </g>
            ))}

            {milestoneStatus.map((milestone, index) => {
              const targetIndex = clamp(
                Math.round((weeks.length - 1) * (index / Math.max(milestoneStatus.length - 1, 1))),
                0,
                nodes.length - 1
              );
              const anchor = nodes[targetIndex];
              const yOffset = index % 2 === 0 ? -62 : 58;

              return (
                <g key={milestone.id} transform={`translate(${anchor.x} ${anchor.y + yOffset})`}>
                  <rect
                    x="-14"
                    y="-14"
                    width="28"
                    height="28"
                    rx="4"
                    fill={milestone.complete ? THREAD_COLORS[milestone.trackId] : "#111827"}
                    stroke={milestone.complete ? "#d7fff7" : "#475569"}
                    strokeWidth="2"
                    opacity={milestone.complete ? 1 : 0.85}
                    transform="rotate(45)"
                  />
                  <text
                    y="4"
                    textAnchor="middle"
                    className="fill-white text-[11px] font-semibold uppercase"
                  >
                    {milestone.shortLabel}
                  </text>
                  <rect
                    x="-54"
                    y={index % 2 === 0 ? -34 : 22}
                    rx="12"
                    ry="12"
                    width="108"
                    height="24"
                    fill={milestone.complete ? `${THREAD_COLORS[milestone.trackId]}20` : "#0f172acc"}
                    stroke={milestone.complete ? `${THREAD_COLORS[milestone.trackId]}66` : "#334155"}
                  />
                  <text
                    x="0"
                    y={index % 2 === 0 ? -18 : 38}
                    textAnchor="middle"
                    className="fill-slate-200 text-[10px]"
                  >
                    {milestone.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <div className="mt-6 panel-soft p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Growth Log</p>
              <p className="mt-1 text-sm text-slate-300">
                Locked one-liners for each day you closed properly.
              </p>
            </div>
            <p className="text-xs text-slate-400">
              {(commandCenterState?.reflections || []).length} entries
            </p>
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {(commandCenterState?.reflections || []).length ? (
              commandCenterState.reflections.map((entry) => (
                <article key={entry.date} className="rounded-2xl border border-line bg-white/5 p-4">
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
                No reflections locked in yet.
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
