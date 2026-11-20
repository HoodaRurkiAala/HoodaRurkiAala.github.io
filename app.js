// ====================== SAFE LINKS ======================
var ghBase = "https://github.com";
document.getElementById("gh-btn").href = ghBase;
document.getElementById("proj2-link").href = ghBase;
document.getElementById("proj1-link").href = ghBase + "/HoodaRurkiAala.github.io";
document.getElementById("myForm").action = "https://formsubmit.co";

// ====================== VISITOR COUNTER ======================
fetch("https://counterapi.dev")
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d && d.count) document.getElementById("visitor-count").innerText = d.count;
    })
    .catch(function() {
        var c = parseInt(localStorage.getItem("hooda_visits") || "1") + 1;
        localStorage.setItem("hooda_visits", c);
        document.getElementById("visitor-count").innerText = c;
    });

// ====================== XOR ENCRYPTION ======================
function xorText(str, pin) {
    if (!pin) return str;
    var out = "";
    for (var i = 0; i < str.length; i++) {
        out += String.fromCharCode(str.charCodeAt(i) ^ pin.charCodeAt(i % pin.length));
    }
    return out;
}

// ====================== SHOW RESULT (QR + Short Secret Key) ======================
function showResult(fileUrl, fileName, resType, userPin, status, btn) {
    var rawPayload = JSON.stringify({ u: fileUrl, n: fileName, t: resType });
    // Agar user ne apna PIN daala hai to encrypt karein, warna plain rakhein
    var finalData = userPin ? "ENC:" + btoa(encodeURIComponent(xorText(rawPayload, userPin))) : rawPayload;

    status.style.color = "#047857";
    status.innerText = "⏳ Secret Key ban rahi hai...";

    // Bytebin API se chhota Secret Key generate karein
    fetch("https://lucko.me", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: finalData
    })
    .then(function(res) {
        if (!res.ok) throw new Error("Bytebin Error");
        return res.json();
    })
    .then(function(data) {
        // Bytebin ek chhota key deta hai (jaise "aB3x9K")
        // Agar user ne apna PIN bhi daala hai to key banegi: "aB3x9K-PIN"
        var shortKey = userPin ? (data.key + "-" + userPin) : data.key;

        var qrDirectLink = window.location.origin + window.location.pathname + "?key=" + encodeURIComponent(shortKey);
        var qrUrl = "https://qrserver.com" + encodeURIComponent(qrDirectLink);

        document.getElementById("generated-key-box").innerText = shortKey;
        document.getElementById("qr-image").src = qrUrl;
        document.getElementById("download-qr-btn").href = qrUrl;
        document.getElementById("qr-output").style.display = "block";

        btn.disabled = false;
        btn.innerText = "Upload & Generate Key + QR";
        status.style.color = "#059669";
        status.innerText = "✅ Done! Secret Key aur QR ready hai.";
    })
    .catch(function(err) {
        btn.disabled = false;
        btn.innerText = "Upload & Generate Key + QR";
        status.style.color = "#dc2626";
        status.innerText = "❌ Secret Key generate nahi ho payi (" + err.message + "). Dubara try karein.";
    });
}

// ====================== COPY SECRET KEY ======================
function copySecretKey() {
    var keyText = document.getElementById("generated-key-box").innerText;
    navigator.clipboard.writeText(keyText).then(function() {
        var iconBtn = document.getElementById("copy-icon-btn");
        if (iconBtn) {
            var originalHTML = iconBtn.innerHTML;
            iconBtn.style.background = "#047857";
            iconBtn.innerHTML = '<svg xmlns="http://w3.org" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            setTimeout(function() {
                iconBtn.style.background = "#059669";
                iconBtn.innerHTML = originalHTML;
            }, 2000);
        }
        var copyBtn = document.getElementById("copy-key-btn");
        if (copyBtn) {
            copyBtn.innerText = "Copied!";
            setTimeout(function() { copyBtn.innerText = "Copy Secret Key"; }, 2000);
        }
    });
}

// ====================== BACKUP UPLOAD (Catbox) ======================
function tryCatbox(file, userPin, status, btn, cloudErr) {
    status.style.color = "#b45309";
    status.innerText = "⚠️ Cloudinary issue (" + cloudErr + "). Trying Backup...";

    var formData = new FormData();
    formData.append("reqtype", "fileupload");
    formData.append("time", "72h");
    formData.append("fileToUpload", file);

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://catbox.moe", true);

    xhr.onload = function() {
        var resText = (xhr.responseText || "").trim();
        if (xhr.status === 200 && resText.indexOf("https://") === 0) {
            showResult(resText, file.name, "raw", userPin, status, btn);
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
    var userPin = document.getElementById("secret-pin").value.trim().replace(/[^a-zA-Z0-9]/g, "");
    var status = document.getElementById("upload-status");
    var btn = document.getElementById("upload-btn");

    if (!fileInput.files || fileInput.files.length === 0) {
        status.style.color = "#dc2626";
        status.innerText = "❌ Please select a file first!";
        return;
    }

    var file = fileInput.files.item(0);
    btn.disabled = true;
    btn.innerText = "Uploading...";
    status.style.color = "#047857";
    status.innerText = "⏳ Uploading...";

    var resourceType = "raw";
    if (file.type.indexOf("image/") === 0) resourceType = "image";
    else if (file.type.indexOf("video/") === 0 || file.type.indexOf("audio/") === 0) resourceType = "video";

    var url = "https://cloudinary.com" + resourceType + "/upload";
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

    xhr.ontimeout = function() { tryCatbox(file, userPin, status, btn, "Timeout"); };
    xhr.onerror = function() { tryCatbox(file, userPin, status, btn, "Network Error"); };

    xhr.onload = function() {
        try {
            var data = JSON.parse(xhr.responseText);
            if (xhr.status === 200 && data.secure_url) {
                showResult(data.secure_url, file.name, resourceType, userPin, status, btn);
            } else {
                var msg = (data && data.error && data.error.message) ? data.error.message : "Error";
                tryCatbox(file, userPin, status, btn, msg);
            }
        } catch (err) {
            tryCatbox(file, userPin, status, btn, "Invalid Response");
        }
    };

    xhr.send(formData);
}

// ====================== UNLOCK FROM SECRET KEY ======================
function startUnlockFromKey() {
    var fullKey = document.getElementById("unlock-key").value.trim();
    var status = document.getElementById("unlock-status");
    var btn = document.getElementById("unlock-btn");

    if (!fullKey) {
        status.style.color = "#dc2626";
        status.innerText = "❌ Please enter Secret Key!";
        return;
    }

    // Key ko split karein (agar PIN laga hai to: "aB3x9K-1234")
    var binId = fullKey;
    var userPin = "";
    if (fullKey.indexOf("-") !== -1) {
        var parts = fullKey.split("-");
        binId = parts[0];
        userPin = parts[1];
    }

    btn.disabled = true;
    btn.innerText = "Checking Key...";
    status.style.color = "#047857";
    status.innerText = "⏳ File dhundhi ja rahi hai...";

    fetch("https://lucko.me" + encodeURIComponent(binId))
        .then(function(res) {
            if (!res.ok) throw new Error("Not found");
            return res.text();
        })
        .then(function(rawText) {
            var jsonStr = rawText;
            if (rawText.indexOf("ENC:") === 0) {
                var encryptedPart = rawText.substring(4);
                jsonStr = xorText(decodeURIComponent(atob(encryptedPart)), userPin);
            }
            var fileData = JSON.parse(jsonStr);

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
