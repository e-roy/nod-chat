import { create } from 'zustand';
import { Group } from '@chatapp/shared';
import { FirebaseTransport } from '../messaging/firebaseTransport';
import { useAuthStore } from './auth';

interface GroupState {
  groups: Group[];
  currentGroupId: string | null;
  transport: FirebaseTransport | null;
  loading: boolean;
  error: string | null;
  groupListenerActive: boolean;
  groupListenerUnsubscribe: (() => void) | null;
}

interface GroupActions {
  initializeTransport: () => void;
  setCurrentGroup: (groupId: string | null) => void;
  loadGroups: () => Promise<void>;
  createGroup: (name: string, memberIds: string[]) => Promise<string>;
  addGroupMember: (groupId: string, userId: string) => Promise<void>;
  removeGroupMember: (groupId: string, userId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  updateGroupReadStatus: (groupId: string) => Promise<void>;
  clearError: () => void;
  disconnect: () => void;
}

export const useGroupStore = create<GroupState & GroupActions>((set, get) => ({
  groups: [],
  currentGroupId: null,
  transport: null,
  loading: false,
  error: null,
  groupListenerActive: false,
  groupListenerUnsubscribe: null,

  initializeTransport: () => {
    const transport = new FirebaseTransport();
    set({ transport });
  },

  setCurrentGroup: (groupId: string | null) => {
    set({ currentGroupId: groupId });
  },

  loadGroups: async () => {
    const { transport, groupListenerActive } = get();
    const { user } = useAuthStore.getState();

    if (!transport || !user) {
      return;
    }

    // Prevent multiple listeners
    if (groupListenerActive) {
      return;
    }

    set({ loading: true, error: null, groupListenerActive: true });

    try {
      // Set up real-time listener for groups
      const unsubscribe = transport.onGroupUpdate(user.uid, groups => {
        // Only update if user is still logged in
        const currentUser = useAuthStore.getState().user;
        if (currentUser && currentUser.uid === user.uid) {
          set({ groups });
        }
      });

      // Store the unsubscribe function
      set({ groupListenerUnsubscribe: unsubscribe });
    } catch (error) {
      console.error('Error loading groups:', error);
      set({ error: 'Failed to load groups', groupListenerActive: false });
    } finally {
      set({ loading: false });
    }
  },

  createGroup: async (name: string, memberIds: string[]) => {
    const { transport } = get();
    const { user } = useAuthStore.getState();

    if (!transport || !user) {
      set({ error: 'Transport not initialized or user not authenticated' });
      return '';
    }

    try {
      // Ensure creator is included in members
      const allMembers = [...new Set([...memberIds, user.uid])];
      const groupId = await transport.createGroup(name, allMembers, user.uid);
      return groupId;
    } catch (error) {
      console.error('Error creating group:', error);
      set({ error: 'Failed to create group' });
      return '';
    }
  },

  addGroupMember: async (groupId: string, userId: string) => {
    const { transport } = get();
    const { user } = useAuthStore.getState();

    if (!transport || !user) {
      set({ error: 'Transport not initialized or user not authenticated' });
      return;
    }

    try {
      await transport.addGroupMember(groupId, userId, user.uid);
    } catch (error) {
      console.error('Error adding group member:', error);
      set({ error: 'Failed to add group member' });
    }
  },

  removeGroupMember: async (groupId: string, userId: string) => {
    const { transport } = get();
    const { user } = useAuthStore.getState();

    if (!transport || !user) {
      set({ error: 'Transport not initialized or user not authenticated' });
      return;
    }

    try {
      await transport.removeGroupMember(groupId, userId, user.uid);
    } catch (error) {
      console.error('Error removing group member:', error);
      set({ error: 'Failed to remove group member' });
    }
  },

  leaveGroup: async (groupId: string) => {
    const { transport } = get();
    const { user } = useAuthStore.getState();

    if (!transport || !user) {
      set({ error: 'Transport not initialized or user not authenticated' });
      return;
    }

    try {
      await transport.leaveGroup(groupId, user.uid);
    } catch (error) {
      console.error('Error leaving group:', error);
      set({ error: 'Failed to leave group' });
    }
  },

  updateGroupReadStatus: async (groupId: string) => {
    const { transport } = get();
    const { user } = useAuthStore.getState();

    if (!transport || !user) return;

    try {
      await transport.updateGroupReadStatus(groupId, user.uid);
    } catch (error) {
      console.error('Error updating group read status:', error);
      set({ error: 'Failed to update group read status' });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  disconnect: () => {
    const { transport, groupListenerUnsubscribe } = get();

    // Unsubscribe from group listener FIRST
    if (groupListenerUnsubscribe) {
      try {
        groupListenerUnsubscribe();
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Clean up transport listeners
    if (transport) {
      transport.disconnect();
    }

    // IMPORTANT: Reset ALL state to prevent data leakage between users
    set({
      groups: [],
      currentGroupId: null,
      transport: null,
      groupListenerActive: false,
      groupListenerUnsubscribe: null,
      loading: false,
      error: null,
    });
  },
}));
