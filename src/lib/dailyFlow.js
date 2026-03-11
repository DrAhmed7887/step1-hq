import { getUWorldCompletionPct } from "./resourceProgress.js";

export const ENERGY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" }
];

export const HOUR_OPTIONS = [
  { value: "0.5", label: "0-1h" },
  { value: "2", label: "2h" },
  { value: "3", label: "3h" },
  { value: "4.5", label: "4+h" }
];

export const MANUAL_MILESTONE_BY_ID = {
  "python-course-finished": "pythonCourseFinished",
  "nlv-visa-submitted": "nlvVisaSubmitted",
  "scholarship-applied": "scholarshipApplied",
  "rwth-enrollment-confirmed": "rwthEnrollmentConfirmed",
  "arrival-in-germany": "arrivalInGermany"
};

export function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export function formatLongDate(dateKey) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

export function formatEventRange(event) {
  if (!event.start && !event.end) {
    return "Floating";
  }

  return [event.start, event.end].filter(Boolean).join(" - ");
}

export function sortOpenTodos(todos) {
  const priorityWeight = {
    high: 0,
    medium: 1,
    low: 2
  };

  return [...todos]
    .filter((todo) => todo.status !== "done")
    .sort((left, right) => {
      if (priorityWeight[left.priority] !== priorityWeight[right.priority]) {
        return priorityWeight[left.priority] - priorityWeight[right.priority];
      }

      if (left.urgency !== right.urgency) {
        return right.urgency - left.urgency;
      }

      return (left.dueDate || "9999-99-99").localeCompare(right.dueDate || "9999-99-99");
    });
}

export function mapEnergyToLogValue(energy) {
  if (energy === "high") {
    return 4;
  }

  if (energy === "low") {
    return 2;
  }

  return 3;
}

export function findLatestQuoteKey(checkIns) {
  const latest = Object.values(checkIns || {})
    .filter((entry) => entry?.quoteKey)
    .sort((left, right) => right.date.localeCompare(left.date))[0];

  return latest?.quoteKey || "";
}

export function milestoneHint(milestone, warRoomState) {
  if (milestone.complete) {
    return "Complete";
  }

  switch (milestone.id) {
    case "first-nbme":
      return "Log the first NBME in War Room.";
    case "uworld-50":
      return `${Math.round(getUWorldCompletionPct(warRoomState))}% of UWorld logged`;
    case "usmle-exam-day":
      return `Exam date: ${warRoomState.examDate}`;
    default:
      return "Manual milestone";
  }
}

export function buildGreeting(date = new Date()) {
  const hour = date.getHours();
  const seed = date.getDate() % 3;
  const greetings = {
    earlyMorning: [
      "0500 hours. The base is quiet. Let's move.",
      "Early bird gets the pass. Coffee up, Doctor.",
      "Dawn patrol. Your competition is still asleep."
    ],
    morning: [
      "Morning briefing. What's the mission today?",
      "Good morning, Doctor. Rocky's already done his run.",
      "Training block open. Time to execute."
    ],
    afternoon: [
      "Afternoon push. Stay in the fight.",
      "Half the day deployed. Keep the pressure.",
      "The grind continues. Round by round."
    ],
    evening: [
      "Evening session. Quality over quantity now.",
      "Night shift operations. Controlled bursts only.",
      "The gym is quieter at night. Focus is sharper."
    ],
    lateNight: [
      "Late night grind? Protect the essentials.",
      "After hours. The only enemy left is fatigue.",
      "Midnight oil. Know when to stand down, soldier."
    ]
  };

  if (hour >= 4 && hour < 7) {
    return {
      title: greetings.earlyMorning[seed],
      tone: "Quiet hours are clean reps. Start before the noise gets a vote."
    };
  }

  if (hour >= 7 && hour < 12) {
    return {
      title: greetings.morning[seed],
      tone: "Lock the first block early and the rest of the day gets easier."
    };
  }

  if (hour >= 12 && hour < 17) {
    return {
      title: greetings.afternoon[seed],
      tone: "A hard middle stretch still wins the day if the next move is clean."
    };
  }

  if (hour >= 17 && hour < 21) {
    return {
      title: greetings.evening[seed],
      tone: "Protect the quality of the reps. No fake volume."
    };
  }

  return {
    title: greetings.lateNight[seed],
    tone: "Precision beats forcing one more tired block."
  };
}

export function resolveTaskVariant(task) {
  const title = String(task?.title || "").toLowerCase();

  if (title.includes("uworld")) {
    return "success";
  }

  if (title.includes("fa") || title.includes("first aid") || title.includes("pathoma")) {
    return "calm";
  }

  if (title.includes("anki")) {
    return "warning";
  }

  return "default";
}
