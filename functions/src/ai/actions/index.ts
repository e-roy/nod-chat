import type { ActionHandler } from "../orchestrator/types";
import { handlePriorityAction } from "./priority";
import { handleCalendarAction } from "./calendar";

/**
 * Action registry mapping action names to handler functions
 * Add new actions here to register them with the orchestrator
 */
export const ACTION_REGISTRY: Record<string, ActionHandler> = {
  priority: handlePriorityAction,
  calendar: handleCalendarAction,
};

/**
 * Get an action handler by name
 */
export function getActionHandler(
  actionName: string
): ActionHandler | undefined {
  return ACTION_REGISTRY[actionName];
}

/**
 * Check if an action exists
 */
export function hasActionHandler(actionName: string): boolean {
  return actionName in ACTION_REGISTRY;
}

/**
 * Get all registered action names
 */
export function getAllActionNames(): string[] {
  return Object.keys(ACTION_REGISTRY);
}
