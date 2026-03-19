// RESOURCE MAP — Replaces CramFighter
// Encodes the Pathoma -> FA -> Sketchy -> UWorld flow per system.

export const SYSTEM_RESOURCES = {
  // Biochemistry
  biochem: [
    { id: "biochem-fa", title: "First Aid: Biochemistry (p. 52-113)", type: "reading", durationMinutes: 120 },
    { id: "biochem-bnb", title: "Boards & Beyond: Biochem Series", type: "video", durationMinutes: 90 },
    { id: "biochem-uw-1", title: "UWorld: Biochem Block 1 (40 Qs)", type: "questions", durationMinutes: 120 },
    { id: "biochem-uw-2", title: "UWorld: Biochem Block 2 (40 Qs)", type: "questions", durationMinutes: 120 }
  ],
  // Immunology
  immuno: [
    { id: "immuno-pathoma", title: "Pathoma: Ch 1-3 (Basic Principles)", type: "video", durationMinutes: 90 },
    { id: "immuno-fa", title: "First Aid: Immunology (p. 114-141)", type: "reading", durationMinutes: 60 },
    { id: "immuno-uw-1", title: "UWorld: Immuno Block 1 (40 Qs)", type: "questions", durationMinutes: 120 }
  ],
  // Microbiology
  micro: [
    { id: "micro-sketchy-1", title: "Sketchy Micro: Bacteria", type: "video", durationMinutes: 120 },
    { id: "micro-fa-1", title: "First Aid: Micro/Bacteria (p. 142-180)", type: "reading", durationMinutes: 90 },
    { id: "micro-sketchy-2", title: "Sketchy Micro: Viruses & Fungi", type: "video", durationMinutes: 120 },
    { id: "micro-fa-2", title: "First Aid: Micro/Viruses (p. 181-221)", type: "reading", durationMinutes: 90 },
    { id: "micro-uw-1", title: "UWorld: Micro Block 1 (40 Qs)", type: "questions", durationMinutes: 120 },
    { id: "micro-uw-2", title: "UWorld: Micro Block 2 (40 Qs)", type: "questions", durationMinutes: 120 }
  ],
  // Gen Pathology
  path: [
    { id: "genpath-pathoma", title: "Pathoma: Ch 1-5 (Gen Path)", type: "video", durationMinutes: 150 },
    { id: "genpath-fa", title: "First Aid: Pathology (p. 222-247)", type: "reading", durationMinutes: 60 },
    { id: "genpath-uw-1", title: "UWorld: Gen Path Block 1 (40 Qs)", type: "questions", durationMinutes: 120 }
  ],
  // Pharmacology
  pharm: [
    { id: "pharm-sketchy", title: "Sketchy Pharm: Autonomic/General", type: "video", durationMinutes: 120 },
    { id: "pharm-fa", title: "First Aid: Pharmacology (p. 248-275)", type: "reading", durationMinutes: 60 },
    { id: "pharm-uw-1", title: "UWorld: Pharm Block 1 (40 Qs)", type: "questions", durationMinutes: 120 }
  ],
  // Biostats/Ethics
  pubhealth: [
    { id: "ethics-dirty-1", title: "Dirty Medicine: Ethics Part 1 & 2", type: "video", durationMinutes: 25 },
    { id: "ethics-dirty-2", title: "Dirty Medicine: Consent, Capacity, EMTALA", type: "video", durationMinutes: 30 },
    { id: "ethics-bootcamp", title: "Bootcamp: Behavioral Sciences", type: "video", durationMinutes: 45 },
    { id: "ethics-fa", title: "First Aid: Biostats/Ethics (p. 276-299)", type: "reading", durationMinutes: 60 },
    { id: "ethics-uw-1", title: "UWorld: Biostats/Ethics Block 1 (40 Qs)", type: "questions", durationMinutes: 120 }
  ],
  // Cardiovascular
  cardio: [
    { id: "cardio-pathoma", title: "Pathoma: Ch 8 (Cardiovascular)", type: "video", durationMinutes: 90 },
    { id: "cardio-fa", title: "First Aid: Cardio (p. 304-349)", type: "reading", durationMinutes: 120 },
    { id: "cardio-sketchy", title: "Sketchy Pharm: Cardio Drugs", type: "video", durationMinutes: 60 },
    { id: "cardio-uw-1", title: "UWorld: Cardio Block 1 (40 Qs)", type: "questions", durationMinutes: 120 },
    { id: "cardio-uw-2", title: "UWorld: Cardio Block 2 (40 Qs)", type: "questions", durationMinutes: 120 }
  ],
  // Endocrine
  endo: [
    { id: "endo-pathoma", title: "Pathoma: Ch 15 (Endocrine)", type: "video", durationMinutes: 60 },
    { id: "endo-fa", title: "First Aid: Endocrine (p. 350-383)", type: "reading", durationMinutes: 90 },
    { id: "endo-sketchy", title: "Sketchy Pharm: Endocrine Drugs", type: "video", durationMinutes: 45 },
    { id: "endo-uw-1", title: "UWorld: Endocrine Block 1 (40 Qs)", type: "questions", durationMinutes: 120 }
  ],
  // Gastrointestinal
  gi: [
    { id: "gi-pathoma", title: "Pathoma: Ch 9 (GI)", type: "video", durationMinutes: 90 },
    { id: "gi-fa", title: "First Aid: GI (p. 384-429)", type: "reading", durationMinutes: 120 },
    { id: "gi-uw-1", title: "UWorld: GI Block 1 (40 Qs)", type: "questions", durationMinutes: 120 },
    { id: "gi-uw-2", title: "UWorld: GI Block 2 (40 Qs)", type: "questions", durationMinutes: 120 }
  ],
  // Hematology/Oncology
  heme: [
    { id: "heme-pathoma", title: "Pathoma: Ch 6-7 (Heme/Onc)", type: "video", durationMinutes: 120 },
    { id: "heme-fa", title: "First Aid: Heme/Onc (p. 430-469)", type: "reading", durationMinutes: 90 },
    { id: "heme-uw-1", title: "UWorld: Heme/Onc Block 1 (40 Qs)", type: "questions", durationMinutes: 120 },
    { id: "heme-uw-2", title: "UWorld: Heme/Onc Block 2 (40 Qs)", type: "questions", durationMinutes: 120 }
  ],
  // MSK/Skin/Connective Tissue
  msk: [
    { id: "msk-pathoma", title: "Pathoma: Ch 16-17 (MSK/Skin)", type: "video", durationMinutes: 90 },
    { id: "msk-fa", title: "First Aid: MSK/Skin (p. 470-519)", type: "reading", durationMinutes: 120 },
    { id: "msk-bootcamp", title: "Bootcamp: MSK/Anatomy", type: "video", durationMinutes: 60 },
    { id: "msk-uw-1", title: "UWorld: MSK Block 1 (40 Qs)", type: "questions", durationMinutes: 120 }
  ],
  // Neurology/Special Senses
  neuro: [
    { id: "neuro-pathoma", title: "Pathoma: Ch 18 (Neuro)", type: "video", durationMinutes: 90 },
    { id: "neuro-fa-1", title: "First Aid: Neuro Anatomy (p. 520-550)", type: "reading", durationMinutes: 90 },
    { id: "neuro-fa-2", title: "First Aid: Neuro Pathology (p. 551-589)", type: "reading", durationMinutes: 90 },
    { id: "neuro-uw-1", title: "UWorld: Neuro Block 1 (40 Qs)", type: "questions", durationMinutes: 120 },
    { id: "neuro-uw-2", title: "UWorld: Neuro Block 2 (40 Qs)", type: "questions", durationMinutes: 120 }
  ],
  // Psychiatry
  psych: [
    { id: "psych-fa", title: "First Aid: Psychiatry (p. 590-615)", type: "reading", durationMinutes: 60 },
    { id: "psych-sketchy", title: "Sketchy Pharm: Psych Drugs", type: "video", durationMinutes: 60 },
    { id: "psych-uw-1", title: "UWorld: Psych Block 1 (40 Qs)", type: "questions", durationMinutes: 120 }
  ],
  // Renal
  renal: [
    { id: "renal-pathoma", title: "Pathoma: Ch 10 (Renal)", type: "video", durationMinutes: 60 },
    { id: "renal-fa", title: "First Aid: Renal (p. 616-649)", type: "reading", durationMinutes: 90 },
    { id: "renal-sketchy", title: "Sketchy Pharm: Diuretics/Renal", type: "video", durationMinutes: 45 },
    { id: "renal-uw-1", title: "UWorld: Renal Block 1 (40 Qs)", type: "questions", durationMinutes: 120 }
  ],
  // Reproductive
  repro: [
    { id: "repro-pathoma", title: "Pathoma: Ch 14 (Repro)", type: "video", durationMinutes: 90 },
    { id: "repro-fa", title: "First Aid: Reproductive (p. 650-697)", type: "reading", durationMinutes: 120 },
    { id: "repro-uw-1", title: "UWorld: Repro Block 1 (40 Qs)", type: "questions", durationMinutes: 120 }
  ],
  // Respiratory
  resp: [
    { id: "resp-pathoma", title: "Pathoma: Ch 11 (Respiratory)", type: "video", durationMinutes: 60 },
    { id: "resp-fa", title: "First Aid: Respiratory (p. 698-727)", type: "reading", durationMinutes: 90 },
    { id: "resp-uw-1", title: "UWorld: Respiratory Block 1 (40 Qs)", type: "questions", durationMinutes: 120 }
  ]
};

