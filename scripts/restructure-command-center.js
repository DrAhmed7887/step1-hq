import notionSdk from "@notionhq/client";

const { Client, APIResponseError } = notionSdk;

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID || "d8011d2b-2469-83a5-9d56-011480c17407";
const INACCESSIBLE_TASK_DB_ID = "8eb24c975d8941c8867cdff4a2e3cbd8";

const TITLES = {
  researchLog: "📝 Research Log",
  tasks: "📋 Task List",
  quickCapture: "⚡ Quick Capture",
  notebooklm: "🧠 NotebookLM — AI Study Partner",
  warRoom: "🥊 War Room",
  readiness: "🧮 Readiness Calculator",
  commandCenterHeading: "🧠 Ahmed's Command Center",
  legacyHeading: "🥊 STEP 1 HQ — Championship Rounds"
};

const TRACKS = ["USMLE", "AI", "Masters", "Life Ops"];
const RESEARCH_SOURCES = ["Claude", "Gemini Pro", "Perplexity Pro", "ChatGPT Plus", "Codex", "Manual"];
const CAPTURE_SOURCES = ["Claude", "Gemini Pro", "Perplexity Pro", "ChatGPT Plus"];
const TASK_PRIORITIES = ["🔴 Urgent", "🟡 Important", "🟢 Normal", "⚪ Low"];
const TASK_TIME_ESTIMATES = ["15min", "30min", "1hr", "2hr", "4hr", "Full Day"];
const TASK_STATUSES = ["To Do", "Doing", "Done"];

const USMLE_LINKS = [
  ["📊 Resource Tracker", "f8a71043edd7415b9b9ffb2f4a2f4bb0"],
  ["🎯 NBME Tracker", "3e8a0633b48a42499612e79cdb7444c8"],
  ["🗓️ Master Schedule", "88f6c962a5524b90b2d8ec99b6d12e0e"],
  ["📚 Study Stack — Systems Command", "a3baa355ed834f8d9762deb6056c02fb"],
  ["⚡ Quick UWorld Log", "e29eba1933284579b9b14ecc686e5ea0"],
  ["🔥 Weak Topics Queue", "af795cdb76c047669a920b10124f29be"],
  ["🧮 Readiness Calculator", "32111d2b246981d9bce2c313b627888f"],
  ["📅 Daily Study Log", "842cdff4094b47fbab5ef904f497eb7f"],
  ["🥊 War Room", "32111d2b24698103a80fddc3335ae9eb"]
];

if (!NOTION_TOKEN) {
  throw new Error("NOTION_TOKEN is required.");
}

const notion = new Client({ auth: NOTION_TOKEN });

function sleep(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function titleText(title = []) {
  return title.map((item) => item.plain_text || "").join("");
}

function richText(content, href) {
  if (!content) {
    return [];
  }

  return [
    {
      type: "text",
      text: {
        content,
        ...(href ? { link: { url: href } } : {})
      }
    }
  ];
}

function paragraphText(content, href) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: richText(content, href)
    }
  };
}

function bulletedText(content, href) {
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: richText(content, href)
    }
  };
}

function heading(type, content) {
  return {
    object: "block",
    type,
    [type]: {
      rich_text: richText(content)
    }
  };
}

function notionUrl(id) {
  return `https://www.notion.so/${id.replace(/-/g, "")}`;
}

async function listChildBlocks(blockId = PARENT_PAGE_ID) {
  const blocks = [];
  let cursor;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {})
    });

    blocks.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return blocks;
}

async function listAllPages(query) {
  const results = [];
  let cursor;

  do {
    const response = await notion.search({
      query,
      filter: { property: "object", value: "page" },
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {})
    });

    results.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return results;
}

async function findDatabaseByTitle(title) {
  const blocks = await listChildBlocks(PARENT_PAGE_ID);
  return blocks.find((block) => block.type === "child_database" && block.child_database?.title === title) || null;
}

async function findChildPageByTitle(title) {
  const pages = await listAllPages(title);
  return (
    pages.find((page) => {
      const pageTitle = titleText(page.properties?.title?.title || page.properties?.Name?.title || []);
      return page.parent?.type === "page_id" && page.parent.page_id === PARENT_PAGE_ID && pageTitle === title;
    }) || null
  );
}

async function tryRetrieveDatabase(databaseId) {
  try {
    return await notion.databases.retrieve({ database_id: databaseId });
  } catch (error) {
    if (error instanceof APIResponseError && error.code === "object_not_found") {
      return null;
    }

    throw error;
  }
}

