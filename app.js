
---

### 2. Updated `app.js`
Isme aap jo bhi **Secret Key** chunte hain (ya agar box khali chhodte hain to yeh khud 6-digit code bana dega), uske naam se file ka link cloud par store ho jayega [0.1.1]. PC par wahi key daalte hi file turant download ho jayegi. Saath hi QR code bhi kaam karta rahega.

```javascript
// ====================== SAFE LINKS ======================
var ghBase = "https://github.com/HoodaRurkiAala";
document.getElementById("gh-btn").href = ghBase;
document.getElementById("proj2-link").href = ghBase;
document.getElementById("proj1-link").href = ghBase + "/HoodaRurkiAala.github.io";
document.getElementById("myForm").action = "https://formsubmit.co/hoodarurkiaala@gmail.com";

// ====================== VISITOR COUNTER ======================
fetch("https://api.counterapi.dev/v1/hoodarurkiaala-is-a-dev/visits/up")
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d && d.count) document.getElementById("visitor-count").innerText = d.count;
    })
    .catch(function() {
        var c = parseInt(localStorage.getItem("hooda_visits") || "1") + 1;
        localStorage.setItem("hooda_visits", c);
        document.getElementById("visitor-count").innerText = c;
    });

// ====================== KEY-VALUE CLOUD STORAGE (For Short Secret Key) ======================
// Note: Uses free npoint / kvdb style public bucket via jsonstorage or kvdb
var KV_BUCKET = "https://kvdb.io/Drx8P2mN9vL4qW7zR5tY1k/"; // Dedicated free key-value store

function generateRandomKey() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var key = "";
    for (var i = 0; i < 6; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

// ====================== SHOW RESULT (QR + Secret Key) ======================
function showResult(fileUrl, fileName, resType, secretKey, status, btn) {
    var payload = JSON.stringify({ u: fileUrl, n: fileName, t: resType });

    // Save payload under the chosen Secret Key
    fetch(KV_BUCKET + encodeURIComponent(secretKey), {
        method: "POST",
        body: payload
    })
    .then(function(res) {
        if (!res.ok) throw new Error("Storage Error");

        // QR Link with auto-key parameter
        var qrDirectLink = window.location.origin + window.location.pathname + "?key=" + encodeURIComponent(secretKey);
        var qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=" + encodeURIComponent(qrDirectLink);

        document.getElementById("generated-key-box").innerText = secretKey;
        document.getElementById("qr-image").src = qrUrl;
        document.getElementById("download-qr-btn").href = qrUrl;
        document.getElementById("qr-output").style.display = "block";

        btn.disabled = false;
        btn.innerText = "Upload & Generate Key + QR";
        status.style.color = "#059669";
        status.innerText = "✅ Done! Secret Key aur QR ready hai.";
    })
    .catch(function() {
        btn.disabled = false;
        btn.innerText = "Upload & Generate Key + QR";
        status.style.color = "#dc2626";
        status.innerText = "❌ Key save karne me error aaya. Dubara try karein.";
    });
}

// ====================== COPY SECRET KEY ======================
function copySecretKey() {
    var keyText = document.getElementById("generated-key-box").innerText;
    navigator.clipboard.writeText(keyText).then(function() {
        var btn = document.getElementById("copy-key-btn");
        btn.innerText = "Copied!";
        setTimeout(function() {
            btn.innerText = "Copy Secret Key";
        }, 2000);
    });
}

// ====================== BACKUP UPLOAD (Catbox) ======================
function tryCatbox(file, secretKey, status, btn, cloudErr) {
    status.style.color = "#b45309";
    status.innerText = "⚠️ Cloudinary issue (" + cloudErr + "). Trying Backup...";

    var formData = new FormData();
    formData.append("reqtype", "fileupload");
    formData.append("time", "72h");
    formData.append("fileToUpload", file);

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://litterbox.catbox.moe/resources/internals/api.php", true);

    xhr.onload = function() {
        var resText = (xhr.responseText || "").trim();
        if (xhr.status === 200 && resText.indexOf("https://") === 0) {
            showResult(resText, file.name, "raw", secretKey, status, btn);
        } else {
            btn.disabled = false;
            btn.innerText = "Upload & Generate Key + QR";
            status.style.color = "#dc2626";
            status.innerText = "❌ Upload failed. Try again.";
        }
    };

    xhr.onerror = function() {
        btn.disabled = false;
        btn.innerText = "Upload & Generate Key + QR";
        status.style.color = "#dc2626";
        status.innerText = "❌ Network Error";
    };

    xhr.send(formData);
}

// ====================== MAIN UPLOAD ======================
function startUpload() {
    var fileInput = document.getElementById("file-input");
    var customKey = document.getElementById("secret-pin").value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    var status = document.getElementById("upload-status");
    var btn = document.getElementById("upload-btn");

    if (!fileInput.files || fileInput.files.length === 0) {
        status.style.color = "#dc2626";
        status.innerText = "❌ Please select a file first!";
        return;
    }

    // Agar user ne key nahi daali to auto 6-digit key bana do
    var secretKey = customKey ? customKey : generateRandomKey();

    var file = fileInput.files.item(0);
    btn.disabled = true;
    btn.innerText = "Uploading...";
    status.style.color = "#047857";
    status.innerText = "⏳ Uploading...";

    var resourceType = "raw";
    if (file.type.indexOf("image/") === 0) resourceType = "image";
    else if (file.type.indexOf("video/") === 0 || file.type.indexOf("audio/") === 0) resourceType = "video";

    var url = "https://api.cloudinary.com/v1_1/ztpyye46/" + resourceType + "/upload";
    var formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "HoodaRurkiAala");

    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.timeout = 15000;

    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
            var percent = Math.round((e.loaded / e.total) * 100);
            status.innerText = "⏳ Uploading: " + percent + "%";
        }
    };

    xhr.ontimeout = function() { tryCatbox(file, secretKey, status, btn, "Timeout"); };
    xhr.onerror = function() { tryCatbox(file, secretKey, status, btn, "Network Error"); };

    xhr.onload = function() {
        try {
            var data = JSON.parse(xhr.responseText);
            if (xhr.status === 200 && data.secure_url) {
                showResult(data.secure_url, file.name, resourceType, secretKey, status, btn);
            } else {
                var msg = (data && data.error && data.error.message) ? data.error.message : "Error";
                tryCatbox(file, secretKey, status, btn, msg);
            }
        } catch (err) {
            tryCatbox(file, secretKey, status, btn, "Invalid Response");
        }
    };

    xhr.send(formData);
}

// ====================== UNLOCK FROM SECRET KEY ======================
function startUnlockFromKey() {
    var keyInput = document.getElementById("unlock-key").value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    var status = document.getElementById("unlock-status");
    var btn = document.getElementById("unlock-btn");

    if (!keyInput) {
        status.style.color = "#dc2626";
        status.innerText = "❌ Please enter Secret Key!";
        return;
    }

    btn.disabled = true;
    btn.innerText = "Checking Key...";
    status.style.color = "#047857";
    status.innerText = "⏳ File dhundhi ja rahi hai...";

    fetch(KV_BUCKET + encodeURIComponent(keyInput))
        .then(function(res) {
            if (!res.ok) throw new Error("Not found");
            return res.json();
        })
        .then(function(fileData) {
            if (fileData && fileData.u && fileData.u.indexOf("http") === 0) {
                status.style.color = "#059669";
                status.innerText = "✅ Key Verified! Downloading: " + fileData.n;

                var origUrl = fileData.u;
                if (fileData.t !== "raw" && origUrl.indexOf("cloudinary.com") !== -1) {
                    origUrl = fileData.u.split("/upload/").join("/upload/fl_attachment/");
                }

                var a = document.createElement("a");
                a.href = origUrl;
                a.download = fileData.n || "hooda-file";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else {
                throw new Error("Invalid Data");
            }
        })
        .catch(function() {
            status.style.color = "#dc2626";
            status.innerText = "❌ Galat Secret Key ya file expire ho gayi hai!";
        })
        .finally(function() {
            btn.disabled = false;
            btn.innerText = "Unlock & Download";
        });
}

// ====================== AUTO UNLOCK IF OPENED VIA QR ======================
var urlParams = new URLSearchParams(window.location.search);
var qrKey = urlParams.get("key");
if (qrKey) {
    document.getElementById("unlock-key").value = qrKey;
    document.getElementById("unlock-section").scrollIntoView({ behavior: "smooth" });
    startUnlockFromKey();
}
