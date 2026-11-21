// ====================== FIREBASE CONFIG ======================
const firebaseConfig = {
  apiKey: "AIzaSyCoB4-YeXJQ3P_AQS5F132yoU_55WreP3w",
  authDomain: "hoodarurkiaala1.firebaseapp.com",
  databaseURL: "https://hoodarurkiaala1-default-rtdb.firebaseio.com",
  projectId: "hoodarurkiaala1",
  storageBucket: "hoodarurkiaala1.firebasestorage.app",
  messagingSenderId: "825431525385",
  appId: "1:825431525385:web:aa2cdcddfb9b10940a90d8",
  measurementId: "G-4RNKF0BC2H"
};

// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, set, get, child, push, remove, onValue } from "https://gstatic.com";
/firebasejs/11.0.2/firebase-database.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ====================== SAFE LINKS ======================
var ghBase = "https://github.com/HoodaRurkiAala";
document.getElementById("gh-btn").href = ghBase;
document.getElementById("proj2-link").href = ghBase;
document.getElementById("proj1-link").href = ghBase + "/HoodaRurkiAala.github.io";
document.getElementById("myForm").action = "https://formsubmit.co/hoodarurkiaala@gmail.com";

// ====================== VISITOR COUNTER (New Working) ======================
fetch("https://countapi.mileshilliard.com/api/v1/hit/hoodarurkiaala-visits")
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d && d.value) {
      document.getElementById("visitor-count").innerText = d.value;
    } else {
      document.getElementById("visitor-count").innerText = "—";
    }
  })
  .catch(function() {
    document.getElementById("visitor-count").innerText = "—";
  });
// ====================== HELPERS ======================
function xorText(str, pin) {
  let out = "";
  for (let i = 0; i < str.length; i++) {
    out += String.fromCharCode(str.charCodeAt(i) ^ pin.charCodeAt(i % pin.length));
  }
  return out;
}

function generateShortCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ====================== SHOW RESULT ======================
function showResult(shortCode, status, btn) {
  document.getElementById("short-code-display").innerText = shortCode;
  document.getElementById("qr-output").style.display = "block";
  btn.disabled = false;
  btn.innerText = "Upload & Generate Code";
  status.style.color = "#059669";
  status.innerText = "✅ Done! Apna Short Code note kar lo.";
}

