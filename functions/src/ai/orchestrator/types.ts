import type { MessageData } from "../../types";

/**
 * Enriched context for AI processing
 */
export interface EnrichedContext {
  currentMessage: CurrentMessageContext;
  previousMessages: MessageContext[];
  participants: ParticipantInfo[];
  chatMetadata: {
    chatId: string;
    collectionType: "chats" | "groups";
    isGroup: boolean;
  };
}

export interface MessageContext {
  senderName: string;
  createdAt: number;
  text: string;
}

export interface CurrentMessageContext extends MessageContext {
  senderId: string;
  messageId: string;
}

export interface ParticipantInfo {
  userId: string;
  name: string;
}

/**
 * Action plan from AI agent or fallback
 */
export interface ActionPlan {
  actions: string[];
  priority?: "high" | "medium" | "low";
  reasoning?: string;
}

/**
 * Result from action execution
 */
export interface ActionResult {
  actionName: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Action handler function signature
 */
export type ActionHandler = (
  context: EnrichedContext,
  metadata?: Record<string, unknown>
) => Promise<ActionResult>;

/**
 * Parameters for orchestrator processing
 */
export interface ProcessMessageParams {
  messageData: MessageData;
  messageId: string;
  chatId: string;
  collectionType: "chats" | "groups";
}

/**
 * Available action types
 */
export type ActionType = "priority" | "calendar";
