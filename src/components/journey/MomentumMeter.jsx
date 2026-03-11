import bubbleShell from "../../assets/ninja/BackgroundIron2.png";
import bubbleGloss from "../../assets/ninja/Over.png";
import { getMomentumBandLabel, getMomentumColor } from "../../lib/journey";

const SLOT_COUNT = 14;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function MomentumMeter({
  value = 0,
  label = "Momentum Meter",
  detail = "Consistency builds pressure slowly and keeps some charge after short gaps.",
  compact = false
}) {
  const normalized = clamp(Number(value || 0), 0, 1);
  const color = getMomentumColor(normalized);
  const percent = Math.round(normalized * 100);
  const slotSize = compact ? 20 : 26;
  const inset = compact ? 4 : 5;

  return (
    <section className={`panel-soft ${compact ? "p-4" : "p-5"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-mist">{label}</p>
          <div className="mt-2 flex items-end gap-3">
            <p className="font-mono text-3xl font-bold text-white">{percent}%</p>
            <p className="pb-1 text-xs uppercase tracking-[0.18em]" style={{ color }}>
              {getMomentumBandLabel(normalized)}
            </p>
          </div>
        </div>
        {!compact ? <p className="max-w-xs text-sm leading-6 text-slate-300">{detail}</p> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {Array.from({ length: SLOT_COUNT }).map((_, index) => {
          const fill = clamp(normalized * SLOT_COUNT - index, 0, 1);

          return (
            <div
              key={`momentum-slot-${index + 1}`}
              className="relative"
              style={{ height: slotSize, width: slotSize }}
            >
              <img
                src={bubbleShell}
                alt=""
                className="absolute inset-0 h-full w-full select-none object-contain pixelated opacity-95"
              />
              <div
                className="absolute rounded-full transition-all duration-300"
                style={{
                  inset,
                  background: color,
                  opacity: fill,
                  transform: `scale(${0.35 + fill * 0.65})`
                }}
              />
              <img
                src={bubbleGloss}
                alt=""
                className="absolute select-none pixelated opacity-70"
                style={{
                  top: compact ? 5 : 6,
                  right: compact ? 5 : 6,
                  height: compact ? 3 : 4,
                  width: compact ? 3 : 4
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
