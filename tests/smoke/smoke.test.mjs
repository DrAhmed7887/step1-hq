import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import divineInterventionMap from "../../src/data/divineInterventionMap.json" with { type: "json" };
import faPageMap from "../../src/data/faPageMap.json" with { type: "json" };
import resourceData from "../../src/data/resourceSequencing.json" with { type: "json" };
import scheduleData from "../../src/data/scheduleTemplates.json" with { type: "json" };
import { sections } from "../../src/data/warRoomData.js";
import {
  BACKUP_META_STORAGE_KEY,
  createCombinedBackup,
  resolveBackupReminder
} from "../../src/lib/appBackup.js";
import {
  checkExamReadiness,
  generateDailyPlan,
  getDivineRecommendation,
  getNextBestMove,
  hasNbmePlateau,
  resolveStudyPlanProgress
} from "../../src/lib/coachingEngine.js";
import { createCommandCenterState } from "../../src/lib/commandCenter.js";
import { WAR_MAP_WEEKS, updateMomentum } from "../../src/lib/journey.js";
import {
  getQuotesForCategory,
  pickContextualQuote,
  pickQuoteForCategory,
  quoteKey
} from "../../src/lib/coachQuotes.js";
import {
  WAR_ROOM_STORAGE_KEY,
  createWarRoomState
} from "../../src/lib/warRoom.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const BASE_URL = "http://127.0.0.1:4317";
const DIST_URL = "http://127.0.0.1:4318";

let browser;
let serverProcess;

async function waitForUrl(url) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (serverProcess.exitCode != null) {
      throw new Error(`Preview server exited early with code ${serverProcess.exitCode}.`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await delay(500);
  }

  throw new Error("Timed out waiting for vite preview to become available.");
}

async function waitForServer() {
  await waitForUrl(`${BASE_URL}/command-center`);
}

function attachRuntimeErrorCollector(page) {
  const runtimeErrors = [];

  page.on("pageerror", (error) => {
    runtimeErrors.push(error.message);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeErrors.push(message.text());
    }
  });

  return runtimeErrors;
}

async function openWarRoom(context, path = "/war-room") {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}${path}`);
  await page.getByRole("button", { name: "Coach", exact: true }).waitFor();
  return page;
}

async function openCommandCenter(context) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/command-center`);
  await page.getByText("Protect family time and give the coach real constraints.").waitFor();
  return page;
}

async function submitWarRoomCheckIn(page, hoursLabel = "2") {
  await page.getByRole("button", { name: "😐 Medium" }).click();
  await page.getByRole("button", { name: hoursLabel, exact: true }).click();
  await page.getByRole("button", { name: "Clear" }).click();
  await page.getByRole("button", { name: "Generate Today's Plan" }).click();
  await page.getByText("YOUR PLAN").waitFor();
}

async function submitCommandCenterCheckIn(page, { energy, hours }) {
  await page.getByRole("button", { name: energy }).click();
  await page.getByRole("button", { name: hours }).click();
  await page.getByRole("button", { name: "Lock Today's Tempo" }).click();
  await page.locator('[data-quote-card="true"]').waitFor();
}

before(async () => {
  serverProcess = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4317"], {
    cwd: ROOT,
    stdio: "pipe"
  });

  serverProcess.stdout.on("data", () => {});
  serverProcess.stderr.on("data", () => {});

  await waitForServer();
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();

  if (serverProcess && serverProcess.exitCode == null) {
    serverProcess.kill("SIGTERM");
    await delay(500);
  }
});

test("momentum algorithm decays for 0, 1, 3, and 7 missed days", () => {
  assert.equal(Number(updateMomentum(0.6, 1, "normal").toFixed(2)), 0.65);
  assert.equal(Number(updateMomentum(0.6, 2, "normal").toFixed(2)), 0.6);
  assert.equal(Number(updateMomentum(0.6, 4, "normal").toFixed(2)), 0.5);
  assert.equal(Number(updateMomentum(0.6, 8, "normal").toFixed(2)), 0.3);
});

