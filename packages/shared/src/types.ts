export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
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
  status?: "sending" | "sent" | "delivered" | "read";
}

export interface Chat {
  id: string;
  name?: string; // for group chats
  participants: string[]; // user IDs
  lastMessage?: ChatMessage;
  createdAt: number;
  updatedAt: number;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

