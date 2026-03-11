import { useEffect, useRef, useState } from "react";
import {
  APP_BACKUP_VERSION,
  BACKUP_META_STORAGE_KEY,
  buildBackupFilename,
  createBackupMeta,
  createCombinedBackup,
  hydrateBackupMeta,
  normalizeImportedBackup,
  recordBackupExport,
  restoreImportedBackup
} from "../lib/appBackup";
import {
  CLOUD_SYNC_SETTINGS_KEY,
  createCloudSyncSettings,
  hydrateCloudSyncSettings,
  pullCloudSnapshot,
  pushCloudSnapshot
} from "../lib/cloudSync";
import {
  COMMAND_CENTER_STORAGE_KEY,
  createCommandCenterState,
  hydrateCommandCenterState
} from "../lib/commandCenter";
import {
  downloadJson,
  readFileAsJson,
  usePersistentState,
  useStorageJson
} from "../lib/persistence";
import { TUTOR_HISTORY_STORAGE_KEY } from "../lib/tutor";
import {
  WAR_ROOM_STORAGE_KEY,
  createWarRoomState,
  hydrateWarRoomState
} from "../lib/warRoom";
import { sections } from "../data/warRoomData";

function formatTimestamp(value, emptyLabel) {
  if (!value) {
    return emptyLabel;
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function lastSyncLabel(settings) {
  const timestamps = [settings.lastPushedAt, settings.lastPulledAt].filter(Boolean).sort();

  if (!timestamps.length) {
    return "Never synced";
  }

  return formatTimestamp(timestamps.at(-1), "Never synced");
}

export default function SettingsPage() {
  const inputRef = useRef(null);
  const [commandCenterState, setCommandCenterState] = usePersistentState(
    COMMAND_CENTER_STORAGE_KEY,
    createCommandCenterState,
    hydrateCommandCenterState
  );
  const [warRoomState, setWarRoomState] = usePersistentState(
    WAR_ROOM_STORAGE_KEY,
    () => createWarRoomState(sections),
    (saved) => hydrateWarRoomState(saved, sections)
  );
  const [cloudSettings, setCloudSettings] = usePersistentState(
    CLOUD_SYNC_SETTINGS_KEY,
    createCloudSyncSettings,
    hydrateCloudSyncSettings
  );
  const backupMeta = useStorageJson(
    BACKUP_META_STORAGE_KEY,
    createBackupMeta,
    hydrateBackupMeta
  );
  const [pendingRestore, setPendingRestore] = useState(null);
  const [backupStatus, setBackupStatus] = useState({ tone: "text-mist", message: "" });
  const [syncStatus, setSyncStatus] = useState({ tone: "text-mist", message: "" });
  const [tutorApiKeyDraft, setTutorApiKeyDraft] = useState(
    warRoomState.tutorSettings?.apiKey || ""
  );
  const [tutorStatus, setTutorStatus] = useState({ tone: "text-mist", message: "" });

  useEffect(() => {
    setTutorApiKeyDraft(warRoomState.tutorSettings?.apiKey || "");
  }, [warRoomState.tutorSettings?.apiKey]);

  function handleExport() {
    const payload = createCombinedBackup({
      warRoom: warRoomState,
      commandCenter: commandCenterState,
      syncSettings: cloudSettings
    });

    downloadJson(buildBackupFilename(new Date(payload.exportDate)), payload);
    recordBackupExport(payload.exportDate);
    setBackupStatus({
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
      setBackupStatus({ tone: "text-mist", message: "" });
    } catch {
      setPendingRestore(null);
      setBackupStatus({ tone: "text-coral", message: "Invalid backup file" });
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

  async function pushToCloud() {
    if (!cloudSettings.projectUrl || !cloudSettings.anonKey || !cloudSettings.syncKey) {
      setSyncStatus({
        tone: "text-coral",
        message: "Add project URL, anon key, and sync key first."
      });
      return;
    }

    setSyncStatus({ tone: "text-mist", message: "Pushing snapshot..." });

    try {
      await pushCloudSnapshot(
        cloudSettings,
        createCombinedBackup({
          warRoom: warRoomState,
          commandCenter: commandCenterState,
          syncSettings: cloudSettings
        })
      );
      setCloudSettings((current) => ({
        ...current,
        lastPushedAt: new Date().toISOString()
      }));
      setSyncStatus({
        tone: "text-mint",
        message: "Cloud snapshot pushed."
      });
    } catch (error) {
      setSyncStatus({
        tone: "text-coral",
        message: error.message || "Cloud push failed."
      });
    }
  }

  async function pullFromCloud() {
    if (!cloudSettings.projectUrl || !cloudSettings.anonKey || !cloudSettings.syncKey) {
      setSyncStatus({
        tone: "text-coral",
        message: "Add project URL, anon key, and sync key first."
      });
      return;
    }

    setSyncStatus({ tone: "text-mist", message: "Pulling snapshot..." });

    try {
      const response = await pullCloudSnapshot(cloudSettings);
      const payload = normalizeImportedBackup(response.payload);

      if (!payload?.warRoom) {
        throw new Error("No remote payload found for that sync key.");
      }

      setWarRoomState(hydrateWarRoomState(payload.warRoom, sections));

      if (payload.commandCenter) {
        setCommandCenterState(hydrateCommandCenterState(payload.commandCenter));
      }

      if (payload.syncSettings) {
        setCloudSettings(hydrateCloudSyncSettings(payload.syncSettings));
      }

      setCloudSettings((current) => ({
        ...current,
        lastPulledAt: new Date().toISOString()
      }));
      setSyncStatus({
        tone: "text-mint",
        message: "Cloud snapshot pulled."
      });
    } catch (error) {
      setSyncStatus({
        tone: "text-coral",
        message: error.message || "Cloud pull failed."
      });
    }
  }

  function resetApp() {
    const confirmed = window.confirm("Reset the app and clear all local data?");

    if (!confirmed) {
      return;
    }

    [
      COMMAND_CENTER_STORAGE_KEY,
      WAR_ROOM_STORAGE_KEY,
      CLOUD_SYNC_SETTINGS_KEY,
      BACKUP_META_STORAGE_KEY,
      TUTOR_HISTORY_STORAGE_KEY,
      "s1wr-v2",
      "s1wr-resources-v1"
    ].forEach((key) => window.localStorage.removeItem(key));

    window.location.reload();
  }

  function saveTutorKey() {
    setWarRoomState((current) => ({
      ...current,
      tutorSettings: {
        ...current.tutorSettings,
        apiKey: tutorApiKeyDraft.trim()
      }
    }));
    setTutorStatus({
      tone: tutorApiKeyDraft.trim() ? "text-teal" : "text-mist",
      message: tutorApiKeyDraft.trim() ? "Gemini key saved locally." : "Gemini key cleared."
    });
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        data-settings-import-input="true"
        onChange={handleImportSelection}
      />

      <div className="page-stagger space-y-6">
        <section className="hero-card">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="pill">Set</div>
              <p className="text-xs uppercase tracking-[0.22em] text-mist">Configuration</p>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Settings
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-mist">
                Sync, backups, exam configuration, and the few controls that should stay out of the daily flow.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <section className="panel p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-teal">Cloud Sync</p>
            <p className="mt-2 text-2xl font-bold text-white">Remote snapshot</p>
            <p className="mt-2 text-sm leading-6 text-mist">
              Optional Supabase Edge sync for cross-device copies.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs uppercase text-mist" htmlFor="cloud-project-url">
                  Project URL
                </label>
                <input
                  id="cloud-project-url"
                  className="field"
                  value={cloudSettings.projectUrl}
                  onChange={(event) =>
                    setCloudSettings((current) => ({
                      ...current,
                      projectUrl: event.target.value
                    }))
                  }
                  placeholder="https://your-project.supabase.co"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase text-mist" htmlFor="cloud-anon-key">
                  Anon Key
                </label>
                <input
                  id="cloud-anon-key"
                  className="field"
                  value={cloudSettings.anonKey}
                  onChange={(event) =>
                    setCloudSettings((current) => ({
                      ...current,
                      anonKey: event.target.value
                    }))
                  }
                  placeholder="Paste the public anon key"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase text-mist" htmlFor="cloud-sync-key">
                  Sync Key
                </label>
                <input
                  id="cloud-sync-key"
                  className="field"
                  value={cloudSettings.syncKey}
                  onChange={(event) =>
                    setCloudSettings((current) => ({
                      ...current,
                      syncKey: event.target.value
                    }))
                  }
                  placeholder="Private snapshot identifier"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="button" className="button-primary" onClick={pushToCloud}>
                  Push Snapshot
                </button>
                <button type="button" className="button-secondary" onClick={pullFromCloud}>
                  Pull Snapshot
                </button>
              </div>

              <div className="rounded-2xl border border-line bg-white/5 p-4 text-sm text-slate-300">
                <p>Last synced: {lastSyncLabel(cloudSettings)}</p>
                <p className="mt-2 text-mist">
                  Last push: {formatTimestamp(cloudSettings.lastPushedAt, "never")} · Last pull:{" "}
                  {formatTimestamp(cloudSettings.lastPulledAt, "never")}
                </p>
                {syncStatus.message ? (
                  <p className={`mt-3 ${syncStatus.tone}`}>{syncStatus.message}</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-amber">Local Backup</p>
            <p className="mt-2 text-2xl font-bold text-white">Export and restore</p>
            <p className="mt-2 text-sm leading-6 text-mist">
              Local JSON stays the primary safety net.
            </p>

            <div className="mt-5 rounded-2xl border border-line bg-white/5 p-4 text-sm text-slate-300">
              <p>Last backup: {formatTimestamp(backupMeta.lastExportAt, "never")}</p>
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

            {backupStatus.message ? (
              <p className={`mt-4 text-sm ${backupStatus.tone}`} data-settings-status="true">
                {backupStatus.message}
              </p>
            ) : null}
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <section className="panel p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-calm">Exam Configuration</p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs uppercase text-mist" htmlFor="exam-date">
                  Exam date
                </label>
                <input
                  id="exam-date"
                  type="date"
                  className="field"
                  value={warRoomState.examDate}
                  onChange={(event) =>
                    setWarRoomState((current) => ({
                      ...current,
                      examDate: event.target.value
                    }))
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase text-mist" htmlFor="study-order">
                  Study order
                </label>
                <select
                  id="study-order"
                  className="field"
                  value={commandCenterState.studyOrderPreference || "traditional"}
                  onChange={(event) =>
                    setCommandCenterState((current) => ({
                      ...current,
                      studyOrderPreference: event.target.value
                    }))
                  }
                >
                  <option value="traditional">Traditional</option>
                  <option value="marathoprint">Marathoprint</option>
                </select>
              </div>
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-teal">Preferences</p>
            <div className="mt-5 space-y-4">
              <label className="flex items-center gap-3 rounded-2xl border border-line bg-white/5 px-4 py-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={Boolean(commandCenterState.settings?.celebrationSoundEnabled)}
                  onChange={(event) =>
                    setCommandCenterState((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        celebrationSoundEnabled: event.target.checked
                      }
                    }))
                  }
                />
                Celebration sounds
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-line bg-white/5 px-4 py-3 text-sm text-slate-500">
                <input type="checkbox" checked readOnly disabled />
                Auto-generate plan on Home check-in
              </label>
            </div>
          </section>
        </div>

        <section className="panel p-5 sm:p-6">
          <p className="war-display text-xs uppercase tracking-[0.24em] text-teal">
            AI Tutor Configuration
          </p>
          <p className="mt-2 text-2xl font-bold text-white">Gemini access</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">
            Stored locally on this device only. The tutor button appears on the Plan screen once a key is set.
          </p>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr,auto] xl:items-end">
            <div>
              <label className="mb-1 block text-xs uppercase text-mist" htmlFor="tutor-api-key">
                Gemini API Key
              </label>
              <input
                id="tutor-api-key"
                type="password"
                className="field"
                value={tutorApiKeyDraft}
                onChange={(event) => setTutorApiKeyDraft(event.target.value)}
                placeholder="AIza..."
              />
            </div>
            <button type="button" className="button-primary" onClick={saveTutorKey}>
              Save Key
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-line bg-white/5 p-4 text-sm text-slate-300">
            <p>Local only. Never sent to the app servers.</p>
            {tutorStatus.message ? (
              <p className={`mt-2 ${tutorStatus.tone}`}>{tutorStatus.message}</p>
            ) : null}
          </div>
        </section>

        <section className="panel p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-coral">Data</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-white">Clear all local data</p>
              <p className="mt-1 text-sm text-mist">
                Removes study state, backups metadata, sync settings, and resources from this device.
              </p>
            </div>
            <button type="button" className="button-secondary" onClick={resetApp}>
              Reset App
            </button>
          </div>
        </section>
      </div>

      {pendingRestore ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
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
    </>
  );
}
