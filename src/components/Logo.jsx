function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export function LogoMark({ className = "", title = "Step 1 HQ" }) {
  return (
    <svg
      viewBox="0 0 128 128"
      className={classNames("h-12 w-12", className)}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id="logo-shield" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#152338" />
          <stop offset="100%" stopColor="#0a101a" />
        </linearGradient>
        <linearGradient id="logo-edge" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      <path
        d="M64 8 101 22v34c0 24.5-14.8 46.9-37 56-22.2-9.1-37-31.5-37-56V22L64 8Z"
        fill="url(#logo-shield)"
        stroke="url(#logo-edge)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="m47 41 34 34"
        stroke="#f6f7fb"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="m82 38-8 5 3 6-14 14-6-3-5 8"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m40 80 14-14"
        stroke="#f59e0b"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="39" cy="81" r="6" fill="none" stroke="#f59e0b" strokeWidth="4" />
      <path
        d="M43 53h42"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
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

