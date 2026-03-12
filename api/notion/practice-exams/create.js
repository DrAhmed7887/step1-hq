import {
  parseBody,
  runJsonRoute,
  sendJson,
  upsertPracticeExamEntry
} from "../_shared.js";

export default async function handler(request, response) {
  return runJsonRoute(request, response, ["POST"], async () => {
    const payload = await parseBody(request);
    const item = await upsertPracticeExamEntry(payload);
    return sendJson(response, 200, { item });
  });
}
