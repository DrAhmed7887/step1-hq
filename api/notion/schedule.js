import {
  mapScheduleItem,
  queryDataSourcePages,
  runJsonRoute,
  scheduleSnapshot,
  sendJson
} from "./_shared.js";

export default async function handler(request, response) {
  return runJsonRoute(request, response, ["GET", "POST"], async () => {
    const snapshot = scheduleSnapshot((await queryDataSourcePages("schedule")).map(mapScheduleItem));
    return sendJson(response, 200, snapshot);
  });
}
