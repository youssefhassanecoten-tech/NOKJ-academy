// ============================================================
      //  MEETING ROOM (WebRTC virtual classroom)
      //  Custom WebRTC mesh with a Node.js WebSocket signalling hub.
      //  Falls back to BroadcastChannel when the signalling server
      //  is unreachable (e.g. static GitHub Pages hosting).
      // ============================================================
      var meetingSlideIndex = 0;
      var meetingLocalStream = null;
      var meetingScreenStream = null;
      var meetingIsTeacher = false;
      var meetingMicOn = true;
      var meetingCamOn = true;
      var meetingSlides = [];

      // --- signalling / webrtc state ---
      var meetingWs = null;
      var meetingSelfId = null;
      var meetingRoomKey = 'default';
      var meetingSignalingMode = 'local'; // 'server' | 'local'
      var meetingPeers = {}; // peerId -> { pc, name }
      var meetingChannel = null; // BroadcastChannel fallback
      var meetingPcs = []; // helper to stop all senders on leave

      function initMeetingControls() {
        var endBtn = document.getElementById('meeting-end-btn');
        var leaveBtn = document.getElementById('meeting-leave');
        var fsBtn = document.getElementById('meeting-fullscreen');

        if (endBtn) endBtn.addEventListener('click', closeMeetingRoom);
        if (leaveBtn) leaveBtn.addEventListener('click', closeMeetingRoom);
        if (fsBtn) fsBtn.addEventListener('click', toggleMeetingFullscreen);

        var micBtn = document.getElementById('meeting-mic-btn');
        if (micBtn) micBtn.addEventListener('click', function() {
          meetingMicOn = !meetingMicOn;
          broadcastMeeting({ type: 'mic', from: meetingSelfId || 'local' });
          if (meetingLocalStream) {
            meetingLocalStream.getAudioTracks().forEach(function(t) { t.enabled = meetingMicOn; });
          }
          micBtn.textContent = meetingMicOn ? '🎤 Mic' : '🔇 ' + tr('Mute');
          setLanguage(currentLang);
        });

        var camBtn = document.getElementById('meeting-cam-btn');
        if (camBtn) camBtn.addEventListener('click', function() {
          meetingCamOn = !meetingCamOn;
          if (meetingLocalStream) {
            meetingLocalStream.getVideoTracks().forEach(function(t) { t.enabled = meetingCamOn; });
          }
          var fb = document.getElementById('meeting-local-fallback');
          if (fb) fb.style.display = meetingCamOn ? 'none' : 'flex';
          camBtn.textContent = meetingCamOn ? '📷 Camera' : '🚫 ' + tr('Turn off camera');
          setLanguage(currentLang);
        });

        var screenBtn = document.getElementById('meeting-screen-btn');
        if (screenBtn) screenBtn.addEventListener('click', toggleMeetingScreenShare);

        var chatBtn = document.getElementById('meeting-chat-btn');
        if (chatBtn) chatBtn.addEventListener('click', function() {
          var side = document.querySelector('.meeting-side');
          if (side) side.classList.toggle('open');
          var input = document.getElementById('meeting-chat-input');
          if (input && side && side.classList.contains('open')) input.focus();
        });

        var tabs = document.querySelectorAll('.meeting-tab');
        tabs.forEach(function(tab) {
          tab.addEventListener('click', function() {
            tabs.forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');
            var chatPanel = document.getElementById('meeting-chat-panel');
            var partsPanel = document.getElementById('meeting-participants-panel');
            if (tab.dataset.tab === 'chat') {
              if (chatPanel) chatPanel.style.display = 'flex';
              if (partsPanel) partsPanel.style.display = 'none';
            } else {
              if (chatPanel) chatPanel.style.display = 'none';
              if (partsPanel) partsPanel.style.display = 'flex';
            }
            setLanguage(currentLang);
          });
        });

        var sendBtn = document.getElementById('meeting-chat-send');
        var chatInput = document.getElementById('meeting-chat-input');
        if (sendBtn) sendBtn.addEventListener('click', meetingSendChat);
        if (chatInput) chatInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') meetingSendChat(); });

        document.getElementById('meeting-slide-prev').addEventListener('click', function() { meetingSetSlide(-1); });
        document.getElementById('meeting-slide-next').addEventListener('click', function() { meetingSetSlide(1); });

        document.addEventListener('keydown', function(e) {
          var overlay = document.getElementById('meeting-overlay');
          if (!overlay || !overlay.classList.contains('open')) return;
          if (e.key === 'ArrowLeft') meetingSetSlide(-1);
          else if (e.key === 'ArrowRight') meetingSetSlide(1);
          else if (e.key === 'Escape') closeMeetingRoom();
        });
      }

      // ============================================================
      //  OPEN / CLOSE
      // ============================================================
      function openMeetingRoom(meetingTitle, meetingId) {
        var overlay = document.getElementById('meeting-overlay');
        if (!overlay) return;

        meetingIsTeacher = currentUser ? currentUser.role !== 'Student' : false;
        meetingSlideIndex = 0;
        meetingSlides = DEFAULT_PRESENTATION.slice();
        meetingRoomKey = 'meeting-' + (meetingId || 'default');

        document.getElementById('meeting-room-title').textContent = meetingTitle || 'Meeting Room';
        document.getElementById('meeting-slide-title').textContent = '';
        document.getElementById('meeting-slide-text').textContent = '';

        renderMeetingSlide();
        overlay.classList.add('open');

        var participantsList = document.getElementById('meeting-participants-list');
        if (participantsList) {
          participantsList.innerHTML = '';
          addMeetingParticipant(currentUser ? currentUser.name : tr('You'), tr('You'));
        }

        applyTranslation(currentLang);
        startLocalVideo();
        setupMeetingSignaling();
      }

      function closeMeetingRoom() {
        var overlay = document.getElementById('meeting-overlay');
        if (overlay) overlay.classList.remove('open');

        meetingSlides = [];
        var name = currentUser ? currentUser.name : tr('You');
        broadcastMeeting({ type: 'leave', from: meetingSelfId || 'local', name: name, room: meetingRoomKey });
        try {
          if (meetingChannel) meetingChannel.close();
        } catch (e) { /* noop */ }
        meetingChannel = null;
        try {
          if (meetingWs) meetingWs.close();
        } catch (e) { /* noop */ }
        meetingWs = null;
        meetingSelfId = null;

        Object.keys(meetingPeers).forEach(function(id) {
          var peer = meetingPeers[id];
          if (peer && peer.pc) {
            try { peer.pc.close(); } catch (e) { /* noop */ }
          }
        });
        meetingPeers = {};

        stopMeetingStreams();
        var localVideo = document.getElementById('meeting-local-video');
        if (localVideo) localVideo.srcObject = null;
        document.getElementById('meeting-remote-video').srcObject = null;
        document.getElementById('meeting-remote-tile').style.display = 'none';
        var fb = document.getElementById('meeting-local-fallback');
        if (fb) fb.style.display = 'flex';
        var camBtn = document.getElementById('meeting-cam-btn');
        if (camBtn) camBtn.textContent = '📷 Camera';
      }

      // ============================================================
      //  LOCAL MEDIA
      // ============================================================
      function startLocalVideo() {
        stopMeetingStreams(false);
        var video = document.getElementById('meeting-local-video');
        var fb = document.getElementById('meeting-local-fallback');
        if (fb) fb.style.display = 'flex';

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(function(stream) {
          meetingLocalStream = stream;
          if (video) {
            video.srcObject = stream;
            if (fb) fb.style.display = 'none';
            video.play().catch(function() { /* noop */ });
          }
          meetingMicOn = true;
          meetingCamOn = true;
          meetingAttachStreamToPeers(stream);
        }).catch(function() {
          if (fb) fb.textContent = tr('Your camera could not be accessed. Check browser permissions.');
        });
      }

      function stopMeetingStreams(includeScreen) {
        if (includeScreen === undefined) includeScreen = true;
        var streams = [meetingLocalStream];
        if (includeScreen) streams.push(meetingScreenStream);
        streams.forEach(function(stream) {
          if (stream) stream.getTracks().forEach(function(t) { t.stop(); });
        });
        if (includeScreen) meetingScreenStream = null;
        if (includeScreen) meetingLocalStream = null;
      }

      function toggleMeetingScreenShare() {
        if (meetingScreenStream) {
          stopMeetingScreenShare();
          return;
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) return;
        navigator.mediaDevices.getDisplayMedia({ video: true }).then(function(stream) {
          meetingScreenStream = stream;
          var video = document.getElementById('meeting-local-video');
          if (video) { video.srcObject = stream; video.play().catch(function() { /* noop */ }); }
          document.getElementById('meeting-local-fallback').style.display = 'none';
          document.getElementById('meeting-screen-btn').textContent = '🖥 ' + tr('Stop Share');
          meetingCamOn = true;
          meetingReplaceVideoTrackToPeers(stream.getVideoTracks()[0]);
          setLanguage(currentLang);
          stream.getVideoTracks()[0].addEventListener('ended', stopMeetingScreenShare);
        }).catch(function() { /* user cancelled */ });
      }

      function stopMeetingScreenShare() {
        if (meetingScreenStream) {
          meetingScreenStream.getTracks().forEach(function(t) { t.stop(); });
          meetingScreenStream = null;
        }
        var video = document.getElementById('meeting-local-video');
        if (video) {
          video.srcObject = meetingLocalStream;
          if (meetingLocalStream) video.play().catch(function() { /* noop */ });
        }
        document.getElementById('meeting-screen-btn').textContent = '🖥 ' + tr('Share Screen');
        if (meetingLocalStream && meetingLocalStream.getVideoTracks().length) {
          meetingReplaceVideoTrackToPeers(meetingLocalStream.getVideoTracks()[0]);
        }
        setLanguage(currentLang);
      }

      // ============================================================
      //  SLIDES
      // ============================================================
      function renderMeetingSlide() {
        if (!meetingSlides.length) return;
        var idx = Math.max(0, Math.min(meetingSlideIndex, meetingSlides.length - 1));
        var slide = meetingSlides[idx];
        document.getElementById('meeting-slide-title').textContent = slide.title || '';
        document.getElementById('meeting-slide-text').textContent = slide.content || '';
        document.getElementById('meeting-slide-counter').textContent = (idx + 1) + '/' + meetingSlides.length;

        var canControl = meetingIsTeacher;
        document.getElementById('meeting-slide-prev').disabled = !canControl;
        document.getElementById('meeting-slide-next').disabled = !canControl;
        setLanguage(currentLang);
      }

      function meetingSetSlide(dir) {
        if (!meetingIsTeacher || !meetingSlides.length) return;
        meetingSlideIndex += dir;
        if (meetingSlideIndex < 0) meetingSlideIndex = 0;
        if (meetingSlideIndex >= meetingSlides.length) meetingSlideIndex = meetingSlides.length - 1;
        renderMeetingSlide();
        broadcastMeeting({ type: 'slide', index: meetingSlideIndex, from: meetingSelfId || 'local' });
      }

      // ============================================================
      //  CHAT
      // ============================================================
      function meetingSendChat() {
        var input = document.getElementById('meeting-chat-input');
        if (!input) return;
        var text = input.value.trim();
        if (!text) return;
        input.value = '';
        var name = currentUser ? currentUser.name : tr('You');
        meetingAppendChat(name, text, true);
        broadcastMeeting({ type: 'chat', name: name, text: text, from: meetingSelfId || 'local' });
      }

      function meetingAppendChat(name, text, own) {
        var container = document.getElementById('meeting-chat-messages');
        if (!container) return;
        var div = document.createElement('div');
        div.className = 'meeting-chat-message' + (own ? ' own' : '');
        div.innerHTML = '<strong>' + escapeHtml(name) + '</strong><span>' + escapeHtml(text) + '</span>';
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
      }

      // ============================================================
      //  PARTICIPANTS
      // ============================================================
      function addMeetingParticipant(name, tag) {
        var list = document.getElementById('meeting-participants-list');
        if (!list) return;
        var existing = Array.prototype.map.call(list.querySelectorAll('strong'), function(el) { return el.textContent; });
        if (existing.indexOf(name) !== -1) return;
        var div = document.createElement('div');
        div.className = 'meeting-participant';
        div.setAttribute('data-name', name);
        div.innerHTML = '<span class="participant-dot"></span><strong>' + escapeHtml(name) + '</strong>' +
          (tag ? '<em>' + tag + '</em>' : '');
        list.appendChild(div);
      }

      function removeMeetingParticipant(name) {
        var list = document.getElementById('meeting-participants-list');
        if (!list) return;
        Array.prototype.forEach.call(list.querySelectorAll('[data-name]'), function(el) {
          if (el.getAttribute('data-name') === name) el.remove();
        });
      }

      // ============================================================
      //  SIGNALLING LAYER (WebSocket server | BroadcastChannel)
      // ============================================================
      function setupMeetingSignaling() {
        broadcastMeetingRemoveAllPeers();
        var name = currentUser ? currentUser.name : tr('You');
        var wsUrl = meetingSignalingUrl(meetingRoomKey, name);
        if (typeof WebSocket !== 'undefined' && wsUrl) {
          var ws;
          try {
            ws = new WebSocket(wsUrl);
          } catch (e) {
            ws = null;
          }
          if (ws) {
            var settled = false;
            var timeout = setTimeout(function() {
              if (!settled) {
                settled = true;
                try { ws.close(); } catch (e) { /* noop */ }
                meetingWs = null;
                setupMeetingChannel();
              }
            }, 3000);

            ws.onopen = function() {
              if (!settled) {
                clearTimeout(timeout);
                settled = true;
                meetingWs = ws;
                meetingSignalingMode = 'server';
              }
            };
            ws.onmessage = function(ev) {
              if (meetingWs !== ws) return;
              var msg;
              try { msg = JSON.parse(ev.data); } catch (e) { return; }
              handleMeetingServerMessage(msg);
            };
            ws.onclose = function() {
              if (meetingWs === ws) {
                meetingWs = null;
                broadcastMeetingRemoveAllPeers();
                setupMeetingChannel();
              }
            };
            ws.onerror = function() {
              if (!settled) {
                clearTimeout(timeout);
                settled = true;
                meetingWs = null;
                setupMeetingChannel();
              }
            };
            return; // ws path in progress
          }
        }
        setupMeetingChannel();
      }

      function meetingSignalingUrl(room, name) {
        // Default API port is 3000 (see backend/src/config). In production,
        // set window.NOKJ_SIGNALING_URL (wss://...) or use a media SDK.
        if (window.NOKJ_SIGNALING_URL) {
          var sep = window.NOKJ_SIGNALING_URL.indexOf('?') === -1 ? '?' : '&';
          return window.NOKJ_SIGNALING_URL + sep + 'room=' + encodeURIComponent(room) + '&name=' + encodeURIComponent(name);
        }
        var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
        var host = location.hostname;
        var port = location.port || (location.protocol === 'https:' ? '443' : '80');
        // When served from static hosting the API may be on a fixed port;
        // fall back gracefully if unreachable.
        return protocol + '://' + host + ':3000/ws?room=' + encodeURIComponent(room) + '&name=' + encodeURIComponent(name);
      }

      function handleMeetingServerMessage(msg) {
        if (msg.type === 'room-state') {
          meetingSelfId = msg.self;
          (msg.peers || []).forEach(function(p) { meetingEnsurePeer(p.id, p.name); });
        } else if (msg.type === 'peer-joined') {
          meetingEnsurePeer(msg.from, msg.name);
          meetingMakeOffer(msg.from);
        } else if (msg.type === 'peer-left') {
          meetingRemovePeer(msg.from);
          if (msg.name) removeMeetingParticipant(msg.name);
        } else if (msg.type === 'signal') {
          if (msg.to && msg.to !== meetingSelfId) return;
          meetingHandleSignal(msg.from, msg.data);
        } else if (msg.type === 'chat') {
          meetingAppendChat(msg.name, msg.text, false);
        } else if (msg.type === 'slide') {
          meetingSlideIndex = msg.index || 0;
          renderMeetingSlide();
        } else if (msg.type === 'leave') {
          if (msg.name) removeMeetingParticipant(msg.name);
        }
      }

      function setupMeetingChannel() {
        if (meetingChannel) try { meetingChannel.close(); } catch (e) { /* noop */ }
        if (typeof BroadcastChannel === 'undefined') return;
        meetingSignalingMode = 'local';
        try {
          meetingChannel = new BroadcastChannel(meetingRoomKey);
          meetingChannel.onmessage = function(ev) {
            var msg = ev.data || {};
            if (msg.from === meetingSelfId) return;
            if (msg.type === 'chat') meetingAppendChat(msg.name, msg.text, false);
            else if (msg.type === 'slide') { meetingSlideIndex = msg.index || 0;
              renderMeetingSlide(); }
            else if (msg.type === 'join') { addMeetingParticipant(msg.name); }
            else if (msg.type === 'leave') {
              if (msg.name) removeMeetingParticipant(msg.name);
              broadcastMeetingRemoveAllPeers();
            }
          };
          var name = currentUser ? currentUser.name : tr('You');
          setTimeout(function() {
            try {
              meetingChannel.postMessage({ type: 'join', name: name, from: meetingSelfId });
            } catch (e) { /* noop */ }
          }, 300);
        } catch (e) { /* BroadcastChannel unsupported */ }
      }

      function broadcastMeeting(msg) {
        if (meetingSignalingMode === 'server' && meetingWs && meetingWs.readyState === 1) {
          try { meetingWs.send(JSON.stringify(msg)); } catch (e) { /* noop */ }
        } else if (meetingChannel) {
          try { meetingChannel.postMessage(msg); } catch (e) { /* noop */ }
        }
      }

      // ============================================================
      //  WEBRTC MESH
      // ============================================================
      function meetingEnsurePeer(peerId, name) {
        if (!meetingPeers[peerId]) {
          var pc = null;
          try {
            pc = new RTCPeerConnection({
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
              ]
            });
          } catch (e) {
            return;
          }
          pc._nokjId = peerId;
          pc._nokjName = name || 'Peer';

          pc.onicecandidate = function(ev) {
            if (ev.candidate) meetingSendSignal(peerId, { candidate: ev.candidate });
          };
          pc.ontrack = function(ev) {
            var tile = document.getElementById('meeting-remote-tile');
            var video = document.getElementById('meeting-remote-video');
            if (tile) tile.style.display = 'flex';
            if (video && ev.streams && ev.streams[0]) {
              video.srcObject = ev.streams[0];
              video.play().catch(function() { /* noop */ });
            }
            document.getElementById('meeting-remote-name').textContent = pc._nokjName || tr('Remote video');
          };
          meetingPeers[peerId] = { pc: pc, name: name || 'Peer' };
        } else {
          meetingPeers[peerId].name = name || meetingPeers[peerId].name;
        }
        meetingAttachStreamToPeer(meetingPeers[peerId].pc, peerId);
        if (name && meetingPeers[peerId].name !== (currentUser ? currentUser.name : tr('You'))) {
          addMeetingParticipant(name);
        }
        return meetingPeers[peerId].pc;
      }

      function meetingAttachStreamToPeers(stream) {
        Object.keys(meetingPeers).forEach(function(id) { meetingAttachStreamToPeer(meetingPeers[id].pc, id); });
      }

      function meetingAttachStreamToPeer(pc, peerId) {
        if (!pc || !meetingLocalStream) return;
        var already = (pc.getSenders() || []).length;
        if (already) return;
        try {
          meetingLocalStream.getTracks().forEach(function(track) {
            pc.addTrack(track, meetingLocalStream);
          });
        } catch (e) { /* noop */ }
      }

      function meetingReplaceVideoTrackToPeers(track) {
        Object.keys(meetingPeers).forEach(function(id) {
          var senders = meetingPeers[id].pc.getSenders() || [];
          for (var i = 0; i < senders.length; i++) {
            if (senders[i].track && senders[i].track.kind === 'video') {
              try { senders[i].replaceTrack(track); } catch (e) { /* noop */ }
            }
          }
        });
      }

      function meetingMakeOffer(peerId) {
        var peer = meetingPeers[peerId];
        if (!peer || !peer.pc) return;
        var pc = peer.pc;
        pc.createOffer().then(function(offer) {
          return pc.setLocalDescription(offer);
        }).then(function() {
          meetingSendSignal(peerId, { description: pc.localDescription });
        }).catch(function() { /* noop */ });
      }

      function meetingHandleSignal(from, data) {
        var peer = meetingPeers[from] || (function() {
          var pc = meetingEnsurePeer(from, (data && data.name) || 'Peer');
          return pc ? meetingPeers[from] : null;
        })();
        if (!peer || !peer.pc) return;
        var pc = peer.pc;
        if (data && data.description) {
          var desc = data.description;
          pc.setRemoteDescription(new RTCSessionDescription(desc)).then(function() {
            if (desc.type === 'offer') {
              return pc.createAnswer().then(function(answer) {
                return pc.setLocalDescription(answer);
              }).then(function() {
                meetingSendSignal(from, { description: pc.localDescription });
              });
            }
          }).catch(function() { /* noop */ });
        } else if (data && data.candidate) {
          try { pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (e) { /* noop */ }
        }
      }

      function meetingSendSignal(to, data) {
        var msg = { type: 'signal', to: to, data: data, from: meetingSelfId, name: currentUser ? currentUser.name : tr('You') };
        if (meetingSignalingMode === 'server' && meetingWs && meetingWs.readyState === 1) {
          try { meetingWs.send(JSON.stringify(msg)); } catch (e) { /* noop */ }
        } else if (meetingChannel) {
          try { meetingChannel.postMessage(msg); } catch (e) { /* noop */ }
        }
      }

      function meetingRemovePeer(peerId) {
        var peer = meetingPeers[peerId];
        if (peer && peer.pc) {
          try { peer.pc.close(); } catch (e) { /* noop */ }
        }
        delete meetingPeers[peerId];
        if (!Object.keys(meetingPeers).length) {
          document.getElementById('meeting-remote-video').srcObject = null;
          document.getElementById('meeting-remote-tile').style.display = 'none';
        }
      }

      function broadcastMeetingRemoveAllPeers() {
        Object.keys(meetingPeers).forEach(function(id) { meetingRemovePeer(id); });
      }

      function toggleMeetingFullscreen() {
        var room = document.querySelector('.meeting-room');
        if (!room) return;
        if (document.fullscreenElement) {
          if (document.exitFullscreen) document.exitFullscreen();
        } else {
          if (room.requestFullscreen) room.requestFullscreen();
        }
      }

      document.addEventListener('DOMContentLoaded', initMeetingControls);
      if (document.readyState !== 'loading') initMeetingControls();