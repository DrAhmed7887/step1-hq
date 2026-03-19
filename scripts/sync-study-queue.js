import { Client } from "@notionhq/client";
import { SYSTEM_RESOURCES } from "../src/lib/resourceMap.js";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PARENT_PAGE_ID =
  process.env.NOTION_PARENT_PAGE_ID || "d8011d2b-2469-83a5-9d56-011480c17407";
const MASTER_SCHEDULE_DB_ID =
  process.env.NOTION_MASTER_SCHEDULE_DB_ID || "88f6c962-a552-4b90-b2d8-ec99b6d12e0e";
const STUDY_QUEUE_TITLE = "🎬 Daily Video Queue";
const NOTION_VERSION = "2022-06-28";

if (!NOTION_TOKEN) {
  throw new Error("NOTION_TOKEN is required.");
}

const notion = new Client({ auth: NOTION_TOKEN });

const SYSTEM_KEY_BY_NAME = {
  Biochemistry: "biochem",
  Immunology: "immuno",
  Microbiology: "micro",
  Pathology: "path",
  "Pathology (1-3)": "path",
  Pharmacology: "pharm",
  "Public Health": "pubhealth",
  Cardiovascular: "cardio",
  Endocrine: "endo",
  GI: "gi",
  "Heme/Onc": "heme",
  "MSK/Derm": "msk",
  Neurology: "neuro",
  Psychiatry: "psych",
  Renal: "renal",
  Reproductive: "repro",
  Respiratory: "resp",
  "Buffer/Review": "",
  "Rapid Review": ""
};

const SYSTEM_SELECT_OPTIONS = [
  "Biochemistry",
  "Immunology",
  "Microbiology",
  "Pathology (1-3)",
  "Pharmacology",
  "Public Health",
  "Cardiovascular",
  "Endocrine",
  "GI",
  "Heme/Onc",
  "MSK/Derm",
  "Neurology",
  "Psychiatry",
  "Renal",
  "Reproductive",
  "Respiratory",
  "Buffer/Review",
  "Rapid Review"
];

const STATUS_OPTIONS = ["Not Started", "In Progress", "Done"];

function richText(value = "") {
  const text = String(value || "").trim();
  if (!text) {
    return [];
  }

  return [
    {
      type: "text",
      text: {
        content: text
      }
    }
  ];
}

function pageTitle(page, propertyName) {
  const title = page.properties?.[propertyName]?.title || [];
  return title.map((part) => part.plain_text || part.text?.content || "").join("");
}

function numberValue(page, propertyName) {
  return page.properties?.[propertyName]?.number ?? null;
}

function selectValue(page, propertyName) {
  return page.properties?.[propertyName]?.select?.name || "";
}

function richTextValue(page, propertyName) {
  return (page.properties?.[propertyName]?.rich_text || [])
    .map((part) => part.plain_text || part.text?.content || "")
    .join("");
}

function checkboxValue(page, propertyName) {
  return Boolean(page.properties?.[propertyName]?.checkbox);
}

function relationValue(page, propertyName) {
  return (page.properties?.[propertyName]?.relation || []).map((entry) => ({ id: entry.id }));
}

async function queryAll(databaseId, sorts = []) {
  let cursor;
  const results = [];

  for (;;) {
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
      start_cursor: cursor,
      sorts
    });

    results.push(...response.results);

    if (!response.has_more) {
      break;
    }

    cursor = response.next_cursor;
  }

  return results;
}

async function findDatabaseByTitle(title) {
  const response = await notion.search({
    query: title,
    filter: { property: "object", value: "database" },
    page_size: 50
  });

  const exact = response.results.find((item) => pageTitle(item, "title") === title);
  return exact || null;
}

