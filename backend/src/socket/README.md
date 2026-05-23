# Real-Time Socket.io Layer

## Directory Purpose
The `src/socket/` directory houses all WebSockets managers, event triggers, namespace routes, and handlers (Socket.io configuration) required for real-time collaboration:
*   Direct & Project Chat Messaging
*   Active Typing Indicators
*   Read Receipts Broadcasts
*   System notifications pushing
*   User presence tracking (Online/Away/Offline status)

## Modular Design Suggestion
When Socket.io is configured:
1.  **`index.js`**: Initializes connection listeners, processes JWT authentication handshakes, and binds namespace pipelines.
2.  **`chatHandler.js`**: Decodes user messages and publishes them to room channels or direct clients.
3.  **`notificationHandler.js`**: Dispatches system task changes and alerts instantly.
