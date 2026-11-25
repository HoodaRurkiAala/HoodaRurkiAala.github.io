// ====================== FIREBASE CONFIG ======================
const firebaseConfig = {
  apiKey: "AIzaSyCoB4-YeJXQ3P_AQS5F132yoU_55WreP3w",
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
import { getDatabase, ref, set, get, child, push, remove, onValue } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ====================== SAFE LINKS ======================
var ghBase = "https://github.com/HoodaRurkiAala";
document.getElementById("gh-btn").href = ghBase;
document.getElementById("proj2-link").href = ghBase;
document.getElementById("proj1-link").href = ghBase + "/HoodaRurkiAala.github.io";
document.getElementById("myForm").action = "https://formsubmit.co/hoodarurkiaala@gmail.com";

// ====================== VISITOR COUNTER ======================
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

// ====================== LIVE P2P SYSTEM ======================
let peerConn = null;
let dataChannel = null;
let currentRoomRef = null;
let incomingFileMeta = null;
let incomingChunks = [];
let receivedBytes = 0;

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
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

// ====================== CREATE LIVE ROOM ======================
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

    await set(currentRoomRef, {
      offer: JSON.stringify(peerConn.localDescription)
    });

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

// ====================== JOIN LIVE ROOM ======================
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

// ====================== SEND MESSAGE ======================
function sendP2PMessage() {
  const input = document.getElementById("p2p-msg-input");
  const text = input.value.trim();

  if (!text || !dataChannel || dataChannel.readyState !== "open") return;

  dataChannel.send(JSON.stringify({ type: "chat", text: text }));
  appendP2PLog("You", text);
  input.value = "";
}

// ====================== SEND FILE ======================
async function sendP2PFile() {
  const fileInput = document.getElementById("p2p-file-input");
  const prog = document.getElementById("p2p-transfer-progress");

  if (!fileInput.files.length || !dataChannel || dataChannel.readyState !== "open") return;

  const file = fileInput.files.item(0);

  dataChannel.send(JSON.stringify({
    type: "file-meta",
    name: file.name,
    size: file.size,
    mime: file.type
  }));

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

// ====================== MAKE P2P FUNCTIONS GLOBAL ======================
window.createP2PRoom = createP2PRoom;
window.joinP2PRoom = joinP2PRoom;
window.sendP2PMessage = sendP2PMessage;
window.sendP2PFile = sendP2PFile;


// ====================== LIVE INTERNET SPEED / PING / IP TESTER ======================
const speedTestConfig = {
  downloadBytes: 10000000,
  pingRuns: 3
};

function setNetworkText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setNetworkStatus(message, isError = false) {
  const status = document.getElementById("net-status");
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? "#dc2626" : "#047857";
}

async function loadPublicNetworkInfo() {
  try {
    const response = await fetch("https://ipapi.co/json/", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`IP lookup failed (${response.status})`);
    }

    const info = await response.json();

    setNetworkText("net-ip", info.ip || "Not available");
    setNetworkText("net-isp", info.org || info.asn || "Not available");

    const locationParts = [
      info.city,
      info.region,
      info.country_name
    ].filter(Boolean);

    setNetworkText(
      "net-location",
      locationParts.length ? locationParts.join(", ") : "Not available"
    );

  } catch (error) {
    setNetworkText("net-ip", "Unavailable");
    setNetworkText("net-isp", "Unavailable");
    setNetworkText("net-location", "IP lookup service unavailable");
  }
}

async function measureHttpPing() {
  const samples = [];

  for (let i = 0; i < speedTestConfig.pingRuns; i++) {
    const url = `https://speed.cloudflare.com/__down?bytes=0&cb=${Date.now()}-${i}`;
    const start = performance.now();

    const response = await fetch(url, {
      cache: "no-store",
      mode: "cors"
    });

    if (!response.ok) {
      throw new Error(`Ping request failed (${response.status})`);
    }

    await response.arrayBuffer();
    samples.push(performance.now() - start);
  }

  samples.sort((a, b) => a - b);

  return samples[Math.floor(samples.length / 2)];
}

async function measureRealDownloadSpeed() {
  const url = `https://speed.cloudflare.com/__down?bytes=${speedTestConfig.downloadBytes}&cb=${Date.now()}`;
  const start = performance.now();

  const response = await fetch(url, {
    cache: "no-store",
    mode: "cors"
  });

  if (!response.ok) {
    throw new Error(`Download test failed (${response.status})`);
  }

  let bytesReceived = 0;

  if (response.body && response.body.getReader) {
    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      bytesReceived += value.byteLength;
    }
  } else {
    const data = await response.arrayBuffer();
    bytesReceived = data.byteLength;
  }

  const seconds = (performance.now() - start) / 1000;

  if (!bytesReceived || seconds <= 0) {
    throw new Error("No download data received.");
  }

  return (bytesReceived * 8) / seconds / 1000000;
}

