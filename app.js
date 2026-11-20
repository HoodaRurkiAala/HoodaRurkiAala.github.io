// ====================== SETTINGS ======================
// 1. Ek baar bucket banao (sirf ek baar karna hai):
//    curl -d "email=hoodarurkiaala@gmail.com" https://kvdb.io
//    Jo ID milega (jaise AsAb12Cd...) usko neeche paste karo:
var KVDB_BUCKET = "PASTE_YOUR_BUCKET_ID_HERE";

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

// ====================== XOR ENCRYPTION ======================
function xorText(str, pin) {
    var out = "";
    for (var i = 0; i < str.length; i++) {
        out += String.fromCharCode(str.charCodeAt(i) ^ pin.charCodeAt(i % pin.length));
    }
    return out;
}

// 6-character Secret Key banata hai (confusing letters 0/O, 1/I हटाए हुए)
function makeSecretCode() {
    var chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    var code = "";
    for (var i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ====================== SHOW RESULT (QR + Secret Key) ======================
function showResult(fileUrl, fileName, resType, pin, status, btn) {
    var info = JSON.stringify({ u: fileUrl, n: fileName, t: resType });
    var locked = btoa(encodeURIComponent(xorText(info, pin)));

    // QR ke liye purana vault link abhi bhi banega (PC -> Mobile scan ke liye)
    var finalLink = window.location.origin + window.location.pathname + "#vault=" + locked;
    var qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=" + encodeURIComponent(finalLink);
    document.getElementById("qr-image").src = qrUrl;
    document.getElementById("download-qr-btn").href = qrUrl;

    // Mobile -> PC ke liye SHORT Secret Key banao aur KVDB me save karo
    var code = makeSecretCode();

    status.style.color = "#b45309";
    status.innerText = "⏳ Secret Key bana rahe hain...";

    // KVDB me save: POST https://kvdb.io/BUCKET/CODE
    fetch("https://kvdb.io/" + KVDB_BUCKET + "/" + code, {
        method: "POST",
        body: locked
    }).then(function(res) {
        if (!res.ok) throw new Error("KVDB save failed: " + res.status);

        // Success: Secret Key dikhao (Vault Link ki jagah)
        document.getElementById("secret-key-text").innerText = code;
        document.getElementById("qr-output").style.display = "block";

        btn.disabled = false;
        btn.innerText = "Upload & Generate Secure QR";
        status.style.color = "#059669";
        status.innerText = "✅ Done! QR (scan ke liye) aur Secret Key (type karne ke liye) ready hai.";
    }).catch(function(err) {
        // Agar KVDB fail ho jaye to fallback: purana vault link dikha do
        console.log("KVDB error, fallback to link:", err);
        document.getElementById("secret-key-text").innerText = "ERROR";
        document.getElementById("qr-output").style.display = "block";
        // Fallback me link copy karne ka option
        prompt("Secret Key save nahi hua. Is Vault Link ko copy kar lo (backup):", finalLink);

        btn.disabled = false;
        btn.innerText = "Upload & Generate Secure QR";
        status.style.color = "#dc2626";
        status.innerText = "⚠️ Key save nahi hua (Bucket ID check karo). QR scan karke use karo.";
    });
}

// ====================== COPY SECRET KEY ======================
function copySecretKey() {
    var code = document.getElementById("secret-key-text").innerText.trim();
    if (!code || code === "------" || code === "ERROR") return;
    navigator.clipboard.writeText(code).then(function() {
        var btn = document.getElementById("copy-key-btn");
        btn.innerText = "Copied!";
        setTimeout(function() { btn.innerText = "Copy Secret Key"; }, 2000);
    });
}

// ====================== BACKUP UPLOAD (Catbox) ======================
function tryCatbox(file, pin, status, btn, cloudErr) {
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
            showResult(resText, file.name, "raw", pin, status, btn);
        } else {
            btn.disabled = false;
            btn.innerText = "Upload & Generate Secure QR";
            status.style.color = "#dc2626";
            status.innerText = "❌ Upload failed. Try again.";
        }
    };

    xhr.onerror = function() {
        btn.disabled = false;
        btn.innerText = "Upload & Generate Secure QR";
        status.style.color = "#dc2626";
        status.innerText = "❌ Network Error";
    };

    xhr.send(formData);
}

