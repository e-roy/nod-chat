import { ChatMessage } from "./types";

export interface MessagingTransport {
  connect(uid: string): Promise<void>;
  send(msg: ChatMessage): Promise<void>;
  onMessage(chatId: string, cb: (m: ChatMessage) => void): () => void;
  requestHistory(chatId: string, limit?: number): Promise<ChatMessage[]>;
}

export interface ChatTransport {
  createChat(participants: string[]): Promise<string>;
  getChats(uid: string): Promise<any[]>;
  onChatUpdate(uid: string, cb: (chats: any[]) => void): () => void;
}
