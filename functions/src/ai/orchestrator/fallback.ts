import * as logger from "firebase-functions/logger";
import type { EnrichedContext, ActionPlan } from "./types";

/**
 * Rule-based fallback when AI is unavailable
 * Uses keyword detection and pattern matching to determine which actions to run
 */
export function getFallbackActionPlan(context: EnrichedContext): ActionPlan {
  const { currentMessage, previousMessages } = context;
  const text = (currentMessage.text || "").toLowerCase();

  // Keywords for priority detection
  const priorityKeywords = [
    "urgent",
    "asap",
    "as soon as possible",
    "emergency",
    "critical",
    "blocker",
    "immediate",
    "important",
    "deadline",
    "drop everything",
  ];

  // Keywords for calendar/date events
  const calendarKeywords = [
    "meeting",
    "calendar",
    "schedule",
    "tomorrow",
    "next week",
    "next month",
    "friday",
    "monday",
    "wednesday",
    "thursday",
    "tuesday",
    "saturday",
    "sunday",
    "appointment",
    "event",
    "conference",
    "call",
    "zoom",
    "conference call",
    "standup",
    "sync",
  ];

  // Date patterns (simple)
  const datePatterns = [
    /\d{1,2}\/\d{1,2}/, // MM/DD or M/D
    /\d{1,2}-\d{1,2}/, // MM-DD or M-D
    /\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}/i, // Month name
    /\bat\s+\d{1,2}:\d{2}/, // "at 3:30"
    /\d{1,2}:\d{2}/, // Time like 3:30
    /\b(am|pm)\b/i,
  ];

  // Time patterns
  const timePatterns = [
    /\d{1,2}:\d{2}/,
    /\bat\s+\d{1,2}:\d{2}/,
    /\b\w+\s+at\s+\d{1,2}:\d{2}/,
  ];

  // Check for priority indicators
  const hasPriorityKeywords =
    priorityKeywords.some((keyword) => text.includes(keyword)) ||
    previousMessages.some((msg) =>
      priorityKeywords.some((keyword) =>
        msg.text.toLowerCase().includes(keyword)
      )
    );

  // Check for calendar/date indicators
  const hasCalendarKeywords =
    calendarKeywords.some((keyword) => text.includes(keyword)) ||
    previousMessages.some((msg) =>
      calendarKeywords.some((keyword) =>
        msg.text.toLowerCase().includes(keyword)
      )
    );

  const hasDatePattern = datePatterns.some((pattern) => pattern.test(text));
  const hasTimePattern = timePatterns.some((pattern) => pattern.test(text));

  // Determine actions to run
  const actions: string[] = [];
  let priority: "high" | "medium" | "low" | undefined;

  if (hasPriorityKeywords) {
    actions.push("priority");
    priority = "high";
  }

  if (hasCalendarKeywords || hasDatePattern || hasTimePattern) {
    actions.push("calendar");
  }

  // If no clear indicators, run both as safe default
  if (actions.length === 0) {
    actions.push("priority", "calendar");
    priority = "low";
  }

  logger.info("Fallback action plan generated", {
    actions,
    priority,
    hasPriorityKeywords,
    hasCalendarKeywords,
    hasDatePattern,
    hasTimePattern,
  });

  return {
    actions,
    priority,
    reasoning: `Fallback detection: priority=${hasPriorityKeywords}, calendar=${hasCalendarKeywords}, dates=${hasDatePattern}, times=${hasTimePattern}`,
  };
}
