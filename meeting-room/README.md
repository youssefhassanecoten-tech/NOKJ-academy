# meeting-room

WebRTC live-class room prototype for NOKJ Academy.

The production path uses WebRTC (`getUserMedia` + `RTCPeerConnection`) with
Socket.io signaling. This directory is a UI prototype that shows the room
surface and exercises the media and peer-connection layers without a server.

## What works

- Local video preview via `getUserMedia`
- Screen sharing via `getDisplayMedia`
- Mute / unmute for camera and microphone
- A scaffolded `RTCPeerConnection` that, when two peers join, exchanges an
  offer/answer and ICE candidates over the browser console (log-only
  signaling stub)

## What is simulated

Socket.io events like `join-room`, `offer`, `answer`, and `ice-candidate` are
mapped to `console.log` so the P2P flow can be traced in the DevTools console.
Swap these logs for real Socket.io emits in production.

## Files

- `index.html` - room markup, loads `app.js` and `styles.css`
- `app.js` - media, peer connection, and signaling logic
- `styles.css` - room styling