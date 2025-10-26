export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  statusMessage?: string;
  online: boolean;
  lastSeen?: number; // timestamp in ms
  createdAt: number; // timestamp in ms
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  text?: string;
  imageUrl?: string | null;
  createdAt: number; // ms epoch
  status?: "sending" | "sent" | "delivered" | "read" | "failed";
  readBy?: string[]; // array of user IDs who have read this message (for groups)
}

export interface Chat {
  id: string;
  name?: string; // for group chats
  participants: string[]; // user IDs
  lastMessage?: ChatMessage;
  createdAt: number;
  updatedAt: number;
}

export interface Group {
  id: string;
  name: string;
  photoURL?: string;
  members: string[]; // user IDs
  admins: string[]; // user IDs who can add/remove members
  lastMessage?: ChatMessage;
  createdAt: number;
  updatedAt: number;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// AI-related types

export interface ActionItem {
  id: string;
  text: string;
  assignee?: string;
  status: "pending" | "done";
  dueDate?: number;
}

export interface Decision {
  id: string;
  subject: string;
  decision: string;
  timestamp: number;
}

export interface ChatAI {
  chatId: string;
  summary: string | null;
  actionItems: ActionItem[];
  decisions: Decision[];
  lastUpdated: number;
  messageCount: number;
  messageCountAtSummary: number;
  messageCountAtActionItems: number;
  messageCountAtDecisions: number;
}

export interface Priority {
  messageId: string;
  level: "high" | "urgent";
  reason: string;
  timestamp: number;
}

export interface ChatPriorities {
  chatId: string;
  priorities: Priority[];
  lastUpdated: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: number;
  time?: string;
  participants?: string[];
  extractedFrom: string; // messageId
  chatId?: string;
}

export interface ChatCalendar {
  chatId: string;
  events: CalendarEvent[];
  lastUpdated: number;
}

export interface UserCalendar {
  userId: string;
  events: Array<CalendarEvent & { chatId: string }>;
  lastUpdated: number;
}

export interface UserPriorities {
  userId: string;
  priorities: Array<Priority & { chatId: string }>;
  lastUpdated: number;
}

export interface SearchResult {
  messageId: string;
  relevance: number;
  snippet: string;
}
