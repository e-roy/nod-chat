sequenceDiagram
autonumber
participant U1 as User A (Expo)
participant FT as firebaseTransport
participant FS as Firestore
participant CF as Cloud Functions
participant FCM as FCM
participant U2 as User B (Expo)

    U1->>U1: Compose message
    U1->>FT: send(msg id=UUID, status="sending")
    FT->>FS: write chats/{chatId}/messages/{messageId}
    U1-->>U1: Optimistic render (status: sending)

    FS-->>FT: snapshot ack (serverTimestamp set)
    FT-->>U1: Update status → "sent"

    FS-->>CF: onCreate(message) trigger
    CF->>FCM: send push to B's device token

    alt App foreground
        FCM->>U2: foreground notification event
    else App background/closed
        FCM->>U2: background push notification
    end

    U2->>FS: snapshot listener receives new message
    FS-->>U2: deliver message
    U2-->>U2: Render in chat

    U2->>FS: mark read (when chat is open)
    FS-->>U1: snapshot → update status "read"
    U1-->>U1: UI shows read receipt
