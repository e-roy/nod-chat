import { ChatMessage, Group } from "./types";

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

export interface GroupTransport {
  createGroup(
    name: string,
    members: string[],
    creatorId: string
  ): Promise<string>;
  getGroups(uid: string): Promise<Group[]>;
  onGroupUpdate(uid: string, cb: (groups: Group[]) => void): () => void;
  addGroupMember(
    groupId: string,
    userId: string,
    adminId: string
  ): Promise<void>;
  removeGroupMember(
    groupId: string,
    userId: string,
    adminId: string
  ): Promise<void>;
  leaveGroup(groupId: string, userId: string): Promise<void>;
  updateGroupReadStatus(groupId: string, userId: string): Promise<void>;
}
