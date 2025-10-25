import { faker } from "@faker-js/faker";
import { randomElement } from "./helpers";

/**
 * Generate realistic professional team messages
 */
export function generateRealisticMessage(): string {
  const templates = [
    // Greetings and quick responses
    () => "Good morning team!",
    () => "Hey everyone 👋",
    () => "Thanks for the update!",
    () => "Sounds good to me",
    () => "Perfect, thanks!",
    () => "Got it, thanks",
    () => "Will do 👍",
    () => "Agreed",

    // Meeting related
    () =>
      `Can we schedule a quick call ${randomElement(["today", "tomorrow", "this afternoon"])}?`,
    () =>
      `Meeting in ${randomElement(["5 minutes", "10 minutes", "15 minutes"])}`,
    () =>
      `I'll be ${randomElement(["5 minutes", "a few minutes"])} late to the standup`,
    () => `Great discussion in the meeting today`,
    () => `Can someone share the meeting notes?`,
    () => "Are we still on for the 2pm call?",
    () => "Let's sync up on this later",
    () => "I'll send out a calendar invite",

    // Project/work updates
    () =>
      `Just pushed the ${randomElement(["latest changes", "new feature", "bug fix", "updates"])} to ${randomElement(["staging", "dev", "the branch"])}`,
    () =>
      `The ${randomElement(["deployment", "release", "build"])} is complete`,
    () =>
      `Working on ${randomElement(["the new feature", "the bug fix", "the refactor", "the API integration"])}`,
    () =>
      `Finished the ${randomElement(["code review", "testing", "documentation", "implementation"])}`,
    () =>
      `Need some help with ${randomElement(["the authentication flow", "the database query", "the UI component", "the API endpoint"])}`,
    () => "The feature is ready for review",
    () => "Just deployed to production",
    () => "Running the test suite now",

    // Time-specific
    () => "I'll be OOO tomorrow",
    () => "I'll be OOO next week",
    () => "Taking lunch, back in 30 minutes",
    () => "Logging off for the day",
    () => "Starting a bit late today",
    () => "Stepping away for a bit, will check messages later",

    // Questions and collaboration
    () =>
      `Has anyone worked on ${randomElement(["the payment integration", "the user dashboard", "the API migration", "the database schema"])} before?`,
    () =>
      `Can someone review my ${randomElement(["PR", "pull request", "changes", "code"])}?`,
    () => "Who's available for a quick code review?",
    () =>
      `What's the status on ${randomElement(["the release", "the deployment", "the sprint", "the project"])}?`,
    () => "Anyone else seeing this issue?",
    () => "Is the staging environment working for everyone?",
    () => "Can you take a look at this when you get a chance?",

    // Status updates
    () =>
      `${randomElement(["Almost done", "Halfway through", "Making progress on"])} the ${randomElement(["implementation", "feature", "refactor", "migration"])}`,
    () => `The ${randomElement(["bug", "issue", "problem"])} is fixed`,
    () => "This is blocked on the backend changes",
    () =>
      `${randomElement(["Updated", "Revised", "Modified"])} the ${randomElement(["documentation", "design", "specs", "requirements"])}`,
    () => "All tests are passing now",
    () => "Found the root cause of the issue",

    // Appreciation
    () => "Great work on this!",
    () => "Thanks for jumping on that quickly",
    () => "Really appreciate the help!",
    () => "Nice work team! 🎉",
    () => "This looks great",

    // Links and resources
    () => "Shared the doc in Slack",
    () => "Check out the Figma designs",
    () => "Updated the Jira ticket",
    () => "Added notes to Confluence",

    // Casual/informal
    () => "Coffee break ☕",
    () => "Happy Friday! 🎉",
    () => "Have a great weekend!",
    () => "Welcome to the team!",
    () => "Congrats on the launch! 🚀",
  ];

  return randomElement(templates)();
}

/**
 * Generate realistic group names for professional teams
 */
export function generateGroupName(): string {
  const templates = [
    () =>
      `${randomElement(["Engineering", "Design", "Product", "Marketing", "Sales"])} Team`,
    () =>
      `${randomElement(["Frontend", "Backend", "Mobile", "DevOps", "QA"])} Squad`,
    () => `Project ${faker.commerce.productName()}`,
    () => `${faker.company.buzzNoun()} Initiative`,
    () => `${randomElement(["Alpha", "Beta", "Delta", "Gamma"])} Team`,
    () =>
      `${randomElement(["Q1", "Q2", "Q3", "Q4"])} ${randomElement(["Planning", "Launch", "Retrospective"])}`,
    () => "All Hands",
    () => "Leadership Team",
    () => "Standup",
    () => `${faker.location.city()} Office`,
  ];

  return randomElement(templates)();
}
