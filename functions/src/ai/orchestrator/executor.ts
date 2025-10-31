import * as logger from "firebase-functions/logger";
import type { EnrichedContext, ActionPlan, ActionResult } from "./types";
import { ACTION_REGISTRY, getActionHandler } from "../actions";

/**
 * Execute actions from action plan in parallel
 * Passes shared enriched context to all actions
 */
export async function executeActionPlan(
  actionPlan: ActionPlan,
  context: EnrichedContext
): Promise<ActionResult[]> {
  const { actions } = actionPlan;

  if (actions.length === 0) {
    logger.info("No actions to execute", {
      messageId: context.currentMessage.messageId,
    });
    return [];
  }

  logger.info("Executing actions in parallel", {
    messageId: context.currentMessage.messageId,
    actionCount: actions.length,
    actions,
    priority: actionPlan.priority,
  });

  // Execute all actions in parallel
  const actionPromises = actions.map(async (actionName) => {
    return executeSingleAction(actionName, context, {
      reasoning: actionPlan.reasoning,
    });
  });

  // Wait for all actions to complete
  const results = await Promise.allSettled(actionPromises);

  // Process results and handle errors
  const actionResults: ActionResult[] = results.map((result, index) => {
    const actionName = actions[index];

    if (result.status === "fulfilled") {
      logger.info(`Action completed: ${actionName}`, {
        messageId: context.currentMessage.messageId,
        success: result.value.success,
      });
      return result.value;
    } else {
      logger.error(`Action failed: ${actionName}`, {
        messageId: context.currentMessage.messageId,
        error: result.reason,
      });
      return {
        actionName,
        success: false,
        error: result.reason?.message || "Unknown error",
      };
    }
  });

  // Log summary
  const successCount = actionResults.filter((r) => r.success).length;
  const failureCount = actionResults.length - successCount;

  logger.info("Action execution complete", {
    messageId: context.currentMessage.messageId,
    successCount,
    failureCount,
    results: actionResults.map((r) => ({
      action: r.actionName,
      success: r.success,
    })),
  });

  return actionResults;
}

/**
 * Execute a single action
 */
async function executeSingleAction(
  actionName: string,
  context: EnrichedContext,
  metadata?: Record<string, unknown>
): Promise<ActionResult> {
  // Get action handler from registry
  const handler = getActionHandler(actionName);

  if (!handler) {
    logger.warn(`Unknown action: ${actionName}`, {
      messageId: context.currentMessage.messageId,
      availableActions: Object.keys(ACTION_REGISTRY),
    });
    return {
      actionName,
      success: false,
      error: `Unknown action: ${actionName}`,
    };
  }

  try {
    // Execute action with shared context
    return await handler(context, metadata);
  } catch (error) {
    logger.error(`Error executing action: ${actionName}`, {
      messageId: context.currentMessage.messageId,
      error,
    });
    return {
      actionName,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
