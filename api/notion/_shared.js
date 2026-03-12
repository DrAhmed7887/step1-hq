import notionSdk from "@notionhq/client";

const {
  Client,
  collectPaginatedAPI,
  isFullPage
} = notionSdk;

const DEFAULT_PARENT_PAGE_ID = "d8011d2b-2469-83a5-9d56-011480c17407";
const DEFAULT_ALLOWED_ORIGIN = "https://step1-hq.ahmedadel7887.workers.dev";

const DATABASE_TITLES = {
  resources: "📊 Resource Tracker",
  schedule: "🗓️ Master Schedule",
  subjects: "📚 Study Stack — Systems Command",
  weakTopics: "🔥 Weak Topics Queue",
  practiceExams: "🎯 NBME Tracker"
};

const DATABASE_ENV_KEYS = {
  resources: "NOTION_RESOURCE_TRACKER_DB_ID",
  schedule: "NOTION_MASTER_SCHEDULE_DB_ID",
  subjects: "NOTION_SUBJECTS_DB_ID",
  weakTopics: "NOTION_WEAK_TOPICS_DB_ID",
  practiceExams: "NOTION_PRACTICE_EXAMS_DB_ID"
};

const SYSTEM_NAME_OVERRIDES = {
  GI: "GI",
  Gastrointestinal: "GI",
  "Heme / Onc": "Heme/Onc",
  "Hematology/Oncology": "Heme/Onc",
  "MSK / Skin / CT": "MSK/Derm",
  "MSK/Skin/Connective Tissue": "MSK/Derm",
  "Pub Health / Biostats": "Public Health",
  "Public Health Sciences": "Public Health",
  Free120: "Free 120 (New)"
};

const databaseIdCache = new Map();

function runtimeEnv() {
  if (globalThis.__NOTION_ENV__) {
    return globalThis.__NOTION_ENV__;
  }

  if (typeof process !== "undefined" && process.env) {
    return process.env;
  }

  return {};
}

export function setRuntimeEnv(env = {}) {
  globalThis.__NOTION_ENV__ = env;
}

function readEnv(name, fallback = "") {
  const env = runtimeEnv();
  const value = env?.[name];
  return value == null || value === "" ? fallback : value;
}

function notionClient() {
  const token = readEnv("NOTION_TOKEN");

  if (!token) {
    throw new Error("NOTION_TOKEN is not configured on the server.");
  }

  return new Client({ auth: token });
}

function parentPageId() {
  return readEnv("NOTION_PARENT_PAGE_ID", DEFAULT_PARENT_PAGE_ID);
}

function allowedOrigin() {
  return readEnv("NOTION_ALLOWED_ORIGIN", DEFAULT_ALLOWED_ORIGIN);
}

function applyCors(response) {
  response.setHeader("Access-Control-Allow-Origin", allowedOrigin());
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export function sendJson(response, status, payload) {
  applyCors(response);
  response.status(status).setHeader("content-type", "application/json");
  return response.send(JSON.stringify(payload));
}

export async function parseBody(request) {
  if (request.body == null) {
    return {};
  }

  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch {
      return {};
    }
  }

  return request.body;
}

export function handlePreflight(request, response) {
  if (request.method !== "OPTIONS") {
    return false;
  }

  applyCors(response);
  response.status(204).end();
  return true;
}

export function normalizeSystemName(value) {
  return SYSTEM_NAME_OVERRIDES[value] || value || "";
}

function plainText(items) {
  return (items || []).map((item) => item.plain_text || "").join("");
}

function titleValue(page, propertyName) {
  return plainText(page.properties?.[propertyName]?.title || []);
}

function richTextValue(page, propertyName) {
  return plainText(page.properties?.[propertyName]?.rich_text || []);
}

function selectValue(page, propertyName) {
  return page.properties?.[propertyName]?.select?.name || "";
}

function checkboxValue(page, propertyName) {
  return Boolean(page.properties?.[propertyName]?.checkbox);
}

function numberValue(page, propertyName) {
  const value = page.properties?.[propertyName]?.number;
  return Number.isFinite(value) ? value : 0;
}

function dateValue(page, propertyName) {
  return page.properties?.[propertyName]?.date?.start || "";
}

function formulaValue(page, propertyName) {
  const formula = page.properties?.[propertyName]?.formula;

  if (!formula) {
    return "";
  }

  if (formula.type === "string") {
    return formula.string || "";
  }

  if (formula.type === "number") {
    return Number.isFinite(formula.number) ? formula.number : 0;
  }

  if (formula.type === "boolean") {
    return Boolean(formula.boolean);
  }

  if (formula.type === "date") {
    return formula.date?.start || "";
  }

  return "";
}

async function findDatabaseByTitle(client, title) {
  const query = title.replace(/^[^A-Za-z0-9]+/u, "").trim() || title;
  const results = await collectPaginatedAPI(client.search, {
    query,
    filter: { property: "object", value: "database" },
    page_size: 100
  });

  for (const result of results) {
    if (plainText(result.title) !== title) {
      continue;
    }

    if (result.parent?.type !== "page_id") {
      continue;
    }

    if (result.parent.page_id !== parentPageId()) {
      continue;
    }

    return result.id;
  }

  return null;
}