async function ensureDatabase(title, properties) {
  const existing = await findDatabaseByTitle(title);

  if (existing) {
    await notion.databases.update({
      database_id: existing.id,
      title: [{ type: "text", text: { content: title } }],
      properties
    });
    await sleep();
    return {
      title,
      databaseId: existing.id
    };
  }

  const created = await notion.databases.create({
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    title: [{ type: "text", text: { content: title } }],
    properties
  });
  await sleep();
  return {
    title,
    databaseId: created.id
  };
}

async function ensureResearchLogDatabase() {
  return ensureDatabase(TITLES.researchLog, {
    Title: { title: {} },
    Source: {
      select: { options: RESEARCH_SOURCES.map((name) => ({ name })) }
    },
    Track: {
      select: { options: TRACKS.map((name) => ({ name })) }
    },
    Date: { date: {} },
    Status: {
      select: { options: ["Raw", "Reviewed", "Actionable", "Archived"].map((name) => ({ name })) }
    },
    Tags: { multi_select: { options: [] } },
    Summary: { rich_text: {} }
  });
}

async function ensureQuickCaptureDatabase() {
  return ensureDatabase(TITLES.quickCapture, {
    Title: { title: {} },
    Content: { rich_text: {} },
    Source: {
      select: { options: CAPTURE_SOURCES.map((name) => ({ name })) }
    },
    Processed: { checkbox: {} },
    Date: { created_time: {} }
  });
}

async function ensureTasksDatabase() {
  const inaccessible = await tryRetrieveDatabase(INACCESSIBLE_TASK_DB_ID);

  if (inaccessible) {
    await notion.databases.update({
      database_id: inaccessible.id,
      title: [{ type: "text", text: { content: TITLES.tasks } }],
      properties: taskDatabaseProperties()
    });
    await sleep();
    return {
      title: TITLES.tasks,
      databaseId: inaccessible.id
    };
  }

  const existing = await findDatabaseByTitle(TITLES.tasks);
  if (existing) {
    return ensureDatabase(TITLES.tasks, taskDatabaseProperties());
  }

  const created = await notion.databases.create({
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    title: [{ type: "text", text: { content: TITLES.tasks } }],
    properties: taskDatabaseProperties()
  });
  await sleep();
  return {
    title: TITLES.tasks,
    databaseId: created.id
  };
}

function taskDatabaseProperties() {
  return {
    Task: { title: {} },
    Status: {
      select: { options: TASK_STATUSES.map((name) => ({ name })) }
    },
    Track: {
      select: { options: TRACKS.map((name) => ({ name })) }
    },
    "Due Date": { date: {} },
    "Time Estimate": {
      select: { options: TASK_TIME_ESTIMATES.map((name) => ({ name })) }
    },
    Priority: {
      select: { options: TASK_PRIORITIES.map((name) => ({ name })) }
    },
    "Calendar Synced": { checkbox: {} }
  };
}

async function ensureRelationProperty(databaseId, propertyName, targetDatabaseId) {
  const database = await notion.databases.retrieve({ database_id: databaseId });
  const property = database.properties?.[propertyName];

  if (property?.type === "relation" && property.relation?.database_id === targetDatabaseId) {
    return;
  }

  await notion.databases.update({
    database_id: databaseId,
    properties: {
      [propertyName]: {
        relation: {
          database_id: targetDatabaseId,
          single_property: {}
        }
      }
    }
  });
  await sleep();
}

async function queryDatabase(databaseId) {
  const pages = [];
  let cursor;

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {})
    });

    pages.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return pages;
}

function pageTitle(page) {
  for (const [key, value] of Object.entries(page.properties || {})) {
    if (value.type === "title") {
      return titleText(page.properties[key].title);
    }
  }

  return "";
}

function countOpenTasksByTrack(taskPages) {
  return TRACKS.reduce((accumulator, track) => {
    accumulator[track] = taskPages.filter((page) => {
      const trackName = page.properties?.Track?.select?.name || "";
      const status = page.properties?.Status?.select?.name || "";
      return trackName === track && status !== "Done";
    }).length;
    return accumulator;
  }, {});
}

function tasksDueToday(taskPages) {
  const today = new Date().toISOString().slice(0, 10);
  return taskPages
    .filter((page) => page.properties?.["Due Date"]?.date?.start === today)
    .sort((left, right) => {
      const priorities = {
        "🔴 Urgent": 0,
        "🟡 Important": 1,
        "🟢 Normal": 2,
        "⚪ Low": 3
      };

      return (priorities[left.properties?.Priority?.select?.name] ?? 99) - (priorities[right.properties?.Priority?.select?.name] ?? 99);
    })
    .slice(0, 5);
}

