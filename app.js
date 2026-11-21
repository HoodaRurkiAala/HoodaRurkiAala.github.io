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
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ====================== SAFE LINKS ======================
var ghBase = "https://github.com/HoodaRurkiAala";
document.getElementById("gh-btn").href = ghBase;
document.getElementById("proj2-link").href = ghBase;
document.getElementById("proj1-link").href = ghBase + "/HoodaRurkiAala.github.io";
document.getElementById("myForm").action = "https://formsubmit.co/hoodarurkiaala@gmail.com";

// Visitor Counter
fetch("https://api.counterapi.dev/v1/hoodarurkiaala-is-a-dev/visits/up")
  .then(r => r.json())
  .then(d => { if (d && d.count) document.getElementById("visitor-count").innerText = d.count; })
  .catch(() => {
    let c = parseInt(localStorage.getItem("hooda_visits") || "1") + 1;
    localStorage.setItem("hooda_visits", c);
    document.getElementById("visitor-count").innerText = c;
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
