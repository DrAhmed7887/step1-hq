import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import BottomNav from "./components/navigation/BottomNav";

const HomePage = lazy(() => import("./pages/HomePage"));
const PlanPage = lazy(() => import("./pages/PlanPage"));
const WarRoomPage = lazy(() => import("./pages/WarRoomPage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ResourcesPage = lazy(() => import("./pages/ResourcesPage"));

function Layout({ children }) {
  return (
    <div className="app-shell">
      <div className="ambient-orb ambient-orb-one" />
      <div className="ambient-orb ambient-orb-two" />
      <div className="ambient-grid" />
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <main className="page-surface">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <div key={location.pathname} className="page-fade">
      <Routes location={location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/war-room" element={<WarRoomPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/command-center" element={<Navigate to="/" replace />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<div className="panel px-6 py-10 text-sm text-mist">Loading page…</div>}>
        <AnimatedRoutes />
      </Suspense>
    </Layout>
  );
}