async function runInternetTest() {
  const button = document.getElementById("net-test-btn");

  if (button) {
    button.disabled = true;
    button.textContent = "Testing...";
  }

  setNetworkText("net-ping", "Testing...");
  setNetworkText("net-download", "Testing...");

  setNetworkStatus(
    "Measuring HTTP latency and downloading a real 10 MB test file..."
  );

  try {
    const ping = await measureHttpPing();

    setNetworkText("net-ping", `${Math.round(ping)} ms`);

    const downloadMbps = await measureRealDownloadSpeed();

    setNetworkText(
      "net-download",
      `${downloadMbps.toFixed(2)} Mbps`
    );

    setNetworkStatus("✅ Internet speed test completed successfully.");

  } catch (error) {
    setNetworkText("net-ping", "Failed");
    setNetworkText("net-download", "Failed");

    setNetworkStatus(
      `Test could not be completed: ${error.message}. Check your connection or try again.`,
      true
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "▶ Run Internet Speed Test";
    }
  }
}

window.runInternetTest = runInternetTest;

// Page load par public IP details fetch karo
loadPublicNetworkInfo();
// ====================== INTERNET SPEED TEST ======================
async function startSpeedTest() {
  const btn = document.getElementById("start-speedtest");
  const status = document.getElementById("speed-status");
  const speedValue = document.getElementById("speed-value");
  const dlEl = document.getElementById("dl-speed");
  const ulEl = document.getElementById("ul-speed");
  const pingEl = document.getElementById("ping-value");
  const gauge = document.getElementById("speed-gauge");

  btn.disabled = true;
  btn.innerText = "Testing...";
  status.style.color = "#047857";
  status.innerText = "⏳ Measuring Ping...";
  speedValue.innerText = "0";
  dlEl.innerText = "—";
  ulEl.innerText = "—";
  pingEl.innerText = "—";

  try {
    // 1. PING TEST
    const pingTimes = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      await fetch("https://www.cloudflare.com/cdn-cgi/trace", { cache: "no-store", mode: "cors" });
      pingTimes.push(performance.now() - start);
    }
    const ping = Math.round(pingTimes.reduce((a, b) => a + b) / pingTimes.length);
    pingEl.innerText = ping + " ms";

    // 2. DOWNLOAD TEST
    status.innerText = "⏳ Measuring Download Speed...";
    const fileSize = 5 * 1024 * 1024; // 5 MB
    const testUrl = "https://speed.cloudflare.com/__down?bytes=" + fileSize;

    const dlStart = performance.now();
    const response = await fetch(testUrl, { cache: "no-store" });
    const blob = await response.blob();
    const dlTime = (performance.now() - dlStart) / 1000; // seconds
    const dlSpeed = ((blob.size * 8) / dlTime / 1000000).toFixed(1); // Mbps

    dlEl.innerText = dlSpeed + " Mbps";
    speedValue.innerText = dlSpeed;

    // Update gauge (max 100 Mbps visual)
    const deg = Math.min((dlSpeed / 100) * 360, 360);
    gauge.style.background = `conic-gradient(#059669 ${deg}deg, #d1fae5 ${deg}deg)`;

    // 3. UPLOAD TEST (approximate)
    status.innerText = "⏳ Measuring Upload Speed...";
    const uploadData = new Blob([new ArrayBuffer(1 * 1024 * 1024)]); // 1 MB
    const ulStart = performance.now();
    
    await fetch("https://speed.cloudflare.com/__up", {
      method: "POST",
      body: uploadData,
      cache: "no-store"
    });
    
    const ulTime = (performance.now() - ulStart) / 1000;
    const ulSpeed = ((uploadData.size * 8) / ulTime / 1000000).toFixed(1);

    ulEl.innerText = ulSpeed + " Mbps";

    status.style.color = "#059669";
    status.innerText = "✅ Speed Test Complete!";
    
  } catch (err) {
    console.error(err);
    status.style.color = "#dc2626";
    status.innerText = "❌ Test failed. Check your connection.";
  }

  btn.disabled = false;
  btn.innerText = "Start Speed Test";
}

// Make global
window.startSpeedTest = startSpeedTest;
