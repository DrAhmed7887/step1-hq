import { useEffect, useState } from "react";
import {
  createNotionWeakTopic,
  getNotionDashboardSnapshot,
  updateNotionResourceProgress,
  upsertNotionPracticeExam
} from "../services/notionService";
import { readStorageJson, useStorageJson, writeStorageJson } from "./persistence";

export const NOTION_CACHE_STORAGE_KEY = "war-room-notion-cache-v1";
export const NOTION_STATUS_STORAGE_KEY = "war-room-notion-status-v1";

export function createNotionCache() {
  return {
    resources: [],
    schedule: {
      items: [],
      today: null,
      upcoming: [],
      next: null
    },
    subjects: [],
    weakTopics: [],
    practiceExams: [],
    fetchedAt: "",
    source: "offline"
  };
}

export function hydrateNotionCache(saved) {
  return {
    ...createNotionCache(),
    ...(saved || {}),
    schedule: {
      ...createNotionCache().schedule,
      ...(saved?.schedule || {})
    }
  };
}

export function createNotionStatus() {
  return {
    connected: false,
    state: "idle",
    message: "Waiting to sync Notion",
    lastCheckedAt: "",
    lastSyncedAt: ""
  };
}

export function hydrateNotionStatus(saved) {
  return {
    ...createNotionStatus(),
    ...(saved || {})
  };
}

function writeNotionStatus(partial) {
  const nextStatus = {
    ...hydrateNotionStatus(readStorageJson(NOTION_STATUS_STORAGE_KEY)),
    ...partial
  };
  writeStorageJson(NOTION_STATUS_STORAGE_KEY, nextStatus);
  return nextStatus;
}

function writeNotionCache(snapshot) {
  const nextCache = {
    ...createNotionCache(),
    ...snapshot
  };
  writeStorageJson(NOTION_CACHE_STORAGE_KEY, nextCache);
  return nextCache;
}

export async function refreshNotionCache() {
  writeNotionStatus({
    state: "syncing",
    message: "Syncing Notion…"
  });

  try {
    const snapshot = await getNotionDashboardSnapshot();
    const nextCache = writeNotionCache({
      ...snapshot,
      source: "notion"
    });
    const now = new Date().toISOString();

    writeNotionStatus({
      connected: true,
      state: "connected",
      message: "Notion connected",
      lastCheckedAt: now,
      lastSyncedAt: now
    });

    return nextCache;
  } catch (error) {
    const existingCache = hydrateNotionCache(readStorageJson(NOTION_CACHE_STORAGE_KEY));
    const now = new Date().toISOString();

    writeNotionStatus({
      connected: false,
      state: "offline",
      message: existingCache.fetchedAt
        ? "Notion offline, using cached data"
        : "Notion offline",
      lastCheckedAt: now
    });

    return existingCache;
  }
}

export function useNotionCache() {
  return useStorageJson(
    NOTION_CACHE_STORAGE_KEY,
    createNotionCache,
    hydrateNotionCache
  );
}

export function useNotionStatus() {
  return useStorageJson(
    NOTION_STATUS_STORAGE_KEY,
    createNotionStatus,
    hydrateNotionStatus
  );
}

export function useNotionBridge({ autoRefresh = false } = {}) {
  const cache = useNotionCache();
  const status = useNotionStatus();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!autoRefresh) {
      return undefined;
    }

    let active = true;

    setLoading(true);
    refreshNotionCache()
      .catch(() => {})
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [autoRefresh]);

  async function refresh() {
    setLoading(true);

    try {
      return await refreshNotionCache();
    } finally {
      setLoading(false);
    }
  }

  return {
    cache,
    status,
    loading,
    refresh
  };
}

export async function syncNotionResourceProgress(payload) {
  const item = await updateNotionResourceProgress(payload);
  await refreshNotionCache();
  return item;
}

export async function syncNotionWeakTopic(payload) {
  const item = await createNotionWeakTopic(payload);
  await refreshNotionCache();
  return item;
}

export async function syncNotionPracticeExam(payload) {
  const item = await upsertNotionPracticeExam(payload);
  await refreshNotionCache();
  return item;
}
