import logoAsset from "../assets/logo.svg";

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export function LogoMark({ className = "", title = "Step 1 HQ" }) {
  return (
    <img
      src={logoAsset}
      alt={title}
      className={classNames("h-12 w-12 rounded-[1rem] shadow-[0_18px_40px_rgba(7,17,29,0.4)]", className)}
    />
  );
}

export default function Logo({ className = "", compact = false }) {
  return (
    <div className={classNames("inline-flex items-center gap-3", className)}>
      <LogoMark className={compact ? "h-14 w-14" : "h-16 w-16"} />
      <div className="min-w-0">
        <p className="war-display text-lg leading-none text-white sm:text-xl">STEP 1 HQ</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.26em] text-mist">
          War Room Command
        </p>
      </div>
    </div>
  );
}