test("resource sequencing data loads without errors", () => {
  assert.ok(Array.isArray(resourceData.resources));
  assert.ok(resourceData.resources.length >= 10);
  assert.ok(Array.isArray(resourceData.gatingRules));
  assert.ok(resourceData.gatingRules.length >= 4);
  const firstAid = resourceData.resources.find((resource) => resource.id === "first-aid");
  assert.equal(firstAid.priority, 1);
  assert.equal(firstAid.category, "content");
});

test("schedule template data loads without errors", () => {
  assert.ok(Array.isArray(scheduleData.templates));
  assert.equal(scheduleData.templates[0].id, "zero-day");
  assert.ok(scheduleData.phaseModifiers.assessment_phase);
});

test("backup export wraps app state with metadata and derived mirrors", () => {
  const commandCenter = createCommandCenterState();
  commandCenter.weeklyFocus = "Protect renal and finish the AI outline.";
  commandCenter.checkIns = {
    "2026-03-11": {
      date: "2026-03-11",
      energy: "medium",
      hours: 2,
      sessionType: "normal",
      quoteCategory: "normal",
      quoteKey: "normal:einstein",
      momentum: 0.55,
      createdAt: "2026-03-11T06:00:00Z",
      updatedAt: "2026-03-11T06:00:00Z"
    }
  };
  commandCenter.reflections = [
    {
      date: "2026-03-11",
      reflection: "I linked renal acid-base to compensation instead of memorizing the table.",
      momentum: 0.55
    }
  ];
  commandCenter.milestonesCompleted = ["first-nbme"];

  const warRoom = createWarRoomState(sections);
  warRoom.systemProgress.cardio.faRead = true;
  warRoom.nbmeAnalyses = [
    {
      nbmeId: "nbme-28",
      date: "2026-07-15",
      percentCorrect: 64,
      totalQuestions: 200,
      analysis: {
        knowledgeGaps: [{ system: "cardio", count: 8 }],
        trickQuestions: 12,
        carelessness: 6
      }
    }
  ];
  warRoom.dailyPlan = {
    date: "2026-03-11",
    primarySectionId: "cardio",
    generatedAt: "2026-03-11T06:30:00Z",
    snapshot: { message: "Protect the first block." }
  };

  const backup = createCombinedBackup({
    commandCenter,
    warRoom,
    syncSettings: { projectUrl: "https://example.supabase.co", anonKey: "anon", syncKey: "sync" }
  });

  assert.equal(backup.appVersion, "1.0.0");
  assert.ok(backup.exportDate);
  assert.equal(backup.data.commandCenter.weeklyFocus, commandCenter.weeklyFocus);
  assert.equal(backup.data.warRoom.dailyPlan.primarySectionId, "cardio");
  assert.equal(backup.data.momentum["2026-03-11"], 0.55);
  assert.equal(backup.data.reflections.length, 1);
  assert.deepEqual(backup.data.milestones.completed, ["first-nbme"]);
  assert.equal(backup.data.nbmeAnalyses.length, 1);
  assert.equal(backup.data.checkInHistory.length, 1);
  assert.ok(backup.data.faProgress.completedSystems.includes("cardio"));
  assert.equal(backup.data.studyPlanState.dailyPlan.primarySectionId, "cardio");
  assert.equal(backup.data.cloudSyncSettings.syncKey, "sync");
});

test("FA page map reports 636 pages across 17 sections", () => {
  assert.equal(faPageMap.totalPages, 636);
  assert.equal(faPageMap.sections.length, 17);
});

