import { useRef, useState } from "react";
import { sections } from "../../data/warRoomData";
import {
  BACKUP_META_STORAGE_KEY,
  APP_BACKUP_VERSION,
  buildBackupFilename,
  createBackupMeta,
  createCombinedBackup,
  hydrateBackupMeta,
  normalizeImportedBackup,
  recordBackupExport,
  restoreImportedBackup
} from "../../lib/appBackup";
import {
  COMMAND_CENTER_STORAGE_KEY,
  createCommandCenterState,
  hydrateCommandCenterState
} from "../../lib/commandCenter";
import {
  CLOUD_SYNC_SETTINGS_KEY,
  createCloudSyncSettings,
  hydrateCloudSyncSettings
} from "../../lib/cloudSync";
import { downloadJson, readFileAsJson, useStorageJson } from "../../lib/persistence";
import {
  WAR_ROOM_STORAGE_KEY,
  createWarRoomState,
  hydrateWarRoomState
} from "../../lib/warRoom";

function GearIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.18 7.18 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.04.24.24.42.49.42h3.8c.25 0 .45-.18.49-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
      />
    </svg>
  );
}

function formatLastExport(meta) {
  if (!meta.lastExportAt) {
    return "No backup exported yet.";
  }

  return `Last backup: ${new Date(meta.lastExportAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null);
  const [status, setStatus] = useState({ tone: "text-mist", message: "" });
  const inputRef = useRef(null);
  const commandCenterState = useStorageJson(
    COMMAND_CENTER_STORAGE_KEY,
    createCommandCenterState,
    hydrateCommandCenterState
  );
  const warRoomState = useStorageJson(
    WAR_ROOM_STORAGE_KEY,
    () => createWarRoomState(sections),
    (saved) => hydrateWarRoomState(saved, sections)
  );
  const syncSettings = useStorageJson(
    CLOUD_SYNC_SETTINGS_KEY,
    createCloudSyncSettings,
    hydrateCloudSyncSettings
  );
  const backupMeta = useStorageJson(
    BACKUP_META_STORAGE_KEY,
    createBackupMeta,
    hydrateBackupMeta
  );

  function handleExport() {
    const payload = createCombinedBackup({
      warRoom: warRoomState,
      commandCenter: commandCenterState,
      syncSettings
    });

    downloadJson(buildBackupFilename(new Date(payload.exportDate)), payload);
    recordBackupExport(payload.exportDate);
    setStatus({
      tone: "text-teal",
      message: `Backup exported (${APP_BACKUP_VERSION}).`
    });
  }

  async function handleImportSelection(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const payload = await readFileAsJson(file);
      const normalized = normalizeImportedBackup(payload);

      if (!normalized) {
        throw new Error("Invalid backup file");
      }

      setPendingRestore(normalized);
      setStatus({ tone: "text-mist", message: "" });
    } catch {
      setPendingRestore(null);
      setStatus({ tone: "text-coral", message: "Invalid backup file" });
    } finally {
      event.target.value = "";
    }
  }

  function confirmRestore() {
    if (!pendingRestore) {
      return;
    }

    restoreImportedBackup(pendingRestore);
    window.location.reload();
  }

  return (
    <>
      <button
        type="button"
        className="button-secondary h-11 w-11 rounded-full p-0"
        aria-label="Open Settings"
        onClick={() => setOpen(true)}
      >
        <GearIcon />
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        data-settings-import-input="true"
        onChange={handleImportSelection}
      />

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="panel w-full max-w-lg p-5 sm:p-6" data-settings-panel="true">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber">Settings</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Backup and restore</h2>
                <p className="mt-2 text-sm leading-6 text-mist">
                  Export the full local study state to JSON, or restore it on another device.
                </p>
              </div>
              <button
                type="button"
                className="button-secondary rounded-full px-3 py-2"
                onClick={() => {
                  setOpen(false);
                  setPendingRestore(null);
                }}
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-line bg-white/5 p-4 text-sm text-slate-300">
              <p>{formatLastExport(backupMeta)}</p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" className="button-primary" onClick={handleExport}>
                Export Backup
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => inputRef.current?.click()}
              >
                Restore Backup
              </button>
            </div>

            {status.message ? (
              <p className={`mt-4 text-sm ${status.tone}`} data-settings-status="true">
                {status.message}
              </p>
            ) : null}
          </div>

          {pendingRestore ? (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 px-4">
              <div className="panel w-full max-w-md p-5 sm:p-6" data-restore-confirmation="true">
                <p className="text-xs uppercase tracking-[0.2em] text-coral">Restore Backup</p>
                <p className="mt-3 text-lg font-semibold text-white">
                  This will replace all current data. Are you sure?
                </p>
                <p className="mt-3 text-sm leading-6 text-mist">
                  Export date: {pendingRestore.exportDate || "Unknown"}.
                </p>
                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setPendingRestore(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    data-confirm-restore="true"
                    onClick={confirmRestore}
                  >
                    Replace Current Data
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