export async function resolveDataSourceId(key) {
  const envKey = DATABASE_ENV_KEYS[key];
  const envValue = envKey ? process.env[envKey] : "";

  if (envValue) {
    return envValue;
  }

  if (databaseIdCache.has(key)) {
    return databaseIdCache.get(key);
  }

  const title = DATABASE_TITLES[key];

  if (!title) {
    throw new Error(`No Notion database title configured for "${key}".`);
  }

  const id = await findDatabaseByTitle(notionClient(), title);

  if (!id) {
    throw new Error(`Could not find the "${title}" database under the configured parent page.`);
  }

  databaseIdCache.set(key, id);
  return id;
}

export async function queryDataSourcePages(key) {
  const client = notionClient();
  const databaseId = await resolveDataSourceId(key);
  const results = await collectPaginatedAPI(client.databases.query, {
    database_id: databaseId,
    page_size: 100
  });

  return results.filter(isFullPage);
}

export async function findPageInDataSource(key, predicate) {
  const pages = await queryDataSourcePages(key);
  return pages.find(predicate) || null;
}

export async function listResources() {
  return (await queryDataSourcePages("resources"))
    .map(mapResource)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function listScheduleSnapshot() {
  return scheduleSnapshot((await queryDataSourcePages("schedule")).map(mapScheduleItem));
}

export async function listSubjects() {
  return (await queryDataSourcePages("subjects"))
    .map(mapSubject)
    .sort((left, right) => left.system.localeCompare(right.system));
}

export async function listWeakTopics() {
  return (await queryDataSourcePages("weakTopics"))
    .map(mapWeakTopic)
    .sort((left, right) => right.dateAdded.localeCompare(left.dateAdded));
}

export async function listPracticeExams() {
  return (await queryDataSourcePages("practiceExams"))
    .map(mapPracticeExam)
    .sort((left, right) => right.date.localeCompare(left.date));
}

export function mapResource(page) {
  const total = numberValue(page, "Total Units");
  const completed = numberValue(page, "Completed");
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    id: page.id,
    name: titleValue(page, "Resource"),
    type: selectValue(page, "Type"),
    completed,
    total,
    unit: richTextValue(page, "Unit"),
    priority: selectValue(page, "Priority"),
    status: selectValue(page, "Status"),
    startWeek: numberValue(page, "Start Week"),
    progressPct,
    progressBar: formulaValue(page, "Progress Bar")
  };
}

export function mapScheduleItem(page) {
  return {
    id: page.id,
    label: titleValue(page, "Day"),
    date: dateValue(page, "Date"),
    week: numberValue(page, "Week"),
    phase: selectValue(page, "Phase"),
    system: normalizeSystemName(selectValue(page, "System")),
    faPages: richTextValue(page, "FA Pages"),
    tasks: richTextValue(page, "Tasks"),
    done: checkboxValue(page, "Done"),
    checkpoint: checkboxValue(page, "Is Checkpoint")
  };
}

export function mapSubject(page) {
  const faDone = numberValue(page, "FA Done");
  const faTotal = numberValue(page, "FA Total");
  const uwDone = numberValue(page, "UW Qs Done");
  const uwTotal = numberValue(page, "UW Qs Total");
  const videoCount =
    Number(checkboxValue(page, "B&B Done")) +
    Number(checkboxValue(page, "Sketchy Done")) +
    Number(checkboxValue(page, "Pathoma Done")) +
    Number(checkboxValue(page, "Pixorize Done"));
  const faRatio = faTotal > 0 ? faDone / faTotal : 0;
  const uwRatio = uwTotal > 0 ? uwDone / uwTotal : 0;
  const videoRatio = videoCount / 4;

  return {
    id: page.id,
    system: normalizeSystemName(titleValue(page, "System")),
    phase: selectValue(page, "Phase"),
    faPages: richTextValue(page, "FA Pages"),
    faDone,
    faTotal,
    bnbDone: checkboxValue(page, "B&B Done"),
    sketchyDone: checkboxValue(page, "Sketchy Done"),
    pathomaDone: checkboxValue(page, "Pathoma Done"),
    pixorizeDone: checkboxValue(page, "Pixorize Done"),
    uwDone,
    uwTotal,
    uwCorrectPct: numberValue(page, "UW % Correct"),
    ankiCards: numberValue(page, "Anki Cards"),
    nbmeWeak: checkboxValue(page, "NBME Weak"),
    status: selectValue(page, "Status"),
    progressPct: Math.round((faRatio * 0.4 + videoRatio * 0.2 + uwRatio * 0.4) * 100),
    progressBar: formulaValue(page, "Progress Bar")
  };
}

