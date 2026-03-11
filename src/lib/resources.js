import { usePersistentState } from "./persistence";
import { useMemo } from "react";

const RESOURCES_STORAGE_KEY = "s1wr-resources-v1";

// Default core resources to seed the UI
const DEFAULT_RESOURCES = [
  {
    id: "r-uworld",
    title: "UWorld Step 1 QBank",
    type: "qbank",
    phase: "Core",
    sourceProvenance: "official_api", // It's a standard sub
    ownershipStatus: "subscription_active",
    verifiedBy: "Ahmed",
    lastChecked: new Date().toISOString(),
    status: "active", // active, parked, finished
    notes: "Main execution engine."
  },
  {
    id: "r-firstaid",
    title: "First Aid 2026",
    type: "book",
    phase: "Core",
    sourceProvenance: "offline_file",
    ownershipStatus: "owned_offline",
    verifiedBy: "Ahmed",
    lastChecked: new Date().toISOString(),
    status: "active",
    notes: "Annotating alongside UWorld."
  },
  {
    id: "r-pathoma",
    title: "Pathoma",
    type: "video",
    phase: "Secondary",
    sourceProvenance: "offline_file",
    ownershipStatus: "owned_offline",
    verifiedBy: "Ahmed",
    lastChecked: new Date().toISOString(),
    status: "active",
    notes: "Chapters 1-3 mandatory."
  }
];

export function useResources() {
  const [resources, setResources] = usePersistentState(RESOURCES_STORAGE_KEY, () => DEFAULT_RESOURCES);

  const activeCount = useMemo(() => resources.filter(r => r.status === "active").length, [resources]);

  const addResource = (newResource) => {
    setResources((prev) => [...prev, { ...newResource, id: `r-${Date.now()}` }]);
  };

  const updateResource = (id, updates) => {
    setResources((prev) => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeResource = (id) => {
    setResources((prev) => prev.filter(r => r.id !== id));
  };

  return {
    resources,
    activeCount,
    addResource,
    updateResource,
    removeResource
  };
}
