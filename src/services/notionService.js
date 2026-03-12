const DEFAULT_NOTION_API_BASE_URL = "https://step1-hq-api.ahmedadel7887.workers.dev";
const API_BASE_URL = import.meta.env.VITE_NOTION_API_BASE_URL || DEFAULT_NOTION_API_BASE_URL;

async function readJson(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

async function request(path, { method = "POST", body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "content-type": "application/json"
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload.error || `Notion request failed (${response.status}).`);
  }

  return payload;
}

export async function getNotionDashboardSnapshot() {
  const [resources, schedule, subjects, weakTopics, practiceExams] = await Promise.all([
    request("/api/notion/resources"),
    request("/api/notion/schedule"),
    request("/api/notion/subjects"),
    request("/api/notion/weak-topics"),
    request("/api/notion/practice-exams")
  ]);

  return {
    resources: resources.items || [],
    schedule: schedule || { items: [], today: null, upcoming: [], next: null },
    subjects: subjects.items || [],
    weakTopics: weakTopics.items || [],
    practiceExams: practiceExams.items || [],
    fetchedAt: new Date().toISOString()
  };
}

export async function updateNotionResourceProgress(payload) {
  const response = await request("/api/notion/resources/update", {
    body: payload
  });

  return response.item || null;
}

export async function createNotionWeakTopic(payload) {
  const response = await request("/api/notion/weak-topics/create", {
    body: payload
  });

  return response.item || null;
}

export async function upsertNotionPracticeExam(payload) {
  const response = await request("/api/notion/practice-exams/create", {
    body: payload
  });

  return response.item || null;
}