function latestByDate(pages, propertyName, limit = 5) {
  return [...pages]
    .sort((left, right) => {
      const leftDate = left.properties?.[propertyName]?.date?.start || left.properties?.[propertyName]?.created_time || "";
      const rightDate = right.properties?.[propertyName]?.date?.start || right.properties?.[propertyName]?.created_time || "";
      return rightDate.localeCompare(leftDate);
    })
    .slice(0, limit);
}

function researchTemplateBlocks() {
  return [
    heading("heading_1", "[Research Topic]"),
    heading("heading_2", "Summary"),
    paragraphText("[1-2 sentence summary of findings]"),
    heading("heading_2", "Key Findings"),
    bulletedText("[Bullet point 1]"),
    bulletedText("[Bullet point 2]"),
    bulletedText("[Bullet point 3]"),
    heading("heading_2", "Source Details"),
    bulletedText("Tool: [Claude/Gemini/Perplexity/ChatGPT/Codex]"),
    bulletedText("Date: [Auto-filled]"),
    bulletedText("Track: [USMLE/AI/Masters/Life Ops]"),
    bulletedText("Original Query: [What was asked]"),
    heading("heading_2", "Raw Notes"),
    paragraphText("[Full markdown content from the AI tool]"),
    heading("heading_2", "Action Items"),
    {
      object: "block",
      type: "to_do",
      to_do: { rich_text: richText("[Generated to-do 1]"), checked: false }
    },
    {
      object: "block",
      type: "to_do",
      to_do: { rich_text: richText("[Generated to-do 2]"), checked: false }
    },
    {
      object: "block",
      type: "to_do",
      to_do: { rich_text: richText("[Generated to-do 3]"), checked: false }
    },
    heading("heading_2", "Related"),
    paragraphText("[Links to related research pages]")
  ];
}

async function ensureResearchTemplate(databaseId) {
  const pages = await queryDatabase(databaseId);
  const existing = pages.find((page) => pageTitle(page) === "Research Capture Template");

  if (existing) {
    return existing.id;
  }

  const created = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      Title: {
        title: [{ type: "text", text: { content: "Research Capture Template" } }]
      },
      Source: { select: { name: "Manual" } },
      Status: { select: { name: "Archived" } },
      Summary: {
        rich_text: [{ type: "text", text: { content: "Duplicate this page when you want a structured research capture." } }]
      }
    },
    children: researchTemplateBlocks()
  });
  await sleep();
  return created.id;
}

async function archiveMatchingPages(titles) {
  for (const title of titles) {
    const page = await findChildPageByTitle(title);
    if (!page) {
      continue;
    }

    await notion.pages.update({
      page_id: page.id,
      archived: true
    });
    await sleep();
  }
}

async function archiveOldDashboardBlocks() {
  const blocks = await listChildBlocks(PARENT_PAGE_ID);
  const startIndex = blocks.findIndex((block) => {
    const text = titleText(block[block.type]?.rich_text || []);
    return text === TITLES.legacyHeading || text === TITLES.commandCenterHeading;
  });

  if (startIndex < 0) {
    return;
  }

  for (const block of blocks.slice(startIndex)) {
    await notion.blocks.update({
      block_id: block.id,
      archived: true
    });
    await sleep(200);
  }
}

function linkToPage(pageId) {
  return {
    object: "block",
    type: "link_to_page",
    link_to_page: {
      type: "page_id",
      page_id: pageId
    }
  };
}

function linkToDatabase(databaseId) {
  return {
    object: "block",
    type: "link_to_page",
    link_to_page: {
      type: "database_id",
      database_id: databaseId
    }
  };
}

