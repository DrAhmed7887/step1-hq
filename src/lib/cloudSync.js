export const CLOUD_SYNC_SETTINGS_KEY = "war-room-sync-v1";

export function createCloudSyncSettings() {
  return {
    provider: "supabase-edge",
    projectUrl: "",
    anonKey: "",
    syncKey: "",
    lastPushedAt: "",
    lastPulledAt: ""
  };
}

export function hydrateCloudSyncSettings(saved) {
  return {
    ...createCloudSyncSettings(),
    ...(saved || {})
  };
}

function buildEdgeFunctionUrl(projectUrl) {
  return `${projectUrl.replace(/\/$/, "")}/functions/v1/war-room-sync`;
}

export async function pushCloudSnapshot(settings, payload) {
  const response = await fetch(buildEdgeFunctionUrl(settings.projectUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: settings.anonKey,
      authorization: `Bearer ${settings.anonKey}`
    },
    body: JSON.stringify({
      action: "push",
      syncKey: settings.syncKey,
      payload
    })
  });

  if (!response.ok) {
    throw new Error(`Cloud push failed with ${response.status}`);
  }

  return response.json();
}

export async function pullCloudSnapshot(settings) {
  const response = await fetch(buildEdgeFunctionUrl(settings.projectUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: settings.anonKey,
      authorization: `Bearer ${settings.anonKey}`
    },
    body: JSON.stringify({
      action: "pull",
      syncKey: settings.syncKey
    })
  });

  if (!response.ok) {
    throw new Error(`Cloud pull failed with ${response.status}`);
  }

  return response.json();
}