// ====================== MAIN UPLOAD ======================
async function startUpload() {
  const fileInput = document.getElementById("file-input");
  const pin = document.getElementById("secret-pin").value.trim();
  const status = document.getElementById("upload-status");
  const btn = document.getElementById("upload-btn");

  if (!fileInput.files.length) {
    status.style.color = "#dc2626";
    status.innerText = "❌ File select karo!";
    return;
  }
  if (!pin) {
    status.style.color = "#dc2626";
    status.innerText = "❌ PIN daalo!";
    return;
  }

  const file = fileInput.files[0];
  btn.disabled = true;
  btn.innerText = "Uploading...";
  status.style.color = "#047857";
  status.innerText = "⏳ Uploading...";

  let resourceType = "raw";
  if (file.type.startsWith("image/")) resourceType = "image";
  else if (file.type.startsWith("video/") || file.type.startsWith("audio/")) resourceType = "video";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "HoodaRurkiAala");

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/ztpyye46/${resourceType}/upload`, {
      method: "POST",
      body: formData
    });
    const data = await res.json();

    if (!data.secure_url) throw new Error(data.error?.message || "Upload failed");

    // Encrypt
    const info = JSON.stringify({ u: data.secure_url, n: file.name, t: resourceType });
    const locked = btoa(encodeURIComponent(xorText(info, pin)));

    // Unique Short Code
    let shortCode = generateShortCode();
    let exists = true;
    while (exists) {
      const snapshot = await get(child(ref(db), "files/" + shortCode));
      if (!snapshot.exists()) exists = false;
      else shortCode = generateShortCode();
    }

    // Save to Firebase
    await set(ref(db, "files/" + shortCode), {
      data: locked,
      created: Date.now()
    });

    showResult(shortCode, status, btn);

  } catch (err) {
    console.error(err);
    btn.disabled = false;
    btn.innerText = "Upload & Generate Code";
    status.style.color = "#dc2626";
    status.innerText = "❌ Error: " + err.message;
  }
}

// ====================== UNLOCK WITH SHORT CODE ======================
async function startUnlock() {
  const code = document.getElementById("unlock-code").value.trim().toUpperCase();
  const pin = document.getElementById("unlock-pin").value.trim();
  const status = document.getElementById("unlock-status");

  if (!code || code.length !== 6) {
    status.style.color = "#dc2626";
    status.innerText = "❌ 6 digit Short Code daalo!";
    return;
  }
  if (!pin) {
    status.style.color = "#dc2626";
    status.innerText = "❌ PIN daalo!";
    return;
  }

  status.style.color = "#047857";
  status.innerText = "⏳ Checking...";

  try {
    const snapshot = await get(child(ref(db), "files/" + code));
    if (!snapshot.exists()) {
      status.style.color = "#dc2626";
      status.innerText = "❌ Invalid Short Code!";
      return;
    }

    const locked = snapshot.val().data;
    const decoded = xorText(decodeURIComponent(atob(locked)), pin);
    const fileData = JSON.parse(decoded);

    if (!fileData || !fileData.u) throw new Error("Wrong PIN");

    status.style.color = "#059669";
    status.innerText = "✅ PIN Verified! Downloading...";

    let origUrl = fileData.u;
    if (fileData.t !== "raw" && origUrl.includes("cloudinary.com")) {
      origUrl = fileData.u.replace("/upload/", "/upload/fl_attachment/");
    }

    const a = document.createElement("a");
    a.href = origUrl;
    a.download = fileData.n || "file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

  } catch (e) {
    status.style.color = "#dc2626";
    status.innerText = "❌ Incorrect PIN or Code!";
  }
}

// ====================== MAKE FUNCTIONS GLOBAL ======================
window.startUpload = startUpload;
window.startUnlock = startUnlock;
let peerConn = null;
let dataChannel = null;
let currentRoomRef = null;
let incomingFileMeta = null;
let incomingChunks = [];
let receivedBytes = 0;

const rtcConfig = {
  iceServers: [{ urls: "stun:://google.com" }]
};

function appendP2PLog(sender, text) {
  const log = document.getElementById("p2p-chat-log");
  const div = document.createElement("div");
  div.style.marginBottom = "6px";
  div.innerHTML = `<strong>${sender}:</strong> ${text}`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function setupDataChannel(channel) {
  dataChannel = channel;
  dataChannel.binaryType = "arraybuffer";

  dataChannel.onopen = () => {
    document.getElementById("p2p-status").style.color = "#059669";
    document.getElementById("p2p-status").innerText = "🟢 Connected Live (Peer-to-Peer)!";
    document.getElementById("p2p-room-box").style.display = "block";
    if (currentRoomRef) remove(currentRoomRef);
  };

  dataChannel.onclose = () => {
    document.getElementById("p2p-status").style.color = "#dc2626";
    document.getElementById("p2p-status").innerText = "🔴 Peer Disconnected.";
  };

  dataChannel.onmessage = (e) => {
    if (typeof e.data === "string") {
      const msg = JSON.parse(e.data);
      if (msg.type === "chat") {
        appendP2PLog("Peer", msg.text);
      } else if (msg.type === "file-meta") {
        incomingFileMeta = msg;
        incomingChunks = [];
        receivedBytes = 0;
        appendP2PLog("System", `Receiving "${msg.name}" (${(msg.size / (1024 * 1024)).toFixed(2)} MB)...`);
      } else if (msg.type === "file-end" && incomingFileMeta) {
        const blob = new Blob(incomingChunks, { type: incomingFileMeta.mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = incomingFileMeta.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        appendP2PLog("System", `✅ "${incomingFileMeta.name}" downloaded!`);
        incomingFileMeta = null;
      }
    } else if (incomingFileMeta) {
      incomingChunks.push(e.data);
      receivedBytes += e.data.byteLength;
      const pct = Math.round((receivedBytes / incomingFileMeta.size) * 100);
      document.getElementById("p2p-transfer-progress").innerText = `📥 Receiving: ${pct}%`;
    }
  };
}

function waitForIceGathering(pc) {
  return new Promise(resolve => {
    if (pc.iceGatheringState === "complete") return resolve();
    const timer = setTimeout(resolve, 2000);
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timer);
        resolve();
      }
    };
  });
}

async function createP2PRoom() {
  const status = document.getElementById("p2p-status");
  try {
    status.style.color = "#047857";
    status.innerText = "⏳ Creating Live Room...";

    const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    currentRoomRef = ref(db, "p2p_rooms/" + roomCode);

    peerConn = new RTCPeerConnection(rtcConfig);
    setupDataChannel(peerConn.createDataChannel("hooda-p2p"));

    const offer = await peerConn.createOffer();
    await peerConn.setLocalDescription(offer);
    await waitForIceGathering(peerConn);

    await set(currentRoomRef, { offer: JSON.stringify(peerConn.localDescription) });
    status.style.color = "#059669";
    status.innerText = `✅ Room Created! Share Code: [ ${roomCode} ] — Waiting for friend...`;

    onValue(child(currentRoomRef, "answer"), async (snap) => {
      if (snap.exists() && !peerConn.currentRemoteDescription) {
        const answer = JSON.parse(snap.val());
        await peerConn.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });
  } catch (err) {
    status.style.color = "#dc2626";
    status.innerText = "❌ Error: " + err.message;
  }
}

async function joinP2PRoom() {
  const code = document.getElementById("p2p-room-input").value.trim();
  const status = document.getElementById("p2p-status");
  if (code.length !== 4) {
    status.style.color = "#dc2626";
    status.innerText = "❌ Enter valid 4-digit Room Code!";
    return;
  }

  try {
    status.style.color = "#047857";
    status.innerText = "⏳ Searching Room...";

    currentRoomRef = ref(db, "p2p_rooms/" + code);
    const snap = await get(currentRoomRef);
    if (!snap.exists() || !snap.val().offer) {
      status.style.color = "#dc2626";
      status.innerText = "❌ Room not found or expired!";
      return;
    }

    status.innerText = "⏳ Connecting directly to peer...";
    peerConn = new RTCPeerConnection(rtcConfig);
    peerConn.ondatachannel = (e) => setupDataChannel(e.channel);

    const offer = JSON.parse(snap.val().offer);
    await peerConn.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peerConn.createAnswer();
    await peerConn.setLocalDescription(answer);
    await waitForIceGathering(peerConn);

    await set(child(currentRoomRef, "answer"), JSON.stringify(peerConn.localDescription));
  } catch (err) {
    status.style.color = "#dc2626";
    status.innerText = "❌ Connection Error: " + err.message;
  }
}


function sendP2PMessage() {
  const input = document.getElementById("p2p-msg-input");
  const text = input.value.trim();
  if (!text || !dataChannel || dataChannel.readyState !== "open") return;
  dataChannel.send(JSON.stringify({ type: "chat", text: text }));
  appendP2PLog("You", text);
  input.value = "";
}

async function sendP2PFile() {
  const fileInput = document.getElementById("p2p-file-input");
  const prog = document.getElementById("p2p-transfer-progress");
  if (!fileInput.files.length || !dataChannel || dataChannel.readyState !== "open") return;

  const file = fileInput.files.item(0);
  dataChannel.send(JSON.stringify({ type: "file-meta", name: file.name, size: file.size, mime: file.type }));
  appendP2PLog("You", `Sending "${file.name}"...`);

  const chunkSize = 65536;
  let offset = 0;
  const buffer = await file.arrayBuffer();

  while (offset < buffer.byteLength) {
    if (dataChannel.bufferedAmount > 8 * 1024 * 1024) {
      await new Promise(r => setTimeout(r, 50));
      continue;
    }
    const slice = buffer.slice(offset, offset + chunkSize);
    dataChannel.send(slice);
    offset += chunkSize;
    const pct = Math.min(100, Math.round((offset / buffer.byteLength) * 100));
    prog.style.color = "#047857";
    prog.innerText = `📤 Sending: ${pct}%`;
  }

  dataChannel.send(JSON.stringify({ type: "file-end" }));
  prog.style.color = "#059669";
  prog.innerText = `✅ "${file.name}" Sent Successfully!`;
}

window.createP2PRoom = createP2PRoom;
window.joinP2PRoom = joinP2PRoom;
window.sendP2PMessage = sendP2PMessage;
window.sendP2PFile = sendP2PFile;