test("next best move resolves across weeks 1, 12, 20, and 25", () => {
  const week1 = getNextBestMove(
    { completedResources: [], totalQuestions: 0, assessments: [], examDate: "2026-08-15" },
    1,
    new Date("2026-03-02")
  );
  assert.equal(week1.recommendation?.id, "pathoma-1-3");

  const week12 = getNextBestMove(
    {
      completedResources: [
        "pathoma-1-3",
        "uworld-start",
        "video-series",
        "first-aid",
        "anki-anking",
        "sketchy-micro",
        "pathoma-full"
      ],
      totalQuestions: 1900,
      assessments: [],
      examDate: "2026-08-15"
    },
    12,
    new Date("2026-05-20")
  );
  assert.equal(week12.recommendation?.id, "nbme-first");

  const week20 = getNextBestMove(
    {
      completedResources: [
        "pathoma-1-3",
        "uworld-start",
        "video-series",
        "first-aid",
        "anki-anking",
        "sketchy-micro",
        "pathoma-full",
        "nbme-first"
      ],
      totalQuestions: 2600,
      assessments: [{ id: "nbme-a", kind: "NBME", label: "NBME 26", epc: 62, date: "2026-07-01" }],
      examDate: "2026-08-15"
    },
    20,
    new Date("2026-07-08")
  );
  assert.equal(week20.recommendation?.id, "uworld-second-pass");

  const week25 = getNextBestMove(
    {
      completedResources: [
        "pathoma-1-3",
        "uworld-start",
        "video-series",
        "first-aid",
        "anki-anking",
        "sketchy-micro",
        "pathoma-full",
        "nbme-first",
        "nbme-series"
      ],
      totalQuestions: 3000,
      assessments: [{ id: "nbme-b", kind: "NBME", label: "NBME 30", epc: 70, date: "2026-08-16" }],
      examDate: "2026-08-25"
    },
    25,
    new Date("2026-08-16")
  );
  assert.equal(week25.recommendation?.id, "free-120");
});

test("daily plan generation maps 0h, 2h, 4h, and 8h to the correct template", () => {
  assert.equal(generateDailyPlan(0, "low", 2).template.id, "zero-day");
  assert.equal(generateDailyPlan(2, "medium", 2).template.id, "normal-day");
  assert.equal(generateDailyPlan(4, "high", 2).template.id, "strong-day");
  assert.equal(generateDailyPlan(8, "high", 2).template.id, "marathon-day");
});

test("daily plan includes system-specific FA pages and Divine episodes", () => {
  const studyProgress = resolveStudyPlanProgress(
    new Date("2026-03-05"),
    {},
    sections
  );
  const plan = generateDailyPlan(2, "medium", 1, {
    referenceDate: new Date("2026-03-05"),
    sections,
    studyProgress,
    userState: { examDate: "2026-08-15" }
  });

  assert.equal(studyProgress.system, "Biochemistry");
  assert.ok(plan.tasks.some((task) => task.title.includes("Today's FA pages: 33-40 (Biochemistry)")));
  assert.ok(plan.tasks.some((task) => task.title.includes("Passive option: Divine Intervention")));
  assert.ok(plan.tasks.some((task) => task.title.includes("Ep 11")));
});

test("Divine plateau logic surfaces Ep 469 and final-week logic surfaces Ep 400", () => {
  const plateauState = {
    examDate: "2026-08-15",
    nbmeScores: [
      { date: "2026-07-20", percentCorrect: 61, weeksAgo: 3 },
      { date: "2026-07-27", percentCorrect: 63, weeksAgo: 2 }
    ]
  };
  assert.equal(hasNbmePlateau(plateauState, new Date("2026-08-01")), true);

  const plateauRecommendation = getDivineRecommendation({
    studyProgress: { system: "Renal" },
    userState: plateauState,
    referenceDate: new Date("2026-08-01")
  });
  assert.equal(plateauRecommendation.episode, "Ep 469");

  const finalWeekRecommendation = getDivineRecommendation({
    studyProgress: { system: "Rapid Review" },
    userState: { examDate: "2026-08-08" },
    referenceDate: new Date("2026-08-02")
  });
  assert.equal(finalWeekRecommendation.episode, "Ep 400");
});

test("study plan progression follows the 6-month template and checkpoints appear every 4th day", () => {
  const opening = resolveStudyPlanProgress(new Date("2026-03-01"), {}, sections);
  assert.equal(opening.system, "Pathology");

  const checkpoint = resolveStudyPlanProgress(new Date("2026-03-08"), {}, sections);
  assert.equal(checkpoint.system, "Biochemistry");
  assert.equal(checkpoint.checkpointDay, true);

  const organSystems = resolveStudyPlanProgress(new Date("2026-05-10"), {}, sections);
  assert.equal(organSystems.system, "Cardiovascular");
});

