import {
  mapSubject,
  queryDataSourcePages,
  runJsonRoute,
  sendJson
} from "./_shared.js";

export default async function handler(request, response) {
  return runJsonRoute(request, response, ["GET", "POST"], async () => {
    const items = (await queryDataSourcePages("subjects"))
      .map(mapSubject)
      .sort((left, right) => left.system.localeCompare(right.system));

    return sendJson(response, 200, { items });
  });
}
