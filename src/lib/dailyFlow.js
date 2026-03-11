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
      return `${Math.round((Number(warRoomState.totalQuestions || 0) / 3400) * 100)}% of UWorld logged`;
    case "usmle-exam-day":
      return `Exam date: ${warRoomState.examDate}`;
    default:
      return "Manual milestone";
  }
}

export function buildGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return {
      title: "Good morning, Doctor.",
      tone: "Your calmest hour matters most. Start before the day starts negotiating."
    };
  }

  if (hour >= 12 && hour < 18) {
    return {
      title: "Good afternoon, Doctor.",
      tone: "Reset the line. A strong middle of the day can still carry the whole plan."
    };
  }

  if (hour >= 18 && hour < 23) {
    return {
      title: "Good evening, Doctor.",
      tone: "Keep the room quiet, keep the task list small, and make the next hour count."
    };
  }

  return {
    title: "Late night grind?",
    tone: "Protect the essentials. Precision beats forcing one more tired block."
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