test("exam readiness status matches low, borderline, and safe score bands", () => {
  const unsafe = checkExamReadiness({
    nbmeScores: [
      { date: "2026-08-01", percentCorrect: 45, weeksAgo: 2 },
      { date: "2026-08-08", percentCorrect: 55, weeksAgo: 1 }
    ]
  });
  assert.equal(unsafe.status, "Unsafe");

  const borderline = checkExamReadiness({
    nbmeScores: [
      { date: "2026-08-01", percentCorrect: 62, weeksAgo: 2 },
      { date: "2026-08-08", percentCorrect: 65, weeksAgo: 1 }
    ]
  });
  assert.equal(borderline.status, "Borderline");

  const ready = checkExamReadiness({
    nbmeScores: [
      { date: "2026-08-01", percentCorrect: 68, weeksAgo: 2 },
      { date: "2026-08-08", percentCorrect: 72, weeksAgo: 1 }
    ]
  });
  assert.equal(ready.status, "Ready");
});

test("quote engine returns a category match and avoids immediate repeats", () => {
  const exhaustedQuotes = getQuotesForCategory("exhausted");
  const normalQuotes = getQuotesForCategory("normal");
  const attackQuotes = getQuotesForCategory("attack");

  assert.ok(exhaustedQuotes.length >= 20);
  assert.ok(normalQuotes.length >= 20);
  assert.ok(attackQuotes.length >= 20);

  const firstNormal = pickQuoteForCategory("normal", "", () => 0);
  assert.equal(firstNormal.category, "normal");

  const secondNormal = pickQuoteForCategory("normal", quoteKey(firstNormal), () => 0);
  assert.equal(secondNormal.category, "normal");
  assert.notEqual(quoteKey(secondNormal), quoteKey(firstNormal));
});

test("battle quotes appear in the contextual rotation", () => {
  const battleQuotes = getQuotesForCategory("battle");
  assert.ok(battleQuotes.length >= 15);

  const battle = pickContextualQuote("normal", "", () => 0.1);
  assert.equal(battle.category, "battle");

  const attack = pickContextualQuote("attack", "", () => 0.9);
  assert.equal(attack.category, "attack");
});

test("war room coach check-in renders a generated plan in the browser", async () => {
  const context = await browser.newContext();
  const page = await openWarRoom(context);
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await submitWarRoomCheckIn(page, "2");

  await expectVisibleText(page, "Fresh start.");
  await expectVisibleText(page, "YOUR PLAN");
  assert.deepEqual(runtimeErrors, []);

  await context.close();
});

test("war map renders the expected number of weekly nodes", async () => {
  const context = await browser.newContext();
  const page = await openWarRoom(context, "/war-room?tab=map");
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await expectVisibleText(page, "March to September, laid out week by week.");
  const nodeCount = await page.locator('[data-week-node="true"]').count();

  assert.equal(nodeCount, WAR_MAP_WEEKS);
  assert.deepEqual(runtimeErrors, []);

  await context.close();
});

test("command center weekly focus persists on the built app", async () => {
  const context = await browser.newContext();
  const page = await openCommandCenter(context);
  const runtimeErrors = attachRuntimeErrorCollector(page);
  const focus = page.getByPlaceholder("What is the single most important outcome for this week?");

  await focus.fill("Protect Free 120 and finish the AI outline.");
  await page.reload();

  const focusAfterReload = page.getByPlaceholder("What is the single most important outcome for this week?");
  await focusAfterReload.waitFor();
  assert.equal(await focusAfterReload.inputValue(), "Protect Free 120 and finish the AI outline.");
  assert.deepEqual(runtimeErrors, []);

  await context.close();
});