async function ensureStudyQueueDatabase() {
  const existing = await findDatabaseByTitle(STUDY_QUEUE_TITLE);
  if (existing) {
    return existing.id;
  }

  const created = await notion.databases.create({
    parent: { page_id: PARENT_PAGE_ID },
    title: [{ type: "text", text: { content: STUDY_QUEUE_TITLE } }],
    icon: { emoji: "🎬" },
    properties: {
      Day: { title: {} },
      "Day Number": { number: { format: "number" } },
      Date: { date: {} },
      System: {
        select: {
          options: SYSTEM_SELECT_OPTIONS.map((name) => ({ name }))
        }
      },
      "FA Pages": { rich_text: {} },
      Tasks: { rich_text: {} },
      Bootcamp: { rich_text: {} },
      "B&B": { rich_text: {} },
      UWorld: { rich_text: {} },
      "Master Day": {
        relation: {
          database_id: MASTER_SCHEDULE_DB_ID,
          single_property: {}
        }
      },
      Status: {
        select: {
          options: STATUS_OPTIONS.map((name) => ({ name }))
        }
      },
      Notes: { rich_text: {} }
    }
  });

  return created.id;
}

function classifyResources(resources = []) {
  const videos = resources.filter((resource) => resource.type === "video");
  const questions = resources.filter((resource) => resource.type === "questions");

  const bootcamp = videos.filter((resource) => {
    const title = resource.title.toLowerCase();
    return title.includes("bootcamp") || title.includes("pathoma") || title.includes("dirty medicine");
  });
  const bb = videos.filter((resource) => {
    const title = resource.title.toLowerCase();
    return (
      title.includes("boards & beyond") ||
      title.includes("board and beyond") ||
      title.includes("b&b") ||
      title.includes("sketchy") ||
      title.includes("pixorize")
    );
  });

  const bootcampSet = new Set(bootcamp.map((resource) => resource.id));
  const bbSet = new Set(bb.map((resource) => resource.id));
  const leftovers = videos.filter((resource) => !bootcampSet.has(resource.id) && !bbSet.has(resource.id));

  if (!bootcamp.length && leftovers.length) {
    bootcamp.push(leftovers.shift());
  }

  if (!bb.length && leftovers.length) {
    bb.push(leftovers.shift());
  }

  const fallbackNotes = leftovers.map((resource) => resource.title);

  return {
    bootcamp: bootcamp.map((resource) => resource.title),
    bb: bb.map((resource) => resource.title),
    uworld: questions.map((resource) => resource.title),
    fallbackNotes
  };
}

function buildQueueForScheduleRow(scheduleRow) {
  const systemName = selectValue(scheduleRow, "System");
  const systemKey = SYSTEM_KEY_BY_NAME[systemName] || "";
  const resources = systemKey ? SYSTEM_RESOURCES[systemKey] || [] : [];

  if (systemName === "Buffer/Review" || systemName === "Rapid Review") {
    return {
      bootcamp: ["Recovery / catch-up block"],
      bb: ["Light review / weak topics"],
      uworld: ["UWorld incorrects, flagged questions, or NBME review"],
      notes: [
        selectValue(scheduleRow, "Phase"),
        richTextValue(scheduleRow, "Tasks"),
        richTextValue(scheduleRow, "FA Pages")
      ]
        .filter(Boolean)
        .join(" · ")
    };
  }

  const classified = classifyResources(resources);
  const notes = [
    selectValue(scheduleRow, "Phase"),
    richTextValue(scheduleRow, "Tasks"),
    richTextValue(scheduleRow, "FA Pages"),
    ...classified.fallbackNotes
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    bootcamp: classified.bootcamp,
    bb: classified.bb,
    uworld: classified.uworld,
    notes
  };
}

