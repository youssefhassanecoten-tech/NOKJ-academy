var localVideo = document.getElementById("local-video");
var remoteVideo = document.getElementById("remote-video");
var roomName = document.getElementById("room-name");
var joinBtn = document.getElementById("join-btn");
var shareBtn = document.getElementById("share-btn");
var muteVideoBtn = document.getElementById("mute-video-btn");
var muteMicBtn = document.getElementById("mute-mic-btn");
var leaveBtn = document.getElementById("leave-btn");
var notice = document.getElementById("notice");
var occupancy = document.getElementById("room-occupancy");

var localStream = null;
var screenStream = null;
var localPc = null;
var remotePc = null;
var joined = false;
var videoMuted = false;
var micMuted = false;

function logSignal(tag, payload) {
  console.log("[signaling log-only] " + tag, payload || "");
}

function setNotice(message, isError) {
  notice.textContent = message;
  notice.className = isError ? "error" : "";
}

function stopTracks(stream) {
  if (stream) {
    stream.getTracks().forEach(function(track) { track.stop(); });
  }
}

function attachStream(video, stream) {
  video.srcObject = stream;
}

function createPeerConnection(initiator) {
  var config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
  var pc = new RTCPeerConnection(config);
  pc.onicecandidate = function(event) {
    if (event.candidate) {
      logSignal("ice-candidate " + (initiator ? "local->remote" : "remote->local"), event.candidate);
      if (initiator) {
        remotePc.addIceCandidate(event.candidate).catch(function(err) {
          console.warn("addIceCandidate failed", err);
        });
      } else {
        localPc.addIceCandidate(event.candidate).catch(function(err) {
          console.warn("addIceCandidate failed", err);
        });
      }
    }
  };
  pc.oniceconnectionstatechange = function() {
    logSignal("ice-connection-state", pc.iceConnectionState);
  };
  return pc;
}

function handleTrack(event) {
  if (event.streams && event.streams[0]) {
    attachStream(remoteVideo, event.streams[0]);
    logSignal("remote-track-added", event.streams[0].getTracks().map(function(t) { return t.kind; }));
  }
}

function setupPeerConnections() {
  localPc = createPeerConnection(true);
  remotePc = createPeerConnection(false);

  remotePc.ontrack = handleTrack;

  localStream.getTracks().forEach(function(track) {
    localPc.addTrack(track, localStream);
  });

  return localPc.createOffer().then(function(offer) {
    logSignal("offer-created", offer.sdp);
    return localPc.setLocalDescription(offer);
  }).then(function() {
    logSignal("offer-set-local", localPc.localDescription.sdp);
    return remotePc.setRemoteDescription(localPc.localDescription);
  }).then(function() {
    return remotePc.createAnswer();
  }).then(function(answer) {
    logSignal("answer-created", answer.sdp);
    return remotePc.setLocalDescription(answer);
  }).then(function() {
    logSignal("answer-set-local", remotePc.localDescription.sdp);
    return localPc.setRemoteDescription(remotePc.localDescription);
  }).then(function() {
    logSignal("p2p-negotiation-complete");
    setNotice("Connected to remote peer. Watch the console for signaling logs.");
  }).catch(function(err) {
    console.error("Peer negotiation failed", err);
    setNotice("Peer negotiation failed: " + err.message, true);
  });
}

function handleUserMediaError(err) {
  console.error("getUserMedia error", err);
  var message = "Could not access your camera or microphone: " + err.message;
  setNotice(message, true);
}

function joinRoom() {
  if (joined) return;
  var room = roomName.value.trim() || "unnamed-room";
  logSignal("join-room", room);

  navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(function(stream) {
    localStream = stream;
    attachStream(localVideo, stream);
    setNotice("Streaming to room \"" + room + "\"...");
    openedRoom = room;
    return setupPeerConnections();
  }).then(function() {
    joined = true;
    occupancy.textContent = "Room: " + openedRoom + " (2 peers: local + remote)";
    joinBtn.disabled = true;
    shareBtn.disabled = false;
    muteVideoBtn.disabled = false;
    muteMicBtn.disabled = false;
    leaveBtn.disabled = false;
  }).catch(handleUserMediaError);
}

var openedRoom = "";

function shareScreen() {
  if (!joined) return;
  navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }).then(function(stream) {
    screenStream = stream;
    var screenTrack = stream.getVideoTracks()[0];
    var sender = localPc.getSenders().find(function(s) {
      return s.track && s.track.kind === "video";
    });
    if (sender) {
      sender.replaceTrack(screenTrack);
    }
    attachStream(localVideo, stream);
    screenTrack.onended = function() {
      stopSharing();
    };
    setNotice("Sharing screen. Stop sharing from the browser bar when done.");
  }).catch(function(err) {
    console.error("getDisplayMedia error", err);
    setNotice("Screen sharing unavailable: " + err.message, true);
  });
}

function stopSharing() {
  stopTracks(screenStream);
  screenStream = null;
  var videoTrack = localStream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = !videoMuted;
  }
  var sender = localPc.getSenders().find(function(s) {
    return s.track && s.track.kind === "video";
  });
  if (sender) {
    sender.replaceTrack(localStream.getVideoTracks()[0]);
  }
  attachStream(localVideo, localStream);
  setNotice("Screen sharing stopped.");
}

function toggleVideoMute() {
  if (!localStream) return;
  videoMuted = !videoMuted;
  localStream.getVideoTracks().forEach(function(track) { track.enabled = !videoMuted; });
  muteVideoBtn.textContent = videoMuted ? "Unmute video" : "Mute video";
  logSignal("video-muted", videoMuted);
}

function toggleMicMute() {
  if (!localStream) return;
  micMuted = !micMuted;
  localStream.getAudioTracks().forEach(function(track) { track.enabled = !micMuted; });
  muteMicBtn.textContent = micMuted ? "Unmute mic" : "Mute mic";
  logSignal("mic-muted", micMuted);
}

function leaveRoom() {
  if (!joined) return;
  logSignal("leave-room", openedRoom);
  stopSharing();
  stopTracks(localStream);
  localStream = null;
  localPc.close();
  remotePc.close();
  localPc = null;
  remotePc = null;
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  joined = false;
  videoMuted = false;
  micMuted = false;
  muteVideoBtn.textContent = "Mute video";
  muteMicBtn.textContent = "Mute mic";
  muteVideoBtn.disabled = true;
  muteMicBtn.disabled = true;
  shareBtn.disabled = true;
  leaveBtn.disabled = true;
  joinBtn.disabled = false;
  occupancy.textContent = "Room: not joined";
  setNotice("Left the room. Tracks stopped.");
}

joinBtn.addEventListener("click", joinRoom);
shareBtn.addEventListener("click", shareScreen);
muteVideoBtn.addEventListener("click", toggleVideoMute);
muteMicBtn.addEventListener("click", toggleMicMute);
leaveBtn.addEventListener("click", leaveRoom);

shareBtn.disabled = true;
muteVideoBtn.disabled = true;
muteMicBtn.disabled = true;
leaveBtn.disabled = true;