test("settings export downloads a valid JSON backup file", async () => {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await openCommandCenter(context);
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await page.getByRole("button", { name: "Open Settings" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Backup" }).click();
  const download = await downloadPromise;

  assert.match(download.suggestedFilename(), /^step1-backup-\d{4}-\d{2}-\d{2}\.json$/);

  const filePath = await download.path();
  const raw = await fs.readFile(filePath, "utf8");
  const payload = JSON.parse(raw);

  assert.equal(payload.appVersion, "1.0.0");
  assert.ok(payload.data.commandCenter);
  assert.ok(payload.data.warRoom);
  assert.ok(payload.data.momentum);
  assert.ok(Array.isArray(payload.data.reflections));
  assert.deepEqual(runtimeErrors, []);

  await context.close();
});

test("settings import restores state and reloads the page", async () => {
  const context = await browser.newContext();
  const page = await openCommandCenter(context);
  const runtimeErrors = attachRuntimeErrorCollector(page);
  const restoredCommandCenter = createCommandCenterState();
  restoredCommandCenter.weeklyFocus = "Restore checkpoint: finish endocrine FA pages.";
  restoredCommandCenter.reflections = [
    {
      date: "2026-03-11",
      reflection: "I finally understood why aldosterone escape does not stop edema.",
      momentum: 0.62
    }
  ];
  const restoredWarRoom = createWarRoomState(sections);
  restoredWarRoom.nbmeAnalyses = [
    {
      nbmeId: "nbme-28",
      date: "2026-07-15",
      percentCorrect: 64,
      totalQuestions: 200,
      analysis: {
        knowledgeGaps: [{ system: "renal", count: 5 }],
        trickQuestions: 12,
        carelessness: 6
      }
    }
  ];
  const payload = createCombinedBackup({
    commandCenter: restoredCommandCenter,
    warRoom: restoredWarRoom
  });

  await page.getByRole("button", { name: "Open Settings" }).click();
  await page.locator('[data-settings-import-input="true"]').setInputFiles({
    name: "restore.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(payload))
  });
  await page.locator('[data-restore-confirmation="true"]').waitFor();

  await Promise.all([
    page.waitForEvent("load"),
    page.locator('[data-confirm-restore="true"]').click()
  ]);

  const focus = page.getByPlaceholder("What is the single most important outcome for this week?");
  await focus.waitFor();
  assert.equal(await focus.inputValue(), restoredCommandCenter.weeklyFocus);

  const storedWarRoom = await page.evaluate((storageKey) => {
    return JSON.parse(window.localStorage.getItem(storageKey) || "{}");
  }, WAR_ROOM_STORAGE_KEY);
  assert.equal(storedWarRoom.nbmeAnalyses?.[0]?.analysis?.knowledgeGaps?.[0]?.system, "renal");
  assert.deepEqual(runtimeErrors, []);

  await context.close();
});

test("settings import rejects invalid backup files", async () => {
  const context = await browser.newContext();
  const page = await openCommandCenter(context);
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await page.getByRole("button", { name: "Open Settings" }).click();
  await page.locator('[data-settings-import-input="true"]').setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ nope: true }))
  });

  await expectVisibleText(page, "Invalid backup file");
  assert.deepEqual(runtimeErrors, []);

  await context.close();
});

test("command center shows the 7-day backup reminder banner", async () => {
  const staleDate = new Date(Date.now() - 8.5 * 86400000).toISOString();
  const today = new Date().toISOString().slice(0, 10);
  const expectedReminder = resolveBackupReminder(
    { lastExportAt: staleDate, dismissedFor: "" },
    new Date(`${today}T12:00:00`)
  );
  const context = await browser.newContext();
  await context.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: BACKUP_META_STORAGE_KEY,
      value: JSON.stringify({ lastExportAt: staleDate, dismissedFor: "" })
    }
  );

  const page = await openCommandCenter(context);
  const runtimeErrors = attachRuntimeErrorCollector(page);

  const banner = page.locator('[data-backup-reminder="true"]');
  await banner.waitFor();
  const bannerText = (await banner.textContent()).replace(/\s+/g, " ").trim();
  assert.match(bannerText, new RegExp(`^${expectedReminder.message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*Dismiss$`));
  assert.deepEqual(runtimeErrors, []);

  await context.close();
});

test("reflection close saves to localStorage and survives reload", async () => {
  const context = await browser.newContext();
  const page = await openCommandCenter(context);
  const runtimeErrors = attachRuntimeErrorCollector(page);
  const reflection =
    "I finally linked tutor-mode misses to the mechanism instead of memorizing the answer.";

  await page.getByRole("button", { name: "Close Day" }).click();
  await page
    .getByPlaceholder("One thing I understood today that I didn't yesterday...")
    .fill(reflection);
  await page.getByRole("button", { name: "Lock it in" }).click();
  await expectVisibleText(page, reflection);

  await page.reload();
  await expectVisibleText(page, reflection);
  assert.deepEqual(runtimeErrors, []);

  await context.close();
});

