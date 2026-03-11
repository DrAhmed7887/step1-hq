import { NavLink } from "react-router-dom";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.8 18.5 5v5.9c0 4.4-2.7 8.4-6.5 10.1C8.2 19.3 5.5 15.3 5.5 10.9V5L12 2.8Zm0 3.1-3.7 1.3v3.7c0 2.9 1.5 5.5 3.7 6.9 2.2-1.4 3.7-4 3.7-6.9V7.2L12 5.9Zm-1.6 2.8h3.2V10h-3.2V8.7Zm0 2.7h3.2v1.3h-3.2v-1.3Z"
      />
    </svg>
  );
}

function PlanIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 3.5h10A2.5 2.5 0 0 1 19.5 6v13A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V6A2.5 2.5 0 0 1 7 3.5Zm1.5 4h7v-1.5h-7v1.5Zm0 4h3.2l1.1 1.2 2.8-3 .9.8-3.7 4-1.7-1.7H8.5v-1.3Zm0 4h3.2l1.1 1.2 2.8-3 .9.8-3.7 4-1.7-1.7H8.5v-1.3Z"
      />
    </svg>
  );
}

function WarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3a9 9 0 1 0 9 9h-2.2a6.8 6.8 0 1 1-2-4.8l-2 2H21V3l-2.7 2.7A8.96 8.96 0 0 0 12 3Zm0 5.2a3.8 3.8 0 1 0 3.8 3.8h-1.9A1.9 1.9 0 1 1 12 10.1V8.2Z"
      />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="m12 2 6 6-6 14L6 8l6-6Zm0 4.1L9.1 9 12 16l2.9-7L12 6.1Zm0-1.7 1.7 1.7L12 7.8l-1.7-1.7L12 4.4Z"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="m20.4 6.4-2.8-2.8-1.9 1.9 1 1-3.2 3.2a4.2 4.2 0 0 0-1.5-.3 4.2 4.2 0 1 0 4.2 4.2c0-.5-.1-1-.3-1.5l3.2-3.2 1 1 1.9-1.9ZM8 17a2.3 2.3 0 1 1 0-4.6A2.3 2.3 0 0 1 8 17Z"
      />
    </svg>
  );
}

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function NavTab({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        classNames("bottom-nav-item", isActive ? "bottom-nav-item-active" : "")
      }
    >
      <Icon />
      <span className="bottom-nav-label">{label}</span>
    </NavLink>
  );
}

export default function BottomNav() {
  return (
    <nav className="bottom-nav-shell" aria-label="Primary navigation">
      <div className="bottom-nav">
        <NavTab to="/" label="Home" icon={HomeIcon} />
        <NavTab to="/plan" label="Plan" icon={PlanIcon} />
        <NavTab to="/war-room" label="War" icon={WarIcon} />
        <NavTab to="/map" label="Map" icon={MapIcon} />
        <NavTab to="/settings" label="Set" icon={SettingsIcon} />
      </div>
    </nav>
  );
}
