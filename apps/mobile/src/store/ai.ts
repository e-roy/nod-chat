import { create } from 'zustand';
import { doc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db, functions } from '@/firebase/firebaseApp';
import { httpsCallable } from 'firebase/functions';
import {
  ChatAI,
  ChatPriorities,
  ChatCalendar,
  ActionItem,
  Decision,
  SearchResult,
} from '@chatapp/shared';

interface AIStore {
  // State
  chatAISummaries: Map<string, ChatAI>;
  chatPriorities: Map<string, ChatPriorities>;
  chatCalendar: Map<string, ChatCalendar>;
  searchResults: Map<string, SearchResult[]>;
  loading: Map<string, boolean>;
  errors: Map<string, string>;

  // Listeners
  priorityListeners: Map<string, Unsubscribe>;
  calendarListeners: Map<string, Unsubscribe>;

  // Actions
  loadChatAI: (chatId: string) => Promise<void>;
  loadPriorities: (chatId: string) => void;
  loadCalendar: (chatId: string) => void;
  generateSummary: (chatId: string, forceRefresh?: boolean) => Promise<string>;
  extractActionItems: (
    chatId: string,
    forceRefresh?: boolean
  ) => Promise<ActionItem[]>;
  extractDecisions: (chatId: string, subject?: string) => Promise<Decision[]>;
  searchMessages: (chatId: string, query: string) => Promise<SearchResult[]>;
  unsubscribeFromChat: (chatId: string) => void;
  clearError: (chatId: string) => void;
}

