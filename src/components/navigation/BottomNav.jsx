import { NavLink } from "react-router-dom";
import SettingsPanel from "../settings/SettingsPanel";

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

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function NavTab({ to, label, kicker, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        classNames("bottom-nav-item", isActive ? "bottom-nav-item-active" : "")
      }
    >
      <Icon />
      <span className="bottom-nav-label">{label}</span>
      <span className="bottom-nav-kicker">{kicker}</span>
    </NavLink>
  );
}

export default function BottomNav() {
  return (
    <nav className="bottom-nav-shell" aria-label="Primary navigation">
      <div className="bottom-nav">
        <NavTab to="/command-center" label="HQ" kicker="Command" icon={HomeIcon} />
        <NavTab to="/war-room" label="War" kicker="Room" icon={WarIcon} />
        <SettingsPanel
          ariaLabel="Open Settings"
          triggerClassName="bottom-nav-item"
          triggerContent={
            <>
              <span className="inline-flex h-5 w-5 items-center justify-center text-current">⚙</span>
              <span className="bottom-nav-label">Set</span>
              <span className="bottom-nav-kicker">tings</span>
            </>
          }
        />
      </div>
    </nav>
  );
}
