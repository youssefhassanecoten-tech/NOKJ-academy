# meeting-room

WebRTC live-class virtual classroom for NOKJ Academy (the in-app "Zoom").

## Architecture

The app implements a **custom WebRTC mesh** (browser to browser, no media
server) plus a small **Node.js WebSocket signalling hub** that brokers offers,
answers and ICE candidates between participants.

```
Browser A  <====RTCPeerConnection (P2P audio/video)====>  Browser B
     |                                                       |
     |  WebSocket /ws (offer, answer, ice, chat, slide)      |
     +------------------  Node signalling hub  --------------+
```

- **Media**: `getUserMedia` (camera + mic), `getDisplayMedia` (screen share),
  `RTCPeerConnection` with Google STUN servers, `replaceTrack` for share.
- **Signalling**: `backend/src/ws/signaling.js` (`ws` + `WebSocketServer`,
  mounted at `/ws?room=...`). Rooms are ephemeral, in-memory maps of sockets.
- **Fallback**: when the signalling server is unreachable (e.g. static GitHub
  Pages hosting), the room uses a same-origin `BroadcastChannel` for chat, slide
  sync, presence and even P2P signal delivery (two tabs of one browser).
- **Slides & chat**: broadcast to the room over the same channel; only
  teachers/admins can navigate slides.

## Configuration

The client derives the signalling URL as `ws(s)://<host>:3000/ws`. To point it
at a production endpoint, set before the scripts load:

```html
<script>window.NOKJ_SIGNALING_URL = "wss://api.nokj.example/ws";</script>
```

## Scaling up

The mesh is ideal for small classrooms (< ~6 participants). To scale to many
participants or to add recording/transcription, swap the mesh for a media
server SDK. The signalling layer is designed to be replaced:

- **LiveKit** - replaces signalling + media routing with Rooms, tracks and
  egress; use `LiveKitRoom` on the frontend (React/Next.js recommended).
- **Stream** - JS/React SDK with rooms, stage-view and a managed media server.
- **Agora** - native/low-latency engine with `agora-rtc-sdk-ng`.

Mirror the message shapes in this module (`join`, `signal`, `chat`, `slide`,
`mic`, `leave`) onto the SDK's room events to keep the rest of the app
unchanged.

## Files

- `backend/src/ws/signaling.js` - Node WebSocket signalling hub (attached in
  `backend/src/server.js`).
- `frontend/scripts/modules/meeting.js` - client media, mesh, signalling and UI.
- `frontend/scripts/modules/meeting-*` static fixtures live in
  `frontend/scripts/config.js` (`DEFAULT_PRESENTATION`).
- `frontend/styles/components/meeting.css` + the meeting overlay in
  `frontend/index.html` - room UI.

## Demo

1. Start the API: `npm run dev:api` (port 3000, serves `/ws`).
2. Serve the frontend: `npm run dev:web`.
3. Log in as teacher and as student in two browser tabs, open **Classroom**
   and press **Join Meeting** on the same lesson.
4. Devices with permissions only when the page is served over `http(s)`, not
   `file://`.