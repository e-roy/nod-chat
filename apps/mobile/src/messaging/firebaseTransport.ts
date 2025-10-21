import {
  collection,
  doc,
  addDoc,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseApp';
import {
  MessagingTransport,
  ChatTransport,
  ChatMessage,
  Chat,
} from '@chatapp/shared';

export class FirebaseTransport implements MessagingTransport, ChatTransport {
  private unsubscribeCallbacks: Map<string, () => void> = new Map();

  async connect(uid: string): Promise<void> {
    // Connection is implicit with Firestore listeners
    console.log(`FirebaseTransport connected for user: ${uid}`);
  }

  async send(msg: ChatMessage): Promise<void> {
    try {
      // Add message to Firestore
      const messageRef = await addDoc(
        collection(db, 'chats', msg.chatId, 'messages'),
        {
          ...msg,
          createdAt: serverTimestamp(),
        }
      );

      // Update chat's lastMessage and updatedAt
      const chatRef = doc(db, 'chats', msg.chatId);
      await updateDoc(chatRef, {
        lastMessage: {
          id: msg.id,
          text: msg.text,
          senderId: msg.senderId,
          createdAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });

      console.log('Message sent successfully:', messageRef.id);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  onMessage(chatId: string, cb: (m: ChatMessage) => void): () => void {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data();
          const message: ChatMessage = {
            id: change.doc.id,
            chatId,
            senderId: data.senderId,
            text: data.text,
            imageUrl: data.imageUrl,
            createdAt: data.createdAt?.toMillis?.() || Date.now(),
            status: data.status || 'sent',
          };
          cb(message);
        }
      });
    });

    this.unsubscribeCallbacks.set(chatId, unsubscribe);
    return unsubscribe;
  }

  async requestHistory(
    chatId: string,
    limitCount: number = 50
  ): Promise<ChatMessage[]> {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const messages: ChatMessage[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          chatId,
          senderId: data.senderId,
          text: data.text,
          imageUrl: data.imageUrl,
          createdAt: data.createdAt?.toMillis?.() || Date.now(),
          status: data.status || 'sent',
        });
      });

      return messages.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error requesting history:', error);
      throw error;
    }
  }

  async createChat(participants: string[]): Promise<string> {
    try {
      // Sort participants to create consistent chatId
      const sortedParticipants = [...participants].sort();
      const chatId = sortedParticipants.join('_');

      // Create chat document with the chatId as the document ID
      const chatRef = doc(db, 'chats', chatId);
      await setDoc(chatRef, {
        id: chatId,
        participants: sortedParticipants,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return chatId;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  async getChats(uid: string): Promise<Chat[]> {
    try {
      const chatsRef = collection(db, 'chats');
      // Temporary: Remove orderBy to avoid index requirement while building
      const q = query(
        chatsRef,
        where('participants', 'array-contains', uid)
        // orderBy('updatedAt', 'desc') // Temporarily disabled
      );

      const snapshot = await getDocs(q);
      const chats: Chat[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        chats.push({
          id: doc.id,
          name: data.name,
          participants: data.participants,
          lastMessage: data.lastMessage
            ? {
                id: data.lastMessage.id,
                chatId: doc.id,
                senderId: data.lastMessage.senderId,
                text: data.lastMessage.text,
                imageUrl: data.lastMessage.imageUrl,
                createdAt:
                  data.lastMessage.createdAt?.toMillis?.() || Date.now(),
                status: data.lastMessage.status || 'sent',
              }
            : undefined,
          createdAt: data.createdAt?.toMillis?.() || Date.now(),
          updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
        });
      });

      // Sort chats by updatedAt on the client side
      chats.sort((a, b) => b.updatedAt - a.updatedAt);
      return chats;
    } catch (error) {
      console.error('Error getting chats:', error);
      throw error;
    }
  }

  onChatUpdate(uid: string, cb: (chats: Chat[]) => void): () => void {
    const chatsRef = collection(db, 'chats');
    // Temporary: Remove orderBy to avoid index requirement while building
    const q = query(
      chatsRef,
      where('participants', 'array-contains', uid)
      // orderBy('updatedAt', 'desc') // Temporarily disabled
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const chats: Chat[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        chats.push({
          id: doc.id,
          name: data.name,
          participants: data.participants,
          lastMessage: data.lastMessage
            ? {
                id: data.lastMessage.id,
                chatId: doc.id,
                senderId: data.lastMessage.senderId,
                text: data.lastMessage.text,
                imageUrl: data.lastMessage.imageUrl,
                createdAt:
                  data.lastMessage.createdAt?.toMillis?.() || Date.now(),
                status: data.lastMessage.status || 'sent',
              }
            : undefined,
          createdAt: data.createdAt?.toMillis?.() || Date.now(),
          updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
        });
      });

      // Sort chats by updatedAt on the client side
      chats.sort((a, b) => b.updatedAt - a.updatedAt);
      cb(chats);
    });

    this.unsubscribeCallbacks.set(`chats_${uid}`, unsubscribe);
    return unsubscribe;
  }

  disconnect(): void {
    // Unsubscribe from all listeners
    this.unsubscribeCallbacks.forEach(unsubscribe => {
      unsubscribe();
    });
    this.unsubscribeCallbacks.clear();
  }
}

// Utility function to generate chat ID from two user IDs
export function generateChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

// Utility function to generate message ID
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
