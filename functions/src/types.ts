import { FieldValue } from "firebase-admin/firestore";

/**
 * Firebase Admin Types
 * Shared interfaces used across Firebase Functions
 */

// Firestore Data Interfaces
export interface MessageData {
  id: string;
  chatId: string;
  senderId: string;
  text?: string;
  imageUrl?: string | null;
  createdAt: number | FieldValue;
  status?: string;
  readBy?: string[];
}

export interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  fcmToken?: string;
}

export interface ChatData {
  id: string;
  participants: string[];
  name?: string;
}

export interface GroupData {
  id: string;
  members: string[];
  name: string;
}

// AI Processing Types
export interface MessageContext {
  senderName: string;
  createdAt: number;
  text: string;
}

// AI Analysis Request Types
export interface GenerateSummaryRequest {
  chatId: string;
  forceRefresh?: boolean;
}

export interface ExtractActionItemsRequest {
  chatId: string;
  forceRefresh?: boolean;
}

export interface ExtractDecisionsRequest {
  chatId: string;
  subject?: string;
}

export interface SearchMessagesRequest {
  chatId: string;
  query: string;
}
