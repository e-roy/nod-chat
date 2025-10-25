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