function buildQueueProperties(scheduleRow, queueData, masterScheduleDbId) {
  const dayNumber = numberValue(scheduleRow, "Day Number");
  const date = scheduleRow.properties?.Date?.date?.start || null;
  const sourceRelation = scheduleRow.id ? [{ id: scheduleRow.id }] : [];

  return {
    Day: {
      title: [
        {
          type: "text",
          text: {
            content: `Day ${String(dayNumber).padStart(3, "0")} · ${selectValue(scheduleRow, "System")}`
          }
        }
      ]
    },
    "Day Number": { number: dayNumber },
    ...(date ? { Date: { date: { start: date } } } : {}),
    ...(selectValue(scheduleRow, "System")
      ? { System: { select: { name: selectValue(scheduleRow, "System") } } }
      : {}),
    ...(richTextValue(scheduleRow, "FA Pages")
      ? { "FA Pages": { rich_text: richText(richTextValue(scheduleRow, "FA Pages")) } }
      : {}),
    ...(richTextValue(scheduleRow, "Tasks")
      ? { Tasks: { rich_text: richText(richTextValue(scheduleRow, "Tasks")) } }
      : {}),
    Bootcamp: { rich_text: richText(queueData.bootcamp.join("\n")) },
    "B&B": { rich_text: richText(queueData.bb.join("\n")) },
    UWorld: { rich_text: richText(queueData.uworld.join("\n")) },
    "Master Day": {
      relation: sourceRelation
    },
    Status: {
      select: { name: checkboxValue(scheduleRow, "Done") ? "Done" : "Not Started" }
    },
    Notes: { rich_text: richText(queueData.notes) }
  };
}

async function appendQueueLinkIfMissing(queueDatabaseId) {
  const parentBlocks = await notion.blocks.children.list({
    block_id: PARENT_PAGE_ID,
    page_size: 100
  });

  const existingText = parentBlocks.results
    .map((block) => JSON.stringify(block))
    .join("\n");

  if (existingText.includes(STUDY_QUEUE_TITLE)) {
    return;
  }

  await notion.blocks.children.append({
    block_id: PARENT_PAGE_ID,
    children: [
      {
        object: "block",
        type: "callout",
        callout: {
          icon: { emoji: "🎬" },
          rich_text: [
            {
              type: "text",
              text: {
                content: "Daily Video Queue: "
              }
            },
            {
              type: "text",
              text: {
                content: "Open the synced queue in Notion",
                link: {
                  url: `https://www.notion.so/${queueDatabaseId.replace(/-/g, "")}`
                }
              }
            },
            {
              type: "text",
              text: {
                content: " to see Bootcamp, B&B, and UWorld for each day."
              }
            }
          ]
        }
      }
    ]
  });
}

async function main() {
  const queueDatabaseId = await ensureStudyQueueDatabase();
  const masterRows = await queryAll(MASTER_SCHEDULE_DB_ID, [
    { property: "Day Number", direction: "ascending" }
  ]);

  const existingQueueRows = await queryAll(queueDatabaseId, [
    { property: "Day Number", direction: "ascending" }
  ]);
  const queueRowsByDayNumber = new Map(
    existingQueueRows
      .map((page) => [numberValue(page, "Day Number"), page])
      .filter(([dayNumber]) => Number.isFinite(dayNumber))
  );

  let created = 0;
  let updated = 0;

  for (const scheduleRow of masterRows) {
    const dayNumber = numberValue(scheduleRow, "Day Number");
    if (!Number.isFinite(dayNumber)) {
      continue;
    }

    const queueData = buildQueueForScheduleRow(scheduleRow);
    const properties = buildQueueProperties(scheduleRow, queueData, MASTER_SCHEDULE_DB_ID);
    const existingQueueRow = queueRowsByDayNumber.get(dayNumber) || null;

    if (existingQueueRow) {
      await notion.pages.update({
        page_id: existingQueueRow.id,
        properties
      });
      updated += 1;
    } else {
      await notion.pages.create({
        parent: { database_id: queueDatabaseId },
        properties
      });
      created += 1;
    }
  }

  await appendQueueLinkIfMissing(queueDatabaseId);

  console.log(
    JSON.stringify(
      {
        queueDatabaseId,
        created,
        updated,
        total: masterRows.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
