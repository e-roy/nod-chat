flowchart TD
%% ==== client nodes ====
C_UI["UI"]
C_STORE["Stores"]
C_TX["Transport Firebase"]
C_MEDIA["Media Picker"]
C_NOTIF["Notifications"]
C_PRES["Presence Client"]
C_LOCAL["Local Cache"]

%% ==== firebase nodes ====
AUTH["Auth"]
FS_USERS["Firestore users"]
FS_CHATS["Firestore chats"]
FS_MSGS["Firestore messages"]
FS_TYPING["Firestore typing"]
ST_MEDIA["Storage media"]
RT_STATUS["RTDB status"]
CF_PRES["Cloud Fn presence mirror"]
CF_NOTIFY["Cloud Fn notify"]
FCM["FCM"]

%% ==== client wiring ====
C_UI --> C_STORE
C_STORE --> C_TX
C_UI --> C_MEDIA
C_STORE --> C_NOTIF
C_STORE --> C_PRES
C_STORE --> C_LOCAL

%% ==== auth ====
C_UI -- "sign in" --> AUTH
AUTH -- "auth state" --> C_STORE

%% ==== messaging ====
C_TX -- "write message" --> FS_MSGS
FS_MSGS -- "snapshot" --> C_TX
C_TX -- "update lastMessage" --> FS_CHATS

%% ==== presence and typing ====
C_PRES -- "set online" --> RT_STATUS
RT_STATUS -- "mirror" --> CF_PRES
CF_PRES -- "update users" --> FS_USERS
C_UI -- "typing" --> FS_TYPING

%% ==== media ====
C_MEDIA -- "upload" --> ST_MEDIA
C_TX -- "attach imageUrl" --> FS_MSGS

%% ==== notifications ====
FS_MSGS -. "trigger" .-> CF_NOTIFY
CF_NOTIFY -- "send" --> FCM
FCM -- "deliver" --> C_NOTIF

%% ==== reads for UI ====
C_STORE -- "chat list" --> FS_CHATS
C_STORE -- "chat history" --> FS_MSGS
C_STORE -- "profiles" --> FS_USERS
C_STORE -- "presence" --> FS_USERS
C_STORE -- "typing" --> FS_TYPING
