flowchart TD
%% ===== Client Side (Expo) =====
subgraph C["Client — Expo (React Native)"]
A["UI<br/>(gluestack-ui, Navigation)"] --> S["Stores (Zustand)"]
S --> TX["MessagingTransport<br/>(xmppTransport)"]
A --> M["Media Picker<br/>(Expo ImagePicker)"]
S --> N["Notifications Handler<br/>(Expo Notifications)"]
S --> L["Local Cache<br/>(AsyncStorage / Local DB)"]
end

    %% ===== Firebase (Auth, profiles, metadata, push) =====
    subgraph F["Firebase Project"]
      subgraph AUTH["Auth"]
        FA["Email/Password (MVP)<br/>Phone later"]
      end

      subgraph FS["Firestore"]
        FChats["chats/{chatId}<br/>lastMessage, updatedAt, unread"]
        FUsers["users/{uid}<br/>profile, tokens"]
      end

      subgraph ST["Storage"]
        FMedia["chatMedia/<br/>images & metadata"]
      end

      subgraph CF["Cloud Functions / Admin"]
        CBridge["Bridge writes Firestore<br/>+ sends FCM"]
      end

      subgraph FCM["Push"]
        FP["Firebase Cloud Messaging"]
      end
    end

    %% ===== ejabberd side =====
    subgraph X["ejabberd (XMPP Server)"]
      WS["WebSocket<br/>(/xmpp-websocket)"]
      MAM["Message Archive (MAM)"]
      SM["Stream Management"]
      RCPT["Receipts / Carbons"]
      MUC["MUC (Groups)"]
      WH["Webhooks (mod_webhooks)"]
    end

    subgraph DB["SQL Store"]
      PG["Postgres"]
    end

    %% ===== Bridge service (webhook target) =====
    subgraph B["Bridge Service"]
      BRX["Webhook Endpoint<br/>(/ejabberd/webhook)"]
      BUP["Push Sender<br/>(FCM)"]
      BMD["Metadata Sync<br/>(Firestore lastMessage/unread)"]
    end

    %% ===== Auth/session edges =====
    A -->|Sign in| FA
    FA -->|onAuthStateChanged| S
    S -->|Map uid → JID| TX

    %% ===== Messaging edges =====
    TX <-->|XMPP stanzas| WS
    WS --> MAM
    WS --> SM
    WS --> RCPT
    WS --> MUC
    MAM <---> PG

    %% ===== Webhooks → Bridge → Firebase =====
    WH -->|message events| BRX
    BRX --> BMD --> FChats
    BRX --> BUP --> FP
    FP -->|deliver notification| N

    %% ===== Media path =====
    M -->|upload| FMedia
    TX -->|attach image URL in stanza| WS

    %% ===== Reads for UI =====
    S -->|chat list| FChats
    S -->|profile| FUsers

    %% ===== Notes =====
    %% - Foreground/active chat: real-time via XMPP
    %% - Offline/catch-up: history via MAM
    %% - Push: ejabberd → Bridge → FCM → app handler
