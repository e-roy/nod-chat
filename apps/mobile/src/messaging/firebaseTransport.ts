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
import { db } from '@/firebase/firebaseApp';
import {
  MessagingTransport,
  ChatTransport,
  GroupTransport,
  ChatMessage,
  Chat,
  Group,
} from '@chatapp/shared';

export class FirebaseTransport
  implements MessagingTransport, ChatTransport, GroupTransport
{
  private unsubscribeCallbacks: Map<string, () => void> = new Map();

  async connect(uid: string): Promise<void> {
    // Connection is implicit with Firestore listeners
  }

  async send(msg: ChatMessage): Promise<void> {
    try {
      // Determine if this is a group message or regular chat
      const isGroupMessage = msg.chatId.startsWith('group_');
      const collectionName = isGroupMessage ? 'groups' : 'chats';

      // Use the client-generated message ID instead of letting Firestore generate one
      const messageRef = doc(
        db,
        collectionName,
        msg.chatId,
        'messages',
        msg.id
      );

      // For group messages, initialize readBy with sender
      const messageData: any = {
        id: msg.id,
        chatId: msg.chatId,
        senderId: msg.senderId,
        text: msg.text,
        status: 'sent', // Set status to 'sent' when writing to Firestore
        createdAt: serverTimestamp(),
      };

      // Only include optional fields if they're defined
      if (msg.imageUrl !== undefined) {
        messageData.imageUrl = msg.imageUrl;
      }
      if (msg.readBy !== undefined) {
        messageData.readBy = msg.readBy;
      }

      await setDoc(messageRef, messageData);

      // Update chat/group's lastMessage and updatedAt
      const chatRef = doc(db, collectionName, msg.chatId);
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
    // Determine if this is a group message or regular chat
    const isGroupMessage = chatId.startsWith('group_');
    const collectionName = isGroupMessage ? 'groups' : 'chats';

    const messagesRef = collection(db, collectionName, chatId, 'messages');
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
            readBy: data.readBy || undefined,
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
      // Determine if this is a group message or regular chat
      const isGroupMessage = chatId.startsWith('group_');
      const collectionName = isGroupMessage ? 'groups' : 'chats';

      const messagesRef = collection(db, collectionName, chatId, 'messages');
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
          readBy: data.readBy || undefined,
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
      // Determine if this is a group message or regular chat
      const isGroupMessage = chatId.startsWith('group_');
      const collectionName = isGroupMessage ? 'groups' : 'chats';

      const messageRef = doc(db, collectionName, chatId, 'messages', messageId);
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

  // Group Transport Methods
  async createGroup(
    name: string,
    members: string[],
    creatorId: string
  ): Promise<string> {
    try {
      const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const groupRef = doc(db, 'groups', groupId);
      const groupData = {
        id: groupId,
        name,
        members,
        admins: [creatorId], // Creator is the first admin
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(groupRef, groupData);
      return groupId;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  async getGroups(uid: string): Promise<Group[]> {
    try {
      const groupsRef = collection(db, 'groups');
      const q = query(groupsRef, where('members', 'array-contains', uid));

      const snapshot = await getDocs(q);
      const groups: Group[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.members && data.members.includes(uid)) {
          groups.push({
            id: doc.id,
            name: data.name,
            photoURL: data.photoURL,
            members: data.members,
            admins: data.admins,
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
                  readBy: data.lastMessage.readBy || [],
                }
              : undefined,
            createdAt: data.createdAt?.toMillis?.() || Date.now(),
            updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
          });
        }
      });

      groups.sort((a, b) => b.updatedAt - a.updatedAt);
      return groups;
    } catch (error) {
      console.error('Error getting groups:', error);
      throw error;
    }
  }

  onGroupUpdate(uid: string, cb: (groups: Group[]) => void): () => void {
    const groupsRef = collection(db, 'groups');
    const q = query(groupsRef, where('members', 'array-contains', uid));

    const unsubscribe = onSnapshot(q, snapshot => {
      const userGroups: Group[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.members && data.members.includes(uid)) {
          userGroups.push({
            id: doc.id,
            name: data.name,
            photoURL: data.photoURL,
            members: data.members,
            admins: data.admins,
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
                  readBy: data.lastMessage.readBy || [],
                }
              : undefined,
            createdAt: data.createdAt?.toMillis?.() || Date.now(),
            updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
          });
        }
      });

      userGroups.sort((a, b) => b.updatedAt - a.updatedAt);
      cb(userGroups);
    });

    this.unsubscribeCallbacks.set(`groups_${uid}`, unsubscribe);
    return unsubscribe;
  }

  async addGroupMember(
    groupId: string,
    userId: string,
    adminId: string
  ): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);

      if (!groupDoc.exists()) {
        throw new Error('Group not found');
      }

      const groupData = groupDoc.data();
      if (!groupData.admins.includes(adminId)) {
        throw new Error('Only admins can add members');
      }

      if (groupData.members.includes(userId)) {
        return; // User is already a member
      }

      await updateDoc(groupRef, {
        members: [...groupData.members, userId],
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error adding group member:', error);
      throw error;
    }
  }

  async removeGroupMember(
    groupId: string,
    userId: string,
    adminId: string
  ): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);

      if (!groupDoc.exists()) {
        throw new Error('Group not found');
      }

      const groupData = groupDoc.data();
      if (!groupData.admins.includes(adminId)) {
        throw new Error('Only admins can remove members');
      }

      if (!groupData.members.includes(userId)) {
        return; // User is not a member
      }

      const updatedMembers = groupData.members.filter(
        (id: string) => id !== userId
      );
      const updatedAdmins = groupData.admins.filter(
        (id: string) => id !== userId
      );

      await updateDoc(groupRef, {
        members: updatedMembers,
        admins: updatedAdmins,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error removing group member:', error);
      throw error;
    }
  }

  async leaveGroup(groupId: string, userId: string): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);

      if (!groupDoc.exists()) {
        throw new Error('Group not found');
      }

      const groupData = groupDoc.data();
      if (!groupData.members.includes(userId)) {
        return; // User is not a member
      }

      const updatedMembers = groupData.members.filter(
        (id: string) => id !== userId
      );
      const updatedAdmins = groupData.admins.filter(
        (id: string) => id !== userId
      );

      await updateDoc(groupRef, {
        members: updatedMembers,
        admins: updatedAdmins,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  }

  async updateGroupReadStatus(groupId: string, userId: string): Promise<void> {
    try {
      const messagesRef = collection(db, 'groups', groupId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(50));

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return;
      }

      // Filter messages client-side: from other users and not already read by this user
      const messagesToUpdate = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.senderId !== userId && !data.readBy?.includes(userId);
      });

      if (messagesToUpdate.length === 0) {
        return;
      }

      // Use batch write for efficiency
      const batch = writeBatch(db);

      messagesToUpdate.forEach(doc => {
        const messageRef = doc.ref;
        const currentReadBy = doc.data().readBy || [];
        batch.update(messageRef, {
          readBy: [...currentReadBy, userId],
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error updating group read status:', error);
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
