import bubbleShell from "../../assets/ninja/BackgroundIron2.png";
import { getMomentumBandLabel } from "../../lib/journey";
import Card from "../ui/Card";

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
  const percent = Math.round(normalized * 100);
  const band = getMomentumBandLabel(normalized);

  return (
    <Card
      variant={percent >= 70 ? "success" : percent >= 40 ? "warning" : "danger"}
      glow={!compact && percent >= 55}
      className={compact ? "p-4" : ""}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-mist">{label}</p>
          <div className="mt-3 flex items-end gap-3">
            <p className="font-mono text-4xl font-bold text-white">{percent}%</p>
            <p className="pb-1 text-xs uppercase tracking-[0.22em] text-slate-300">{band}</p>
          </div>
          {!compact ? <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{detail}</p> : null}
        </div>

        <div className="relative hidden h-16 w-16 rounded-2xl border border-white/10 bg-black/20 p-2 sm:block">
          <img src={bubbleShell} alt="" className="h-full w-full object-contain pixelated opacity-90" />
          <div
            className="absolute inset-x-4 bottom-5 rounded-full"
            style={{
              height: `${16 + normalized * 16}px`,
              background: "linear-gradient(180deg, rgba(245,158,11,0.18), rgba(34,211,238,0.75))",
              boxShadow: "0 0 18px rgba(34, 211, 238, 0.28)"
            }}
          />
        </div>
      </div>

      <div className="mt-5">
        <div className="momentum-bar-track">
          <div className="momentum-bar-fill" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
          <span>Low drag</span>
          <span>Stable</span>
          <span>Locked in</span>
        </div>
      </div>
    </Card>
  );
}
