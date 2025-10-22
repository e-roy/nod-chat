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
  getDoc,
  Timestamp,
  writeBatch,
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
  }

  async send(msg: ChatMessage): Promise<void> {
    try {
      // Use the client-generated message ID instead of letting Firestore generate one
      const messageRef = doc(db, 'chats', msg.chatId, 'messages', msg.id);
      await setDoc(messageRef, {
        ...msg,
        createdAt: serverTimestamp(),
      });

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
        // Listen for both new messages and status updates
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

      // Check if chat already exists
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);

      if (chatDoc.exists()) {
        return chatId;
      }

      // Create chat document with the chatId as the document ID
      const chatData = {
        id: chatId,
        participants: sortedParticipants,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(chatRef, chatData);
      return chatId;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  async getChats(uid: string): Promise<Chat[]> {
    try {
      const chatsRef = collection(db, 'chats');
      // Query only chats where this user is a participant
      const q = query(chatsRef, where('participants', 'array-contains', uid));

      const snapshot = await getDocs(q);
      const chats: Chat[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        // Double-check participant filtering (defense in depth)
        if (data.participants && data.participants.includes(uid)) {
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
        }
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
    // Query only chats where this user is a participant
    const q = query(chatsRef, where('participants', 'array-contains', uid));

    const unsubscribe = onSnapshot(q, snapshot => {
      const userChats: Chat[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Double-check participant filtering (defense in depth)
        if (data.participants && data.participants.includes(uid)) {
          userChats.push({
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
        }
      });

      // Sort chats by updatedAt on the client side
      userChats.sort((a, b) => b.updatedAt - a.updatedAt);
      cb(userChats);
    });

    this.unsubscribeCallbacks.set(`chats_${uid}`, unsubscribe);
    return unsubscribe;
  }

  // Debug function to check if a chat exists and what participants it has
  async debugChat(chatId: string): Promise<any> {
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);

      if (chatDoc.exists()) {
        return chatDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error checking chat:', error);
      return null;
    }
  }

  disconnect(): void {
    // Unsubscribe from all listeners
    this.unsubscribeCallbacks.forEach(unsubscribe => {
      unsubscribe();
    });
    this.unsubscribeCallbacks.clear();
  }

  // User directory functions
  async createUserProfile(
    uid: string,
    email: string,
    displayName?: string
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  async findUserByEmail(email: string): Promise<string | null> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      return userData.uid;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  // Debug function to manually check all chats in the database
  async debugAllChats(): Promise<any[]> {
    try {
      const chatsRef = collection(db, 'chats');
      const snapshot = await getDocs(chatsRef);

      const chats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return chats;
    } catch (error) {
      console.error('Error getting all chats:', error);
      return [];
    }
  }

  // Mark messages as read when user views a chat
  async markMessagesAsRead(
    chatId: string,
    userId: string,
    limitCount: number = 50
  ): Promise<void> {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      // Get recent messages and filter client-side to avoid multiple != filters
      const q = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return;
      }

      // Filter messages client-side: from other users and not already read
      const messagesToUpdate = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.senderId !== userId && data.status !== 'read';
      });

      if (messagesToUpdate.length === 0) {
        return;
      }

      // Use batch write for efficiency
      const batch = writeBatch(db);
      const readAt = serverTimestamp();

      messagesToUpdate.forEach(doc => {
        const messageRef = doc.ref;
        batch.update(messageRef, {
          status: 'read',
          readAt: readAt,
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  // Update message status (for delivered/read receipts)
  async updateMessageStatus(
    chatId: string,
    messageId: string,
    status: 'sent' | 'delivered' | 'read',
    readAt?: number
  ): Promise<void> {
    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
      const updateData: any = { status };

      if (status === 'read' && readAt) {
        updateData.readAt = readAt;
      }

      await updateDoc(messageRef, updateData);
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
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