export const useAIStore = create<AIStore>((set, get) => ({
  // Initial state
  chatAISummaries: new Map(),
  chatPriorities: new Map(),
  chatCalendar: new Map(),
  searchResults: new Map(),
  loading: new Map(),
  errors: new Map(),
  priorityListeners: new Map(),
  calendarListeners: new Map(),

  // Load chat AI data from Firestore
  loadChatAI: async (chatId: string) => {
    try {
      const aiDoc = await getDoc(doc(db, 'chatAI', chatId));
      if (aiDoc.exists()) {
        const data = aiDoc.data() as ChatAI;
        set(state => {
          const newSummaries = new Map(state.chatAISummaries);
          newSummaries.set(chatId, data);
          return { chatAISummaries: newSummaries };
        });
      }
    } catch (error) {
      console.error('Error loading chat AI:', error);
      set(state => {
        const newErrors = new Map(state.errors);
        newErrors.set(chatId, 'Failed to load AI data');
        return { errors: newErrors };
      });
    }
  },

  // Subscribe to real-time priority updates
  loadPriorities: (chatId: string) => {
    const { priorityListeners } = get();

    // Unsubscribe existing listener if any
    const existingListener = priorityListeners.get(chatId);
    if (existingListener) {
      existingListener();
    }

    // Subscribe to priority updates
    const unsubscribe = onSnapshot(
      doc(db, 'chatPriorities', chatId),
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data() as ChatPriorities;
          set(state => {
            const newPriorities = new Map(state.chatPriorities);
            newPriorities.set(chatId, data);
            return { chatPriorities: newPriorities };
          });
        }
      },
      error => {
        console.error('Error loading priorities:', error);
      }
    );

    // Store listener
    set(state => {
      const newListeners = new Map(state.priorityListeners);
      newListeners.set(chatId, unsubscribe);
      return { priorityListeners: newListeners };
    });
  },

  // Subscribe to real-time calendar updates
  loadCalendar: (chatId: string) => {
    const { calendarListeners } = get();

    // Unsubscribe existing listener if any
    const existingListener = calendarListeners.get(chatId);
    if (existingListener) {
      existingListener();
    }

    // Subscribe to calendar updates
    const unsubscribe = onSnapshot(
      doc(db, 'chatCalendar', chatId),
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data() as ChatCalendar;
          set(state => {
            const newCalendar = new Map(state.chatCalendar);
            newCalendar.set(chatId, data);
            return { chatCalendar: newCalendar };
          });
        }
      },
      error => {
        console.error('Error loading calendar:', error);
      }
    );

    // Store listener
    set(state => {
      const newListeners = new Map(state.calendarListeners);
      newListeners.set(chatId, unsubscribe);
      return { calendarListeners: newListeners };
    });
  },

  // Generate summary using Firebase callable function
  generateSummary: async (chatId: string, forceRefresh = false) => {
    set(state => {
      const newLoading = new Map(state.loading);
      newLoading.set(`summary-${chatId}`, true);
      return { loading: newLoading };
    });

    try {
      const callable = httpsCallable<
        { chatId: string; forceRefresh?: boolean },
        { summary: string }
      >(functions, 'generateChatSummary');

      const result = await callable({ chatId, forceRefresh });
      const summary = result.data.summary;

      // Update local state
      set(state => {
        const newSummaries = new Map(state.chatAISummaries);
        const existing = newSummaries.get(chatId) || {
          chatId,
          summary: null,
          actionItems: [],
          decisions: [],
          lastUpdated: 0,
          messageCount: 0,
        };
        newSummaries.set(chatId, {
          ...existing,
          summary,
          lastUpdated: Date.now(),
        });
        return { chatAISummaries: newSummaries };
      });

      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      set(state => {
        const newErrors = new Map(state.errors);
        newErrors.set(chatId, 'Failed to generate summary');
        return { errors: newErrors };
      });
      throw error;
    } finally {
      set(state => {
        const newLoading = new Map(state.loading);
        newLoading.delete(`summary-${chatId}`);
        return { loading: newLoading };
      });
    }
  },

  // Extract action items using Firebase callable function
  extractActionItems: async (chatId: string, forceRefresh = false) => {
    set(state => {
      const newLoading = new Map(state.loading);
      newLoading.set(`actions-${chatId}`, true);
      return { loading: newLoading };
    });

    try {
      const callable = httpsCallable<
        { chatId: string; forceRefresh?: boolean },
        { actionItems: ActionItem[] }
      >(functions, 'extractChatActionItems');

      const result = await callable({ chatId, forceRefresh });
      const actionItems = result.data.actionItems;

      // Update local state
      set(state => {
        const newSummaries = new Map(state.chatAISummaries);
        const existing = newSummaries.get(chatId) || {
          chatId,
          summary: null,
          actionItems: [],
          decisions: [],
          lastUpdated: 0,
          messageCount: 0,
        };
        newSummaries.set(chatId, {
          ...existing,
          actionItems,
          lastUpdated: Date.now(),
        });
        return { chatAISummaries: newSummaries };
      });

      return actionItems;
    } catch (error) {
      console.error('Error extracting action items:', error);
      set(state => {
        const newErrors = new Map(state.errors);
        newErrors.set(chatId, 'Failed to extract action items');
        return { errors: newErrors };
      });
      throw error;
    } finally {
      set(state => {
        const newLoading = new Map(state.loading);
        newLoading.delete(`actions-${chatId}`);
        return { loading: newLoading };
      });
    }
  },

  // Extract decisions using Firebase callable function
  extractDecisions: async (chatId: string, subject?: string) => {
    set(state => {
      const newLoading = new Map(state.loading);
      newLoading.set(`decisions-${chatId}`, true);
      return { loading: newLoading };
    });

    try {
      const callable = httpsCallable<
        { chatId: string; subject?: string },
        { decisions: Decision[] }
      >(functions, 'extractChatDecisions');

      const result = await callable({ chatId, subject });
      const decisions = result.data.decisions;

      // Update local state
      set(state => {
        const newSummaries = new Map(state.chatAISummaries);
        const existing = newSummaries.get(chatId) || {
          chatId,
          summary: null,
          actionItems: [],
          decisions: [],
          lastUpdated: 0,
          messageCount: 0,
        };
        newSummaries.set(chatId, {
          ...existing,
          decisions,
          lastUpdated: Date.now(),
        });
        return { chatAISummaries: newSummaries };
      });

      return decisions;
    } catch (error) {
      console.error('Error extracting decisions:', error);
      set(state => {
        const newErrors = new Map(state.errors);
        newErrors.set(chatId, 'Failed to extract decisions');
        return { errors: newErrors };
      });
      throw error;
    } finally {
      set(state => {
        const newLoading = new Map(state.loading);
        newLoading.delete(`decisions-${chatId}`);
        return { loading: newLoading };
      });
    }
  },

  // Search messages using Firebase callable function
  searchMessages: async (chatId: string, query: string) => {
    set(state => {
      const newLoading = new Map(state.loading);
      newLoading.set(`search-${chatId}`, true);
      return { loading: newLoading };
    });

    try {
      const callable = httpsCallable<
        { chatId: string; query: string },
        { results: SearchResult[] }
      >(functions, 'searchChatMessages');

      const result = await callable({ chatId, query });
      const results = result.data.results;

      // Update local state
      set(state => {
        const newResults = new Map(state.searchResults);
        newResults.set(chatId, results);
        return { searchResults: newResults };
      });

      return results;
    } catch (error) {
      console.error('Error searching messages:', error);
      set(state => {
        const newErrors = new Map(state.errors);
        newErrors.set(chatId, 'Failed to search messages');
        return { errors: newErrors };
      });
      throw error;
    } finally {
      set(state => {
        const newLoading = new Map(state.loading);
        newLoading.delete(`search-${chatId}`);
        return { loading: newLoading };
      });
    }
  },

  // Unsubscribe from real-time listeners
  unsubscribeFromChat: (chatId: string) => {
    const { priorityListeners, calendarListeners } = get();

    const priorityListener = priorityListeners.get(chatId);
    if (priorityListener) {
      priorityListener();
      set(state => {
        const newListeners = new Map(state.priorityListeners);
        newListeners.delete(chatId);
        return { priorityListeners: newListeners };
      });
    }

    const calendarListener = calendarListeners.get(chatId);
    if (calendarListener) {
      calendarListener();
      set(state => {
        const newListeners = new Map(state.calendarListeners);
        newListeners.delete(chatId);
        return { calendarListeners: newListeners };
      });
    }
  },

  // Clear error for a chat
  clearError: (chatId: string) => {
    set(state => {
      const newErrors = new Map(state.errors);
      newErrors.delete(chatId);
      return { errors: newErrors };
    });
  },
}));