// ====================== MAIN UPLOAD ======================
function startUpload() {
    var fileInput = document.getElementById("file-input");
    var pin = document.getElementById("secret-pin").value.trim();
    var status = document.getElementById("upload-status");
    var btn = document.getElementById("upload-btn");

    if (KVDB_BUCKET === "PASTE_YOUR_BUCKET_ID_HERE") {
        status.style.color = "#dc2626";
        status.innerText = "❌ Pehle app.js me KVDB_BUCKET ID dalo! (neeche setup dekho)";
        return;
    }
    if (!fileInput.files || fileInput.files.length === 0) {
        status.style.color = "#dc2626";
        status.innerText = "❌ Please select a file first!";
        return;
    }
    if (!pin) {
        status.style.color = "#dc2626";
        status.innerText = "❌ Please enter a Secret PIN!";
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

    xhr.ontimeout = function() { tryCatbox(file, pin, status, btn, "Timeout"); };
    xhr.onerror = function() { tryCatbox(file, pin, status, btn, "Network Error"); };

    xhr.onload = function() {
        try {
            var data = JSON.parse(xhr.responseText);
            if (xhr.status === 200 && data.secure_url) {
                showResult(data.secure_url, file.name, resourceType, pin, status, btn);
            } else {
                var msg = (data && data.error && data.error.message) ? data.error.message : "Error";
                tryCatbox(file, pin, status, btn, msg);
            }
        } catch (err) {
            tryCatbox(file, pin, status, btn, "Invalid Response");
        }
    };

    xhr.send(formData);
}

// ====================== UNLOCK: AUTO-DETECT (Key ya Link) ======================
function startUnlock() {
    var input = document.getElementById("paste-vault-link").value.trim();
    if (!input) {
        var s = document.getElementById("unlock-status");
        s.style.color = "#dc2626";
        s.innerText = "❌ Please enter Secret Key!";
        return;
    }
    // Purana vault link bhi support rahega (backward compatibility)
    if (input.indexOf("#vault=") !== -1 || input.length > 20) {
        startUnlockFromLink();
    } else {
        startUnlockFromKey();
    }
}

// ====================== UNLOCK WITH SHORT SECRET KEY (Mobile -> PC) ======================
function startUnlockFromKey() {
    var code = document.getElementById("paste-vault-link").value.trim().toUpperCase();
    var pin = document.getElementById("unlock-pin").value.trim();
    var status = document.getElementById("unlock-status");

    if (!code) {
        status.style.color = "#dc2626";
        status.innerText = "❌ Please enter Secret Key!";
        return;
    }
    if (!pin) {
        status.style.color = "#dc2626";
        status.innerText = "❌ Please enter Secret PIN!";
        return;
    }

    status.style.color = "#047857";
    status.innerText = "⏳ Key check kar rahe hain...";

    fetch("https://kvdb.io/" + KVDB_BUCKET + "/" + encodeURIComponent(code))
        .then(function(res) {
            if (res.status === 404) throw new Error("not-found");
            if (!res.ok) throw new Error("server-error");
            return res.text();
        })
        .then(function(locked) {
            decryptAndDownload(locked, pin, status);
        })
        .catch(function(err) {
            console.log(err);
            status.style.color = "#dc2626";
            status.innerText = "❌ Galat Key ya Expire ho gaya! Key + PIN dobara check karo.";
        });
}

// ====================== UNLOCK FROM OLD VAULT LINK (backup) ======================
function startUnlockFromLink() {
    var vaultLink = document.getElementById("paste-vault-link").value.trim();
    var pin = document.getElementById("unlock-pin").value.trim();
    var status = document.getElementById("unlock-status");

    if (!pin) {
        status.style.color = "#dc2626";
        status.innerText = "❌ Please enter Secret PIN!";
        return;
    }

    try {
        var hashPart = "";
        if (vaultLink.indexOf("#vault=") !== -1) {
            hashPart = vaultLink.split("#vault=")[1];
        } else {
            hashPart = vaultLink;
        }
        var locked = hashPart.trim();
        decryptAndDownload(locked, pin, status);
    } catch (e) {
        status.style.color = "#dc2626";
        status.innerText = "❌ Incorrect PIN or invalid link!";
    }
}

// ====================== COMMON DECRYPT + DOWNLOAD ======================
function decryptAndDownload(locked, pin, status) {
    try {
        var decoded = xorText(decodeURIComponent(atob(locked.trim())), pin);
        var fileData = JSON.parse(decoded);

        if (fileData && fileData.u && fileData.u.indexOf("http") === 0) {
            status.style.color = "#059669";
            status.innerText = "✅ PIN Verified! Downloading...";

            var origUrl = fileData.u;
            if (fileData.t !== "raw" && origUrl.indexOf("cloudinary.com") !== -1) {
                origUrl = fileData.u.split("/upload/").join("/upload/fl_attachment/");
            }

            var a = document.createElement("a");
            a.href = origUrl;
            a.download = fileData.n || "hooda-file";
            a.target = "_blank";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            throw new Error("Wrong PIN");
        }
    } catch (e) {
        status.style.color = "#dc2626";
        status.innerText = "❌ Incorrect PIN or invalid data!";
    }
}

// ====================== AUTO UNLOCK IF OPENED VIA QR ======================
if (window.location.hash && window.location.hash.indexOf("#vault=") === 0) {
    document.getElementById("paste-vault-link").value = window.location.href;
    document.getElementById("unlock-section").style.display = "block";
    document.getElementById("unlock-section").scrollIntoView({ behavior: "smooth" });
}
