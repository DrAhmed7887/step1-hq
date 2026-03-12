import {
  createWeakTopicEntry,
  listPracticeExams,
  listResources,
  listScheduleSnapshot,
  listSubjects,
  listWeakTopics,
  setRuntimeEnv,
  updateResourceEntry,
  upsertPracticeExamEntry
} from "./_shared.js";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin"
  };
}

function jsonResponse(payload, { status = 200, origin = "*" } = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(origin),
      "content-type": "application/json"
    }
  });
}

async function parseRequestBody(request) {
  if (request.method === "GET") {
    return {};
  }

  try {
    return await request.json();
  } catch {
    return {};
  }
}

function routePath(url) {
  const pathname = new URL(url).pathname.replace(/\/+$/, "");
  return pathname || "/";
}

export default {
  async fetch(request, env) {
    setRuntimeEnv(env);

    const origin = request.headers.get("Origin") || "*";
    const path = routePath(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    try {
      if ((path === "/api/notion/resources" || path === "/resources") && ["GET", "POST"].includes(request.method)) {
        return jsonResponse({ items: await listResources() }, { origin });
      }

      if ((path === "/api/notion/schedule" || path === "/schedule") && ["GET", "POST"].includes(request.method)) {
        return jsonResponse(await listScheduleSnapshot(), { origin });
      }

      if ((path === "/api/notion/subjects" || path === "/subjects") && ["GET", "POST"].includes(request.method)) {
        return jsonResponse({ items: await listSubjects() }, { origin });
      }

      if ((path === "/api/notion/weak-topics" || path === "/weak-topics") && ["GET", "POST"].includes(request.method)) {
        return jsonResponse({ items: await listWeakTopics() }, { origin });
      }

      if ((path === "/api/notion/practice-exams" || path === "/practice-exams") && ["GET", "POST"].includes(request.method)) {
        return jsonResponse({ items: await listPracticeExams() }, { origin });
      }

      if ((path === "/api/notion/resources/update" || path === "/resources/update") && request.method === "POST") {
        const payload = await parseRequestBody(request);
        return jsonResponse({ item: await updateResourceEntry(payload) }, { origin });
      }

      if ((path === "/api/notion/weak-topics/create" || path === "/weak-topics/create") && request.method === "POST") {
        const payload = await parseRequestBody(request);
        return jsonResponse({ item: await createWeakTopicEntry(payload) }, { origin });
      }

      if ((path === "/api/notion/practice-exams/create" || path === "/practice-exams/create") && request.method === "POST") {
        const payload = await parseRequestBody(request);
        return jsonResponse({ item: await upsertPracticeExamEntry(payload) }, { origin });
      }

      return jsonResponse({ error: "Route not found." }, { status: 404, origin });
    } catch (error) {
      return jsonResponse(
        { error: error.message || "Notion request failed." },
        { status: 500, origin }
      );
    }
  }
};
