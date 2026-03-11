import { NavLink } from "react-router-dom";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3.5 3 10.6V20a1 1 0 0 0 1 1h5.5v-6h5v6H20a1 1 0 0 0 1-1v-9.4l-9-7.1Z"
      />
    </svg>
  );
}

function PlanIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 4h12a2 2 0 0 1 2 2v12.5A1.5 1.5 0 0 1 18.5 20H5.5A1.5 1.5 0 0 1 4 18.5V6a2 2 0 0 1 2-2Zm1.5 4.5h9v-2h-9v2Zm0 4h9v-2h-9v2Zm0 4h6v-2h-6v2Z"
      />
    </svg>
  );
}

function WarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M15.6 2 8.1 9.5l-.8 4.2 4.2-.8L19 5.4 15.6 2Zm-8 9.7L2 17.3V22h4.7l5.6-5.6-4.7-4.7Z"
      />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="m15.5 4 4.5 1.8v13L15.5 17l-7 2L4 17.2v-13L8.5 6l7-2Zm-1 2.3-5 1.4v9l5-1.4v-9Zm-7 1.5-2-.8v8.8l2 .8V7.8Zm9 7.5 2 .8V7.3l-2-.8v8.8Z"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.18 7.18 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.04.24.24.42.49.42h3.8c.25 0 .45-.18.49-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
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
