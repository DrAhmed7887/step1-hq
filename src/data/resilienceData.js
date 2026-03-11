export const constraintProfiles = [
  {
    id: "working-parent-old-img",
    label: "Working parent IMG",
    description: "Full-time work, young kids, older graduate, weak basics",
    cohortAverageDailyHours: 3.1,
    cohortAverageWeeklyHours: 22,
    cohortAveragePrepMonths: 9,
    expectedDip: "Month 2 overload, Month 4 burnout scare",
    turningPoint: "Switched from resource hoarding to UWorld + targeted review"
  },
  {
    id: "part-time-4-5",
    label: "4-5 hrs/day part-time",
    description: "Part-time prep with moderate family obligations",
    cohortAverageDailyHours: 4.4,
    cohortAverageWeeklyHours: 30,
    cohortAveragePrepMonths: 7,
    expectedDip: "NBME wobble after switching to random timed blocks",
    turningPoint: "Built stamina with mixed blocks and strict review"
  },
  {
    id: "restart-after-failure",
    label: "Restart after setback",
    description: "Failed once or reset after a stalled attempt",
    cohortAverageDailyHours: 3.6,
    cohortAverageWeeklyHours: 25,
    cohortAveragePrepMonths: 8,
    expectedDip: "Confidence drop during first self-assessment cycle",
    turningPoint: "Started tracking why answers were wrong, not just the topic"
  },
  {
    id: "quiet-grind-2-4",
    label: "Quiet grind 2-4 hrs/day",
    description: "Slow, consistent pace with little room for marathon days",
    cohortAverageDailyHours: 2.7,
    cohortAverageWeeklyHours: 19,
    cohortAveragePrepMonths: 10,
    expectedDip: "Feels behind most of the time despite steady progress",
    turningPoint: "Used weekly trend targets instead of daily perfection"
  }
];

export const resilienceStories = [
  {
    id: "story-1",
    profileId: "working-parent-old-img",
    title: "Mother of two, studied after bedtime",
    weeklyHours: 21,
    prepMonths: 9,
    dailyPattern: "2.5 hrs weekdays, 5 hrs on weekends",
    setbacks: "Three missed weeks during recurrent childcare illnesses",
    turningPoint: "Dropped passive lectures and reviewed one UWorld block deeply",
    result: "Passed after three consecutive NBME scores above 66%",
    badges: ["Parent Power", "Consistency Over Intensity", "Weekend Rescuer"]
  },
  {
    id: "story-2",
    profileId: "working-parent-old-img",
    title: "Old IMG with weak biochem foundation",
    weeklyHours: 24,
    prepMonths: 10,
    dailyPattern: "3 hrs before work, light Anki at lunch",
    setbacks: "Severe confidence dip after early NBME failures",
    turningPoint: "Started a qualitative error log and stopped comparing to full-time students",
    result: "Passed while still working clinic shifts",
    badges: ["3-Hour Warrior", "Came Back Strong", "Passed Despite Chaos"]
  },
  {
    id: "story-3",
    profileId: "part-time-4-5",
    title: "Part-time study with a realistic ceiling",
    weeklyHours: 31,
    prepMonths: 7,
    dailyPattern: "4.5 focused hours, five days a week",
    setbacks: "Burnout from trying to add extra video resources",
    turningPoint: "Protected one recovery afternoon every week",
    result: "Passed with Free 120 above 74%",
    badges: ["Quiet Grind", "Consistency Over Intensity"]
  },
  {
    id: "story-4",
    profileId: "restart-after-failure",
    title: "Restarted after a stalled first attempt",
    weeklyHours: 26,
    prepMonths: 8,
    dailyPattern: "3 hrs weekdays, 6 hrs Sundays",
    setbacks: "Six-week gap after family and work overload",
    turningPoint: "Focused on missed-question remediation instead of restarting every resource",
    result: "Passed on the second serious attempt",
    badges: ["Came Back Strong", "Finished Despite Chaos"]
  },
  {
    id: "story-5",
    profileId: "quiet-grind-2-4",
    title: "Slow but steady from a low baseline",
    weeklyHours: 18,
    prepMonths: 11,
    dailyPattern: "2.5 hrs most days, no heroics",
    setbacks: "Felt behind almost the entire prep cycle",
    turningPoint: "Benchmarked against similar schedules instead of top performers",
    result: "Passed after a long but stable ramp",
    badges: ["Quiet Grind", "Against the Odds"]
  },
  {
    id: "story-6",
    profileId: "working-parent-old-img",
    title: "ER shifts, kids, and interrupted mornings",
    weeklyHours: 20,
    prepMonths: 9,
    dailyPattern: "Short dawn sessions plus weekend recovery blocks",
    setbacks: "Frequent missed mornings after overnight call",
    turningPoint: "Moved hard tasks to high-energy windows and tracked fatigue context",
    result: "Passed despite inconsistent days",
    badges: ["Parent Power", "Finished Despite Chaos"]
  }
];

export function getConstraintProfile(profileId) {
  return (
    constraintProfiles.find((profile) => profile.id === profileId) ||
    constraintProfiles[0]
  );
}

export function getStoriesForProfile(profileId) {
  const matches = resilienceStories.filter((story) => story.profileId === profileId);
  return matches.length ? matches : resilienceStories.slice(0, 3);
}

export function buildResilienceBenchmark(profileId, recentDailyHours) {
  const profile = getConstraintProfile(profileId);
  const stories = getStoriesForProfile(profileId);
  const ratio = recentDailyHours / (profile.cohortAverageDailyHours || 1);

  let status = "On track";
  let tone = "text-mint";
  let message = `You are within range for people who passed with this constraint set.`;

  if (ratio < 0.8) {
    status = "Recoverable";
    tone = "text-amber";
    message = `You are below this cohort's average pace, but similar users still passed after uneven weeks.`;
  }

  if (ratio < 0.55) {
    status = "Needs reset";
    tone = "text-coral";
    message = `You are meaningfully below the cohort average. Reduce scope and protect a smaller, repeatable schedule.`;
  }

  const percentile = Math.max(8, Math.min(96, Math.round(ratio * 60 + 20)));

  return {
    profile,
    stories,
    status,
    tone,
    message,
    percentile
  };
}
