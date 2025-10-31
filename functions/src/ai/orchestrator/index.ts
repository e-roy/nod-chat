import * as logger from "firebase-functions/logger";
import { isAIAvailable } from "../client";
import type { ProcessMessageParams } from "./types";
import { fetchEnrichedContext } from "./context";
import { analyzeMessageAndRoute } from "./agent";
import { getFallbackActionPlan } from "./fallback";
import { executeActionPlan } from "./executor";

/**
 * Main entry point for message processing with orchestrator
 * Handles AI routing, fallback logic, and action execution
 */
export async function processMessageWithOrchestrator(
  params: ProcessMessageParams
): Promise<void> {
  const startTime = Date.now();

  try {
    // Step 1: Fetch enriched context (single fetch for all operations)
    logger.info("Fetching enriched context", {
      messageId: params.messageId,
      chatId: params.chatId,
    });

    const context = await fetchEnrichedContext(params);

    // Step 2: Determine action plan (AI or fallback)
    let actionPlan;

    if (isAIAvailable()) {
      try {
        logger.info("Using AI agent for routing", {
          messageId: params.messageId,
        });
        actionPlan = await analyzeMessageAndRoute(context);
      } catch (error) {
        logger.warn("AI routing failed, falling back to rules", {
          messageId: params.messageId,
          error,
        });
        actionPlan = getFallbackActionPlan(context);
      }
    } else {
      logger.info("AI not available, using rule-based fallback", {
        messageId: params.messageId,
      });
      actionPlan = getFallbackActionPlan(context);
    }

    // Step 3: Execute actions in parallel if any
    if (actionPlan.actions.length > 0) {
      await executeActionPlan(actionPlan, context);
    } else {
      logger.info("No actions to execute", {
        messageId: params.messageId,
      });
    }

    const duration = Date.now() - startTime;
    logger.info("Message processing complete", {
      messageId: params.messageId,
      durationMs: duration,
      actionsExecuted: actionPlan.actions.length,
    });
  } catch (error) {
    logger.error("Error in message processing orchestrator:", {
      messageId: params.messageId,
      error,
    });
    // Don't throw - we don't want to affect the critical notification path
  }
}
