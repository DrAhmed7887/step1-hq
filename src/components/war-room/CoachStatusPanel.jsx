function ForecastBadge({ forecast }) {
  if (!forecast || forecast.level === "insufficient_data") {
    return (
      <div className="rounded-2xl border border-line bg-white/5 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.18em] text-mist">Pass signal</p>
        <p className="mt-2 text-sm font-semibold text-white">Insufficient data</p>
        <p className="mt-1 text-xs text-slate-400">Log a study block or assessment first.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-mist">Pass signal</p>
      <p className={`mt-2 text-2xl font-bold ${forecast.color}`}>{forecast.probability}%</p>
      <p className="mt-1 text-xs capitalize text-slate-400">{forecast.level.replaceAll("_", " ")}</p>
    </div>
  );
}

export default function CoachStatusPanel({ plan, onReturnToCoach }) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-amber">Coach snapshot</p>
          <h2 className="text-2xl font-bold text-white">
            {plan.focus.primary.section.name} is the current target.
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-mist">{plan.message}</p>
        </div>
        <button type="button" className="button-secondary" onClick={onReturnToCoach}>
          Open coach
        </button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr,1fr,0.9fr]">
        <div className="rounded-2xl border border-line bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-mist">Phase</p>
          <p className="mt-2 text-lg font-semibold text-white">{plan.phase.label}</p>
          <p className="mt-1 text-xs text-slate-400">{plan.daysLeft} days left</p>
        </div>
        <div className="rounded-2xl border border-line bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-mist">Next 30</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {plan.nextThirty?.title || "No task generated"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {plan.nextThirty?.minutes ? `${plan.nextThirty.minutes} min` : "Run today’s check-in"}
          </p>
        </div>
        <ForecastBadge forecast={plan.forecast} />
      </div>
    </section>
  );
}
