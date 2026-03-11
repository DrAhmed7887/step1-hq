import { lazy, Suspense } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";

const WarRoomPage = lazy(() => import("./pages/WarRoomPage"));
const CommandCenterPage = lazy(() => import("./pages/CommandCenterPage"));
const ResourcesPage = lazy(() => import("./pages/ResourcesPage"));

const pages = [
  {
    to: "/war-room",
    label: "War Room",
    kicker: "Study engine",
    description: "Topics, missed questions, NBME readiness, AI quiz tooling."
  },
  {
    to: "/command-center",
    label: "Command Center",
    kicker: "Life ops",
    description: "Schedule, tasks, goals, notes, and focus blocks."
  },
  {
    to: "/resources",
    label: "Study Stack",
    kicker: "Curriculum",
    description: "Manage study assets, provenance, and active constraints."
  }
];

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-grid [background-size:42px_42px]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <header className="panel overflow-hidden">
          <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[1.25fr,0.85fr]">
            <div className="space-y-4">
              <div className="pill border-coral/30 text-coral">Standalone Vite build</div>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  USMLE Step 1 coaching engine with a physician-parent command surface.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-mist sm:text-base">
                  Local-first, routed, offline-capable, and centered on a daily coach that
                  recalculates the study plan from energy, available hours, weak systems, and exam phase.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {pages.map((page) => (
                <NavLink
                  key={page.to}
                  to={page.to}
                  className={({ isActive }) =>
                    `panel-soft flex flex-col gap-2 px-4 py-4 transition ${
                      isActive ? "border-coral/60 bg-coral/10" : "hover:border-amber/30 hover:bg-white/10"
                    }`
                  }
                >
                  <span className="text-xs uppercase tracking-[0.18em] text-mist">{page.kicker}</span>
                  <span className="text-lg font-semibold text-white">{page.label}</span>
                  <span className="text-sm leading-6 text-slate-300">{page.description}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </header>
        <main className="pb-8">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<div className="panel px-6 py-10 text-sm text-mist">Loading page…</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/command-center" replace />} />
          <Route path="/war-room" element={<WarRoomPage />} />
          <Route path="/command-center" element={<CommandCenterPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="*" element={<Navigate to="/command-center" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
