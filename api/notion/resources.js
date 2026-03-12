import {
  mapResource,
  queryDataSourcePages,
  runJsonRoute,
  sendJson
} from "./_shared.js";

export default async function handler(request, response) {
  return runJsonRoute(request, response, ["GET", "POST"], async () => {
    const items = (await queryDataSourcePages("resources"))
      .map(mapResource)
      .sort((left, right) => left.name.localeCompare(right.name));

    return sendJson(response, 200, { items });
  });
}