function dashboardBlocks({
  quickCaptureDatabaseId,
  researchDatabaseId,
  tasksDatabaseId,
  notebooklmPageId,
  trackCounts,
  todayTasks,
  recentResearch,
  recentCaptures
}) {
  const sectionLink = (id, isDatabase = true) => (isDatabase ? linkToDatabase(id) : linkToPage(id));

  const trackColumns = TRACKS.map((track) => ({
    object: "block",
    type: "column",
    column: {
      children: [
        {
          object: "block",
          type: "callout",
          callout: {
            icon: { emoji: track === "USMLE" ? "🎯" : track === "AI" ? "🤖" : track === "Masters" ? "🎓" : "🏠" },
            rich_text: [
              {
                type: "text",
                text: {
                  content: `${track}: ${trackCounts[track] || 0} open tasks`
                }
              }
            ]
          }
        }
      ]
    }
  }));

  const usmleChildren = USMLE_LINKS.map(([label, id]) => bulletedText(label, notionUrl(id)));

  return [
    heading("heading_1", TITLES.commandCenterHeading),
    {
      object: "block",
      type: "callout",
      callout: {
        icon: { emoji: "🧭" },
        rich_text: [
          {
            type: "text",
            text: {
              content: "This dashboard is API-built. Public Notion API limits prevent true linked database views, so this section uses live summaries plus direct links into the underlying databases."
            }
          }
        ]
      }
    },
    { object: "block", type: "divider", divider: {} },
    heading("heading_2", "⚡ Quick Capture"),
    sectionLink(quickCaptureDatabaseId),
    ...(recentCaptures.length
      ? recentCaptures.map((page) => bulletedText(pageTitle(page), notionUrl(page.id)))
      : [paragraphText("No quick captures yet. Use the database above as your inbox.")]),
    { object: "block", type: "divider", divider: {} },
    heading("heading_2", "📋 Today's Focus"),
    sectionLink(tasksDatabaseId),
    ...(todayTasks.length
      ? todayTasks.map((page) => {
          const priority = page.properties?.Priority?.select?.name || "No priority";
          return bulletedText(`${pageTitle(page)} · ${priority}`, notionUrl(page.id));
        })
      : [paragraphText("No tasks are due today yet.")]),
    { object: "block", type: "divider", divider: {} },
    heading("heading_2", "🔬 Recent Research"),
    sectionLink(researchDatabaseId),
    ...(recentResearch.length
      ? recentResearch.map((page) => bulletedText(pageTitle(page), notionUrl(page.id)))
      : [paragraphText("No research entries yet. The template is ready inside the Research Log database.")]),
    { object: "block", type: "divider", divider: {} },
    heading("heading_2", "🎯 Tracks"),
    {
      object: "block",
      type: "column_list",
      column_list: {
        children: trackColumns
      }
    },
    paragraphText("Use the Task List database to filter by Track, Due Date, and Priority."),
    { object: "block", type: "divider", divider: {} },
    {
      object: "block",
      type: "toggle",
      toggle: {
        rich_text: richText("📊 USMLE Command"),
        children: usmleChildren
      }
    },
    { object: "block", type: "divider", divider: {} },
    heading("heading_2", "🔗 Quick Links"),
    {
      object: "block",
      type: "bookmark",
      bookmark: { url: "https://step1-hq-app.pages.dev" }
    },
    linkToPage(notebooklmPageId)
  ];
}

async function appendBlocks(blockId, blocks) {
  for (let index = 0; index < blocks.length; index += 10) {
    await notion.blocks.children.append({
      block_id: blockId,
      children: blocks.slice(index, index + 10)
    });
    await sleep(500);
  }
}

async function renameParentPage() {
  await notion.pages.update({
    page_id: PARENT_PAGE_ID,
    icon: { type: "emoji", emoji: "🧠" },
    properties: {
      title: {
        title: [{ type: "text", text: { content: "Ahmed's Command Center" } }]
      }
    }
  });
  await sleep();
}

async function main() {
  const researchDb = await ensureResearchLogDatabase();
  const quickCaptureDb = await ensureQuickCaptureDatabase();
  const tasksDb = await ensureTasksDatabase();

  await ensureRelationProperty(researchDb.databaseId, "Related Tasks", tasksDb.databaseId);
  await ensureRelationProperty(tasksDb.databaseId, "Source Research", researchDb.databaseId);
  await ensureResearchTemplate(researchDb.databaseId);

  const notebooklmPage = await findChildPageByTitle(TITLES.notebooklm);
  if (!notebooklmPage) {
    throw new Error("Could not find the NotebookLM page under the parent page.");
  }

  await renameParentPage();
  await archiveOldDashboardBlocks();
  await archiveMatchingPages(["Getting Started", "HyGuru UWorld & NBME"]);

  const taskPages = await queryDatabase(tasksDb.databaseId);
  const researchPages = await queryDatabase(researchDb.databaseId);
  const capturePages = await queryDatabase(quickCaptureDb.databaseId);

  await appendBlocks(
    PARENT_PAGE_ID,
    dashboardBlocks({
      quickCaptureDatabaseId: quickCaptureDb.databaseId,
      researchDatabaseId: researchDb.databaseId,
      tasksDatabaseId: tasksDb.databaseId,
      notebooklmPageId: notebooklmPage.id,
      trackCounts: countOpenTasksByTrack(taskPages),
      todayTasks: tasksDueToday(taskPages),
      recentResearch: latestByDate(researchPages.filter((page) => pageTitle(page) !== "Research Capture Template"), "Date"),
      recentCaptures: latestByDate(capturePages, "Date")
    })
  );

  console.log(
    JSON.stringify(
      {
        parentPageId: PARENT_PAGE_ID,
        researchDb,
        quickCaptureDb,
        tasksDb,
        notebooklmPageId: notebooklmPage.id
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.body || error);
  process.exit(1);
});