export function mapWeakTopic(page) {
  const status = selectValue(page, "Status");

  return {
    id: page.id,
    topic: titleValue(page, "Topic"),
    subject: normalizeSystemName(selectValue(page, "System")),
    source: selectValue(page, "Source"),
    faPage: numberValue(page, "FA Page"),
    priority: selectValue(page, "Priority"),
    status,
    reviewed: status === "Resolved",
    actionPlan: richTextValue(page, "Action Plan"),
    dateAdded: dateValue(page, "Date Added"),
    dateResolved: dateValue(page, "Date Resolved")
  };
}

export function mapPracticeExam(page) {
  return {
    id: page.id,
    testName: normalizeSystemName(titleValue(page, "Form")),
    date: dateValue(page, "Date Taken"),
    score: numberValue(page, "% Correct"),
    totalQuestions: numberValue(page, "Total Questions"),
    readiness: formulaValue(page, "Readiness"),
    notes: richTextValue(page, "Notes")
  };
}

export function todayIso() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function scheduleSnapshot(items) {
  const ordered = [...items].sort((left, right) => left.date.localeCompare(right.date));
  const today = todayIso();
  const currentIndex = ordered.findIndex((item) => item.date >= today);

  return {
    items: ordered,
    today: currentIndex >= 0 ? ordered[currentIndex] : ordered.at(-1) || null,
    upcoming: currentIndex >= 0 ? ordered.slice(currentIndex, currentIndex + 5) : ordered.slice(-5),
    next: currentIndex >= 0 ? ordered[currentIndex + 1] || null : null
  };
}

export async function updateResourceEntry(payload) {
  const client = notionClient();
  const page = await findPageInDataSource("resources", (entry) => {
    if (payload.resourceId && entry.id === payload.resourceId) {
      return true;
    }

    return titleValue(entry, "Resource") === payload.resourceName;
  });

  if (!page) {
    throw new Error("Could not find that resource in Notion.");
  }

  const total = numberValue(page, "Total Units");
  const completed = Math.max(0, Number(payload.completed) || 0);
  const status =
    payload.status ||
    (completed <= 0 ? "Not Started" : total > 0 && completed >= total ? "Complete" : "Active");

  const updated = await client.pages.update({
    page_id: page.id,
    properties: {
      Completed: { number: completed },
      Status: { select: { name: status } }
    }
  });

  return mapResource(updated);
}

export async function createWeakTopicEntry(payload) {
  const client = notionClient();
  const databaseId = await resolveDataSourceId("weakTopics");
  const page = await client.pages.create({
    parent: { database_id: databaseId },
    properties: {
      Topic: {
        title: [
          {
            text: {
              content: payload.topic || "Untitled weak topic"
            }
          }
        ]
      },
      ...(payload.system
        ? {
            System: {
              select: { name: normalizeSystemName(payload.system) }
            }
          }
        : {}),
      ...(payload.source ? { Source: { select: { name: payload.source } } } : {}),
      ...(Number.isFinite(Number(payload.faPage))
        ? { "FA Page": { number: Number(payload.faPage) } }
        : {}),
      ...(payload.priority ? { Priority: { select: { name: payload.priority } } } : {}),
      Status: {
        select: { name: payload.status || "Unresolved" }
      },
      ...(payload.actionPlan
        ? {
            "Action Plan": {
              rich_text: [
                {
                  text: {
                    content: payload.actionPlan
                  }
                }
              ]
            }
          }
        : {}),
      "Date Added": {
        date: { start: payload.dateAdded || todayIso() }
      }
    }
  });

  return mapWeakTopic(page);
}

export async function upsertPracticeExamEntry(payload) {
  const client = notionClient();
  const page = await findPageInDataSource(
    "practiceExams",
    (entry) => normalizeSystemName(titleValue(entry, "Form")) === normalizeSystemName(payload.testName)
  );
  const properties = {
    "Date Taken": payload.date ? { date: { start: payload.date } } : { date: null },
    "% Correct": { number: Math.max(0, Number(payload.score) || 0) },
    ...(payload.totalQuestions
      ? { "Total Questions": { number: Math.max(1, Number(payload.totalQuestions) || 200) } }
      : {}),
    ...(payload.notes
      ? {
          Notes: {
            rich_text: [
              {
                text: {
                  content: payload.notes
                }
              }
            ]
          }
        }
      : {})
  };

  if (page) {
    const updated = await client.pages.update({
      page_id: page.id,
      properties
    });

    return mapPracticeExam(updated);
  }

  const databaseId = await resolveDataSourceId("practiceExams");
  const created = await client.pages.create({
    parent: { database_id: databaseId },
    properties: {
      Form: {
        title: [
          {
            text: {
              content: normalizeSystemName(payload.testName || "NBME")
            }
          }
        ]
      },
      "Total Questions": { number: Math.max(1, Number(payload.totalQuestions) || 200) },
      ...properties
    }
  });

  return mapPracticeExam(created);
}

export async function runJsonRoute(request, response, allowedMethods, handler) {
  if (handlePreflight(request, response)) {
    return;
  }

  if (!allowedMethods.includes(request.method)) {
    response.setHeader("Allow", allowedMethods.join(","));
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  try {
    return await handler();
  } catch (error) {
    return sendJson(response, 500, {
      error: error.message || "Notion request failed."
    });
  }
}
