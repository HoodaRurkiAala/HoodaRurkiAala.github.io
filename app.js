const firebaseConfig = {
  apiKey: "AIzaSyCoB4-YeXJQ3P_AQS5F132yoU_55WreP3w",
  authDomain: "://firebaseapp.com",
  databaseURL: "https://firebaseio.com",
  projectId: "hoodarurkiaala1",
  storageBucket: "hoodarurkiaala1.firebasestorage.app",
  messagingSenderId: "825431525385",
  appId: "1:825431525385:web:aa2cdcddfb9b10940a90d8",
  measurementId: "G-4RNKF0BC2H"
};

import { initializeApp } from "https://gstatic.com";
import { getDatabase, ref, set, get, child, push } from "https://gstatic.com";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const ghBase = "https://" + "://github.com";
document.getElementById("gh-btn").href = ghBase;
document.getElementById("proj2-link").href = ghBase;
document.getElementById("proj1-link").href = ghBase + "/HoodaRurkiAala.github.io";

fetch("https://" + "api.counterapi.dev/v1/hoodarurkiaala-is-a-dev/visits/up")
  .then(r => r.json())
  .then(d => { if (d && d.count) document.getElementById("visitor-count").innerText = d.count; })
  .catch(() => {
    let c = parseInt(localStorage.getItem("hooda_visits") || "1") + 1;
    localStorage.setItem("hooda_visits", c);
    document.getElementById("visitor-count").innerText = c;
  });

const contactForm = document.getElementById("myForm");
if (contactForm) {
  contactForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    const btn = document.getElementById("contact-btn");
    const status = document.getElementById("contact-status");
    const name = document.getElementById("name").value.trim();
    const contactInfo = document.getElementById("contact_info").value.trim();
    const message = document.getElementById("message").value.trim();

    btn.disabled = true;
    btn.innerText = "Sending...";
    status.style.color = "#047857";
    status.innerText = "⏳ Sending your message...";

    try {
      await push(ref(db, "messages"), {
        name: name,
        contact: contactInfo || "Not provided",
        message: message,
        time: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      });

      const mailRes = await fetch("https://" + "formsubmit.co" + "/ajax/hoodarurkiaala@gmail.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          name: name,
          contact_info: contactInfo || "Not provided",
          message: message,
          _subject: "New Message from Hooda Rurki Aala Website!",
          _captcha: "false"
        })
      });

      status.style.color = "#059669";
      status.innerText = mailRes.ok
        ? "✅ Message sent! Check your Gmail."
        : "✅ Message saved! Please activate FormSubmit in Gmail.";
      contactForm.reset();
    } catch (err) {
      status.style.color = "#dc2626";
      status.innerText = "❌ Error: " + err.message;
    } finally {
      btn.disabled = false;
      btn.innerText = "Send Message";
    }
  });
}

async function deriveAESKey(pin, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(pin), { name: "PBKDF2" }, false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(buffer, pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAESKey(pin, salt);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, buffer);
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  return combined;
}

async function decryptData(combinedBuffer, pin) {
  const combined = new Uint8Array(combinedBuffer);
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);
  const key = await deriveAESKey(pin, salt);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ciphertext);
}

function generateShortCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function showResult(shortCode, status, btn) {
  document.getElementById("short-code-display").innerText = shortCode;
  document.getElementById("qr-output").style.display = "block";
  btn.disabled = false;
  btn.innerText = "Upload & Generate Code";
  status.style.color = "#059669";
  status.innerText = "✅ End-to-End Encrypted & Uploaded! Note your Short Code.";
}

async function startUpload() {
  const fileInput = document.getElementById("file-input");
  const pin = document.getElementById("secret-pin").value.trim();
  const status = document.getElementById("upload-status");
  const btn = document.getElementById("upload-btn");

  if (!fileInput.files || !fileInput.files.length) {
    status.style.color = "#dc2626";
    status.innerText = "❌ File select karo!";
    return;
  }
  if (!pin) {
    status.style.color = "#dc2626";
    status.innerText = "❌ Secret PIN daalo!";
    return;
  }

  const file = fileInput.files.item(0);
  if (file.size > 10 * 1024 * 1024) {
    status.style.color = "#dc2626";
    status.innerText = "❌ Encrypted mode me max file size 10 MB hai!";
    return;
  }

  btn.disabled = true;
  btn.innerText = "Encrypting & Uploading...";
  status.style.color = "#047857";
  status.innerText = "🔒 Encrypting file with AES-256 in your browser...";

  try {
    const rawBuffer = await file.arrayBuffer();
    const encryptedBytes = await encryptData(rawBuffer, pin);
    const encryptedBlob = new Blob([encryptedBytes], { type: "application/octet-stream" });

    const metaText = JSON.stringify({ n: file.name, m: file.type || "application/octet-stream" });
    const encMetaBytes = await encryptData(new TextEncoder().encode(metaText), pin);
    const encMetaBase64 = btoa(String.fromCharCode(...encMetaBytes));

    status.innerText = "⏳ Uploading encrypted file to cloud...";

    const formData = new FormData();
    formData.append("file", encryptedBlob, "vault.enc");
    formData.append("upload_preset", "HoodaRurkiAala");

    const res = await fetch("https://" + "://cloudinary.com" + "/v1_1/ztpyye46/raw/upload", {
      method: "POST",
      body: formData
    });
    const data = await res.json();

    if (!data.secure_url) throw new Error(data.error?.message || "Upload failed");

    let shortCode = generateShortCode();
    let exists = true;
    while (exists) {
      const snapshot = await get(child(ref(db), "files/" + shortCode));
      if (!snapshot.exists()) exists = false;
      else shortCode = generateShortCode();
    }

    await set(ref(db, "files/" + shortCode), {
      url: data.secure_url,
      meta: encMetaBase64,
      e2ee: true,
      created: Date.now()
    });

    showResult(shortCode, status, btn);

  } catch (err) {
    btn.disabled = false;
    btn.innerText = "Upload & Generate Code";
    status.style.color = "#dc2626";
    status.innerText = "❌ Error: " + err.message;
  }
}

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
    status.innerText = "❌ Secret PIN daalo!";
    return;
  }

  status.style.color = "#047857";
  status.innerText = "⏳ Fetching & Decrypting...";

  try {
    const snapshot = await get(child(ref(db), "files/" + code));
    if (!snapshot.exists()) {
      status.style.color = "#dc2626";
      status.innerText = "❌ Invalid Short Code!";
      return;
    }

    const record = snapshot.val();
    const encMetaBin = Uint8Array.from(atob(record.meta), c => c.charCodeAt(0));
    const decMetaBuf = await decryptData(encMetaBin.buffer, pin);
    const meta = JSON.parse(new TextDecoder().decode(decMetaBuf));

    status.innerText = "🔓 PIN Verified! Decrypting original file...";

    const fileRes = await fetch(record.url);
    if (!fileRes.ok) throw new Error("Encrypted file not found on server");
    const encFileBuf = await fileRes.arrayBuffer();
    const decFileBuf = await decryptData(encFileBuf, pin);

    const blob = new Blob([decFileBuf], { type: meta.m });
    const downloadUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = meta.n || "decrypted-file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

    status.style.color = "#059669";
    status.innerText = "✅ File Decrypted & Downloaded!";

  } catch (e) {
    status.style.color = "#dc2626";
    status.innerText = "❌ Incorrect PIN or Corrupted Code!";
  }
}

window.startUpload = startUpload;
window.startUnlock = startUnlock;
