import {
  mapWeakTopic,
  queryDataSourcePages,
  runJsonRoute,
  sendJson
} from "./_shared.js";

export default async function handler(request, response) {
  return runJsonRoute(request, response, ["GET", "POST"], async () => {
    const items = (await queryDataSourcePages("weakTopics"))
      .map(mapWeakTopic)
      .sort((left, right) => right.dateAdded.localeCompare(left.dateAdded));

    return sendJson(response, 200, { items });
  });
}
