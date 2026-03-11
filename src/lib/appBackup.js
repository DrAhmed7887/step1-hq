import { COMMAND_CENTER_STORAGE_KEY } from "./commandCenter.js";
import { CLOUD_SYNC_SETTINGS_KEY } from "./cloudSync.js";
import { readStorageJson, writeStorageJson } from "./persistence.js";
import { WAR_ROOM_STORAGE_KEY } from "./warRoom.js";

export const APP_BACKUP_VERSION = "1.0.0";
export const LEGACY_APP_BACKUP_VERSION = 3;
export const BACKUP_META_STORAGE_KEY = "step1-backup-meta-v1";

export function createBackupMeta() {
  return {
    lastExportAt: "",
    dismissedFor: ""
  };
}

export function hydrateBackupMeta(saved) {
  return {
    ...createBackupMeta(),
    ...(saved || {})
  };
}

function buildMomentumMap(commandCenter) {
  return Object.entries(commandCenter?.checkIns || {}).reduce((accumulator, [date, entry]) => {
    accumulator[date] = Number(entry?.momentum || 0);
    return accumulator;
  }, {});
}

function buildFaProgress(warRoom) {
  const systems = Object.entries(warRoom?.systemProgress || {}).reduce(
    (accumulator, [systemId, progress]) => {
      accumulator[systemId] = {
        faRead: Boolean(progress?.faRead),
        lastStudied: typeof progress?.lastStudied === "string" ? progress.lastStudied : "",
        notes: typeof progress?.notes === "string" ? progress.notes : ""
      };
      return accumulator;
    },
    {}
  );

  return {
    completedSystems: Object.entries(systems)
      .filter(([, progress]) => progress.faRead)
      .map(([systemId]) => systemId),
    systems
  };
}

function buildStudyPlanState(warRoom) {
  return {
    examDate: typeof warRoom?.examDate === "string" ? warRoom.examDate : "",
    dailyStart: warRoom?.dailyStart || null,
    dailyPlan: warRoom?.dailyPlan || null,
    completedResources: Array.isArray(warRoom?.completedResources) ? warRoom.completedResources : []
  };
}

function buildBackupData({ warRoom, commandCenter, syncSettings }) {
  return {
    commandCenter: commandCenter || {},
    warRoom: warRoom || {},
    momentum: buildMomentumMap(commandCenter),
    reflections: Array.isArray(commandCenter?.reflections) ? commandCenter.reflections : [],
    milestones: {
      completed: Array.isArray(commandCenter?.milestonesCompleted)
        ? commandCenter.milestonesCompleted
        : [],
      manualFlags: commandCenter?.manualMilestones || {}
    },
    nbmeAnalyses: Array.isArray(warRoom?.nbmeAnalyses) ? warRoom.nbmeAnalyses : [],
    checkInHistory: Object.values(commandCenter?.checkIns || []).sort((left, right) =>
      String(left?.date || "").localeCompare(String(right?.date || ""))
    ),
    faProgress: buildFaProgress(warRoom),
    studyPlanState: buildStudyPlanState(warRoom),
    ...(syncSettings ? { cloudSyncSettings: syncSettings } : {})
  };
}

export function createCombinedBackup({ warRoom, commandCenter, syncSettings }) {
  const exportDate = new Date().toISOString();

  return {
    appVersion: APP_BACKUP_VERSION,
    exportDate,
    data: buildBackupData({ warRoom, commandCenter, syncSettings })
  };
}

export function buildBackupFilename(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  const day = String(referenceDate.getDate()).padStart(2, "0");
  return `step1-backup-${year}-${month}-${day}.json`;
}

export function isCombinedBackup(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.appVersion === "string" &&
    value.data &&
    typeof value.data === "object"
  );
}

export function normalizeImportedBackup(value) {
  if (isCombinedBackup(value)) {
    const data = value.data || {};

    if (!data.commandCenter || !data.warRoom) {
      return null;
    }

    return {
      appVersion: value.appVersion,
      exportDate: typeof value.exportDate === "string" ? value.exportDate : "",
      commandCenter: data.commandCenter,
      warRoom: data.warRoom,
      syncSettings: data.cloudSyncSettings || null,
      data
    };
  }

  if (
    value &&
    typeof value === "object" &&
    ("warRoom" in value || "commandCenter" in value || "syncSettings" in value)
  ) {
    const commandCenter = value.commandCenter || {};
    const warRoom = value.warRoom || {};
    const syncSettings = value.syncSettings || null;

    return {
      appVersion: String(value.version || LEGACY_APP_BACKUP_VERSION),
      exportDate: typeof value.exportedAt === "string" ? value.exportedAt : "",
      commandCenter,
      warRoom,
      syncSettings,
      data: buildBackupData({ warRoom, commandCenter, syncSettings })
    };
  }

  return null;
}

export function restoreImportedBackup(payload) {
  const normalized = normalizeImportedBackup(payload);

  if (!normalized) {
    return false;
  }

  writeStorageJson(COMMAND_CENTER_STORAGE_KEY, normalized.commandCenter);
  writeStorageJson(WAR_ROOM_STORAGE_KEY, normalized.warRoom);

  if (normalized.syncSettings) {
    writeStorageJson(CLOUD_SYNC_SETTINGS_KEY, normalized.syncSettings);
  }

  return true;
}

export function recordBackupExport(exportDate = new Date().toISOString()) {
  return writeStorageJson(BACKUP_META_STORAGE_KEY, {
    lastExportAt: exportDate,
    dismissedFor: ""
  });
}

export function dismissBackupReminder(meta) {
  const current = hydrateBackupMeta(meta);
  const dismissedFor = current.lastExportAt || "never";

  return writeStorageJson(BACKUP_META_STORAGE_KEY, {
    ...current,
    dismissedFor
  });
}

export function resolveBackupReminder(meta, referenceDate = new Date()) {
  const current = hydrateBackupMeta(meta);
  const token = current.lastExportAt || "never";

  if (current.dismissedFor === token) {
    return null;
  }

  if (!current.lastExportAt) {
    return {
      ageDays: null,
      label: "never",
      message: "Last backup: never. Export your data to stay safe."
    };
  }

  const elapsed = referenceDate.getTime() - new Date(current.lastExportAt).getTime();
  const ageDays = Math.max(0, Math.floor(elapsed / 86400000));

  if (ageDays < 7) {
    return null;
  }

  return {
    ageDays,
    label: `${ageDays} day${ageDays === 1 ? "" : "s"} ago`,
    message: `Last backup: ${ageDays} days ago. Export your data to stay safe.`
  };
}

export function readBackupMeta() {
  return hydrateBackupMeta(readStorageJson(BACKUP_META_STORAGE_KEY));
}
