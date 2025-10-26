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
  checkSummaryStaleness: (chatId: string) => Promise<boolean>;
  autoGenerateSummary: (chatId: string) => Promise<void>;
  extractActionItems: (
    chatId: string,
    forceRefresh?: boolean
  ) => Promise<ActionItem[]>;
  checkActionItemsStaleness: (chatId: string) => Promise<boolean>;
  autoExtractActionItems: (chatId: string) => Promise<void>;
  extractDecisions: (chatId: string, subject?: string) => Promise<Decision[]>;
  checkDecisionsStaleness: (chatId: string) => Promise<boolean>;
  autoExtractDecisions: (chatId: string) => Promise<void>;
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

    // Set loading state
    set(state => {
      const newLoading = new Map(state.loading);
      newLoading.set(`calendar-${chatId}`, true);
      return { loading: newLoading };
    });

    // Clear any existing errors
    set(state => {
      const newErrors = new Map(state.errors);
      newErrors.delete(`calendar-${chatId}`);
      return { errors: newErrors };
    });

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
            const newLoading = new Map(state.loading);
            newLoading.set(`calendar-${chatId}`, false);
            return { chatCalendar: newCalendar, loading: newLoading };
          });
        } else {
          // Document doesn't exist yet - clear loading
          set(state => {
            const newLoading = new Map(state.loading);
            newLoading.set(`calendar-${chatId}`, false);
            return { loading: newLoading };
          });
        }
      },
      error => {
        console.error('Error loading calendar:', error);
        set(state => {
          const newErrors = new Map(state.errors);
          newErrors.set(`calendar-${chatId}`, 'Failed to load calendar');
          const newLoading = new Map(state.loading);
          newLoading.set(`calendar-${chatId}`, false);
          return { errors: newErrors, loading: newLoading };
        });
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
        { summary: string; messageCount: number }
      >(functions, 'generateChatSummary');

      const result = await callable({ chatId, forceRefresh });
      const summary = result.data.summary;
      const messageCount = result.data.messageCount;

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
          messageCountAtSummary: 0,
          messageCountAtActionItems: 0,
          messageCountAtDecisions: 0,
        };
        newSummaries.set(chatId, {
          ...existing,
          summary,
          lastUpdated: Date.now(),
          messageCount,
          messageCountAtSummary: messageCount,
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
        { actionItems: ActionItem[]; messageCount: number }
      >(functions, 'extractChatActionItems');

      const result = await callable({ chatId, forceRefresh });
      const actionItems = result.data.actionItems;
      const messageCount = result.data.messageCount;

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
          messageCountAtSummary: 0,
          messageCountAtActionItems: 0,
          messageCountAtDecisions: 0,
        };
        newSummaries.set(chatId, {
          ...existing,
          actionItems,
          lastUpdated: Date.now(),
          messageCount,
          messageCountAtActionItems: messageCount,
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
        { decisions: Decision[]; messageCount: number }
      >(functions, 'extractChatDecisions');

      const result = await callable({ chatId, subject });
      const decisions = result.data.decisions;
      const messageCount = result.data.messageCount;

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
          messageCountAtSummary: 0,
          messageCountAtActionItems: 0,
          messageCountAtDecisions: 0,
        };
        newSummaries.set(chatId, {
          ...existing,
          decisions,
          lastUpdated: Date.now(),
          messageCount,
          messageCountAtDecisions: messageCount,
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

  // Check if decisions are stale (new messages since last extraction)
  checkDecisionsStaleness: async (chatId: string): Promise<boolean> => {
    const state = get();
    const chatAI = state.chatAISummaries.get(chatId);

    if (!chatAI || !chatAI.decisions || chatAI.decisions.length === 0) {
      return true; // No decisions exist, consider stale
    }

    const currentMessageCount = chatAI.messageCount || 0;
    const messageCountAtDecisions = chatAI.messageCountAtDecisions || 0;

    // Check if new messages have been added
    return currentMessageCount > messageCountAtDecisions;
  },

  // Auto-extract decisions if needed
  autoExtractDecisions: async (chatId: string): Promise<void> => {
    const state = get();
    const chatAI = state.chatAISummaries.get(chatId);

    // Always extract if no decisions exist
    const hasDecisions = chatAI?.decisions && chatAI.decisions.length > 0;

    if (!hasDecisions) {
      await state.extractDecisions(chatId);
      return;
    }

    // Check if decisions are stale
    const isStale = await state.checkDecisionsStaleness(chatId);
    if (isStale) {
      // Refresh in background while showing old decisions
      state.extractDecisions(chatId).catch(err => {
        console.error('Background refresh of decisions failed:', err);
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

  // Check if summary is stale (new messages since last summary)
  checkSummaryStaleness: async (chatId: string): Promise<boolean> => {
    try {
      const { chatAISummaries } = get();
      const existing = chatAISummaries.get(chatId);

      if (!existing || !existing.summary) {
        return true; // No summary exists
      }

      // Get current message count
      const callable = httpsCallable<
        { chatId: string; forceRefresh?: boolean },
        { summary: string; messageCount: number }
      >(functions, 'generateChatSummary');

      // Just check message count by attempting to get cached data
      const result = await callable({ chatId, forceRefresh: false });
      const currentMessageCount = result.data.messageCount;

      // Check if there are new messages since summary was created
      const messageCountAtSummary =
        existing.messageCountAtSummary || existing.messageCount || 0;
      const stale = currentMessageCount > messageCountAtSummary;

      if (stale) {
        console.log(
          `Summary stale for ${chatId}: ${currentMessageCount} messages now vs ${messageCountAtSummary} at summary`
        );
      }

      return stale;
    } catch (error) {
      console.error('Error checking summary staleness:', error);
      return false; // Assume not stale on error
    }
  },

  // Auto-generate summary if needed (checks staleness first)
  autoGenerateSummary: async (chatId: string): Promise<void> => {
    try {
      const { checkSummaryStaleness, generateSummary } = get();

      // Check if summary exists and is not stale
      const { chatAISummaries } = get();
      const existing = chatAISummaries.get(chatId);

      if (!existing || !existing.summary) {
        // No summary exists, generate one
        await generateSummary(chatId);
        return;
      }

      // Check if summary is stale
      const isStale = await checkSummaryStaleness(chatId);

      if (isStale) {
        // Generate new summary in background
        console.log(`Auto-generating stale summary for ${chatId}`);
        await generateSummary(chatId, true);
      }
    } catch (error) {
      console.error('Error in autoGenerateSummary:', error);
      // Silently fail - don't throw, just log
    }
  },

  // Check if action items are stale (new messages since last extraction)
  checkActionItemsStaleness: async (chatId: string): Promise<boolean> => {
    try {
      const { chatAISummaries } = get();
      const existing = chatAISummaries.get(chatId);

      if (
        !existing ||
        !existing.actionItems ||
        existing.actionItems.length === 0
      ) {
        return true; // No action items exist
      }

      // Get current message count
      const callable = httpsCallable<
        { chatId: string; forceRefresh?: boolean },
        { actionItems: ActionItem[]; messageCount: number }
      >(functions, 'extractChatActionItems');

      // Just check message count by attempting to get cached data
      const result = await callable({ chatId, forceRefresh: false });
      const currentMessageCount = result.data.messageCount;

      // Check if there are new messages since action items were extracted
      const messageCountAtActionItems =
        existing.messageCountAtActionItems || existing.messageCount || 0;
      const stale = currentMessageCount > messageCountAtActionItems;

      if (stale) {
        console.log(
          `Action items stale for ${chatId}: ${currentMessageCount} messages now vs ${messageCountAtActionItems} at extraction`
        );
      }

      return stale;
    } catch (error) {
      console.error('Error checking action items staleness:', error);
      return false; // Assume not stale on error
    }
  },

  // Auto-extract action items if needed (checks staleness first)
  autoExtractActionItems: async (chatId: string): Promise<void> => {
    try {
      const { checkActionItemsStaleness, extractActionItems } = get();

      // Check if action items exist and are not stale
      const { chatAISummaries } = get();
      const existing = chatAISummaries.get(chatId);

      if (
        !existing ||
        !existing.actionItems ||
        existing.actionItems.length === 0
      ) {
        // No action items exist, extract them
        await extractActionItems(chatId);
        return;
      }

      // Check if action items are stale
      const isStale = await checkActionItemsStaleness(chatId);

      if (isStale) {
        // Extract new action items in background
        console.log(`Auto-extracting stale action items for ${chatId}`);
        await extractActionItems(chatId, true);
      }
    } catch (error) {
      console.error('Error in autoExtractActionItems:', error);
      // Silently fail - don't throw, just log
    }
  },
}));