export function getNextResource(systemId, completedResourceIds = []) {
  const pathway = SYSTEM_RESOURCES[systemId];
  if (!pathway) return null;

  for (const resource of pathway) {
    if (!completedResourceIds.includes(resource.id)) {
      return resource;
    }
  }

  return null; // All core resources for this system are completed
}

function inferSeriesLabel(resourceTitle = "") {
  const lower = String(resourceTitle).toLowerCase();

  if (lower.includes("bootcamp")) {
    return "Bootcamp";
  }

  if (lower.includes("boards & beyond") || lower.includes("board and beyond") || lower.includes("b&b")) {
    return "Boards & Beyond";
  }

  if (lower.includes("pathoma")) {
    return "Pathoma";
  }

  if (lower.includes("sketchy")) {
    return "Sketchy";
  }

  if (lower.includes("uworld")) {
    return "UWorld";
  }

  return "Other";
}

function toQueueItem(resource) {
  return {
    ...resource,
    series: inferSeriesLabel(resource.title)
  };
}

export function getSystemStudyQueue(systemId, completedResourceIds = []) {
  const pathway = SYSTEM_RESOURCES[systemId] || [];
  const remaining = pathway.filter((resource) => !completedResourceIds.includes(resource.id));
  const videoItems = remaining.filter((resource) => resource.type === "video").map(toQueueItem);
  const questionItems = remaining
    .filter((resource) => resource.type === "questions")
    .map(toQueueItem);
  const readingItems = remaining
    .filter((resource) => resource.type === "reading")
    .map(toQueueItem);

  const videoSeries = ["Bootcamp", "Boards & Beyond", "Pathoma", "Sketchy", "Other"]
    .map((series) => ({
      series,
      items: videoItems.filter((item) => item.series === series)
    }))
    .filter((entry) => entry.items.length > 0);

  return {
    systemId,
    systemName: systemId || "Mixed review",
    remaining,
    videos: videoItems,
    questionBlocks: questionItems,
    readings: readingItems,
    videoSeries,
    questionSeries: questionItems.length
      ? [{ series: "UWorld", items: questionItems }]
      : [],
    nextVideo: videoItems[0] || null,
    nextQuestionBlock: questionItems[0] || null
  };
}
