const { WebSocketServer } = require("ws");
const crypto = require("crypto");
const url = require("url");

// Tiny in-memory signalling hub for WebRTC mesh classrooms.
// Rooms live only as long as the process runs. For scale, swap this
// for a media server (LiveKit / Stream / Agora) - see docs/README.

const rooms = new Map(); // roomId -> Map<socketId, ws>

function socketId() {
  return crypto.randomBytes(8).toString("hex");
}

function roomOf(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  return rooms.get(roomId);
}

function broadcast(roomId, exceptId, msg) {
  const peers = roomOf(roomId);
  const data = JSON.stringify(msg);
  for (const [id, ws] of peers) {
    if (id !== exceptId && ws.readyState === ws.OPEN) {
      try {
        ws.send(data);
      } catch (e) {
        /* ignore */
      }
    }
  }
}

function attachSignalingServer(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const query = url.parse(req.url, true).query;
    const roomId = String(query.room || "default");
    const name = String(query.name || "Guest");

    const id = socketId();
    const peers = roomOf(roomId);
    peers.set(id, ws);

    // Tell the newcomer who is already here (so they can offer to each).
    ws.send(JSON.stringify({
      type: "room-state",
      self: id,
      room: roomId,
      peers: Array.from(peers.keys()).filter((pid) => pid !== id).map((pid) => ({ id: pid, name: peers.get(pid).peerName || "Guest" }))
    }));

    // Announce the newcomer so existing peers create offers.
    broadcast(roomId, id, { type: "peer-joined", from: id, name, room: roomId });

    ws.peerName = name;

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch (e) {
        return;
      }
      msg.from = id;
      if (msg.type === "chat" || msg.type === "slide" || msg.type === "signal") {
        broadcast(roomId, id, msg);
      } else if (msg.type === "leave") {
        broadcast(roomId, id, msg);
      }
    });

    ws.on("close", () => {
      peers.delete(id);
      broadcast(roomId, id, { type: "peer-left", from: id, name, room: roomId });
      if (peers.size === 0) rooms.delete(roomId);
    });

    ws.on("error", () => {
      /* socket errors are expected on abrupt closes */
    });
  });

  return wss;
}

module.exports = { attachSignalingServer };