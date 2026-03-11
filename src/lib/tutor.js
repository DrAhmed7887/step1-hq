import faPageMap from "../data/faPageMap.json" with { type: "json" };

export const TUTOR_HISTORY_STORAGE_KEY = "tutorHistory";
export const MAX_TUTOR_MESSAGES = 20;

function normalizeMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => message && (message.role === "user" || message.role === "model"))
    .map((message) => ({
      role: message.role,
      text: String(message.text || ""),
      timestamp: typeof message.timestamp === "string" ? message.timestamp : new Date().toISOString()
    }))
    .slice(-MAX_TUTOR_MESSAGES);
}

export function hydrateTutorHistory(saved) {
  return normalizeMessages(saved);
}

export function appendTutorMessage(history, message) {
  return normalizeMessages([...(history || []), message]);
}

function pageRangeOverlaps(leftStart, leftEnd, rightStart, rightEnd) {
  return leftStart <= rightEnd && rightStart <= leftEnd;
}

export function lookupFaSystemsForRange(startPage, endPage) {
  return faPageMap.sections
    .filter((section) =>
      pageRangeOverlaps(startPage, endPage, Number(section.startPage), Number(section.endPage))
    )
    .map((section) => section.system);
}

export function extractTutorFaReferences(text) {
  const pattern = /FA\s*(?:20\d{2})?\s*pp?\.\s*(\d+)\s*[-–]\s*(\d+)/gi;
  const matches = [];
  const seen = new Set();

  let match = pattern.exec(text);
  while (match) {
    const startPage = Number(match[1]);
    const endPage = Number(match[2]);
    const start = Math.min(startPage, endPage);
    const end = Math.max(startPage, endPage);
    const key = `${start}-${end}`;

    if (!seen.has(key)) {
      seen.add(key);
      matches.push({
        key,
        startPage: start,
        endPage: end,
        systems: lookupFaSystemsForRange(start, end)
      });
    }

    match = pattern.exec(text);
  }

  return matches;
}

