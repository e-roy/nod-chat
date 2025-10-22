sequenceDiagram
autonumber
participant UA as User A (Expo)
participant XCL as xmppTransport
participant X as ejabberd
participant MAM as MAM (SQL)
participant BR as Bridge (Webhook)
participant FS as Firestore (metadata)
participant FCM as FCM
participant UB as User B (Expo)

    UA->>XCL: send(msg id=UUID, text/imageUrl)
    XCL->>X: <message stanza> (request receipts)
    X-->>MAM: archive message
    X-->>BR: webhook (sender, recipient, id, timestamp, snippet)

    par Bridge side effects
      BR->>FS: upsert chats/{chatId}.lastMessage, updatedAt, unread++
      BR->>FCM: push to recipient tokens
    end

    alt B online
        X-->>UB: deliver stanza in real time
        UB-->>X: receipt (delivered/read)
        X-->>UA: delivery/read receipts
        BR->>FS: (optional) mirror read counters
    else B offline / app background
        FCM-->>UB: push notification
        UB->>X: connect/resume (SM)
        X-->>UB: replay via MAM (catch-up)
        UB-->>X: read receipts
        X-->>UA: receipts (read)
        BR->>FS: (optional) update unread counters
    end