test("avatar pose updates across exhausted, normal, and attack check-ins", async () => {
  const context = await browser.newContext();
  const page = await openCommandCenter(context);
  const runtimeErrors = attachRuntimeErrorCollector(page);
  const avatar = page.getByAltText("Daily avatar");

  await submitCommandCenterCheckIn(page, { energy: "Low", hours: "0-1h" });
  assert.equal(await avatar.getAttribute("data-avatar-pose"), "exhausted");

  await submitCommandCenterCheckIn(page, { energy: "Medium", hours: "2h" });
  assert.equal(await avatar.getAttribute("data-avatar-pose"), "ready");

  await submitCommandCenterCheckIn(page, { energy: "High", hours: "4+h" });
  assert.equal(await avatar.getAttribute("data-avatar-pose"), "attack");
  assert.deepEqual(runtimeErrors, []);

  await context.close();
});

test("manual milestone completion triggers the celebration overlay", async () => {
  const context = await browser.newContext();
  const page = await openCommandCenter(context);
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await page.getByRole("button", { name: "Mark Complete" }).first().click();
  await expectVisibleText(page, "Milestone Locked");
  assert.deepEqual(runtimeErrors, []);

  await context.close();
});

test("post-NBME analysis saves to localStorage and updates the HQ weaknesses block", async () => {
  const context = await browser.newContext();
  const page = await openWarRoom(context, "/war-room?tab=nbmes");
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await page.getByLabel("Percentage Score").fill("64");
  await page.getByRole("button", { name: "Log Assessment" }).click();
  await page.getByText("Now categorize your wrong answers").waitFor();
  await page.locator('[data-nbme-analysis-form="true"] input[placeholder="Count"]').fill("8");
  await page.getByLabel("Trick Question").fill("12");
  await page.getByLabel("Carelessness").fill("6");
  await page.getByRole("button", { name: "Save Analysis" }).click();
  await page.locator('[data-nbme-analysis-card="true"]').first().waitFor();

  const stored = await page.evaluate((storageKey) => {
    return JSON.parse(window.localStorage.getItem(storageKey) || "{}");
  }, WAR_ROOM_STORAGE_KEY);
  assert.equal(stored.nbmeAnalyses?.length, 1);
  assert.equal(stored.nbmeAnalyses?.[0]?.analysis?.knowledgeGaps?.[0]?.system, "cardio");

  await page.getByRole("button", { name: "HQ", exact: true }).click();
  await page.locator('[data-priority-weakness="true"]').first().waitFor();
  await expectVisibleText(page, "Cardiovascular");
  assert.deepEqual(runtimeErrors, []);

  await context.close();
});

test("direct navigation to /war-room works from the built dist via npx serve", async () => {
  const serveProcess = spawn("npx", ["serve", "dist", "-l", "4318", "-s"], {
    cwd: ROOT,
    stdio: "pipe"
  });

  try {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (serveProcess.exitCode != null) {
        throw new Error(`serve exited early with code ${serveProcess.exitCode}.`);
      }

      try {
        const response = await fetch(`${DIST_URL}/war-room`);
        if (response.ok) {
          break;
        }
      } catch {
        // Server is still starting.
      }

      if (attempt === 39) {
        throw new Error("Timed out waiting for serve to expose the built app.");
      }

      await delay(500);
    }

    const context = await browser.newContext();
    const page = await context.newPage();
    const runtimeErrors = attachRuntimeErrorCollector(page);

    await page.goto(`${DIST_URL}/war-room`);
    await page.getByRole("button", { name: "Coach", exact: true }).waitFor();
    await expectVisibleText(page, "Coach");
    assert.deepEqual(runtimeErrors, []);

    await context.close();
  } finally {
    if (serveProcess.exitCode == null) {
      serveProcess.kill("SIGTERM");
      await delay(500);
    }
  }
});

async function expectVisibleText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor();
}
