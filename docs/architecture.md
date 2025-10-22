flowchart TD
%% ===== Client Side (Expo) =====
subgraph C["Client — Expo (React Native)"]
A["UI<br/>(gluestack-ui, Navigation)"] --> S["Stores (Zustand)"]
S --> T["MessagingTransport<br/>(firebaseTransport)"]
A --> M["Media Picker<br/>(Expo ImagePicker)"]
S --> N["Notifications Handler<br/>(Expo Notifications)"]
S --> P["Presence Client<br/>(RTDB onDisconnect)"]
S --> L["Local Cache<br/>(AsyncStorage / Firestore Offline)"]
end

    %% ===== Firebase Services =====
    subgraph F["Firebase Project"]
      subgraph AUTH["Auth"]
        FA["Email/Password"]
      end

      subgraph FS["Firestore"]
        FChats["chats/{chatId}<br/>lastMessage, updatedAt"]
        FMsgs["chats/{chatId}/messages/{messageId}"]
        FGroups["groups/{groupId}<br/>+ messages/"]
        FUsers["users/{uid}<br/>profile, tokens"]
        FTyping["typing/{chatId}/{uid}"]
      end

      subgraph ST["Storage"]
        FMedia["chatMedia/<br/>images & metadata"]
      end

      subgraph RT["Realtime Database"]
        FRtdb["/status/{uid}<br/>{online|offline, lastChanged}"]
      end

      subgraph CF["Cloud Functions"]
        CPresence["Presence Mirror<br/>(RTDB → Firestore users)"]
        CNotify["Push Fanout<br/>(on new message)"]
        CGuards["Security/Validation<br/>helpers"]
      end

      subgraph FCM["Push"]
        FP["Firebase Cloud Messaging"]
      end
    end

    %% ===== Edges: Auth / Session =====
    A -->|Sign up / Sign in| FA
    FA -->|onAuthStateChanged| S

    %% ===== Edges: Messaging =====
    T -->|write message<br/>(optimistic 'sending')| FMsgs
    FMsgs -->|snapshots| T
    T -->|update lastMessage| FChats
    L <--> FS

    %% ===== Edges: Presence & Typing =====
    P -->|set online,<br/>onDisconnect offline| FRtdb
    FRtdb -->|mirror| CPresence --> FUsers
    A -->|typing on/off| FTyping

    %% ===== Edges: Media =====
    M -->|upload| FMedia
    T -->|attach imageUrl| FMsgs

    %% ===== Edges: Notifications =====
    CF -. triggers on new message .-> CNotify
    CNotify -->|send| FP
    FP -->|deliver<br/>(notification)| N

    %% ===== Reads for UI =====
    S -->|chat list| FChats
    S -->|chat history| FMsgs
    S -->|profile & tokens| FUsers
    S -->|presence| FUsers
    S -->|typing| FTyping
