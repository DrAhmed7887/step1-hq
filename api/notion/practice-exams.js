import {
  mapPracticeExam,
  queryDataSourcePages,
  runJsonRoute,
  sendJson
} from "./_shared.js";

export default async function handler(request, response) {
  return runJsonRoute(request, response, ["GET", "POST"], async () => {
    const items = (await queryDataSourcePages("practiceExams"))
      .map(mapPracticeExam)
      .sort((left, right) => right.date.localeCompare(left.date));

    return sendJson(response, 200, { items });
  });
}
