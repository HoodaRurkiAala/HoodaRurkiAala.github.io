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

// ====================== XOR ENCRYPTION ======================
function xorText(str, pin) {
    var out = "";
    for (var i = 0; i < str.length; i++) {
        out += String.fromCharCode(str.charCodeAt(i) ^ pin.charCodeAt(i % pin.length));
    }
    return out;
}

// ====================== SHOW RESULT (QR + Link) ======================
function showResult(fileUrl, fileName, resType, pin, status, btn) {
    var info = JSON.stringify({ u: fileUrl, n: fileName, t: resType });
    var locked = btoa(encodeURIComponent(xorText(info, pin)));
    var finalLink = window.location.origin + window.location.pathname + "#vault=" + locked;

    // QR Code
    var qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=" + encodeURIComponent(finalLink);
    document.getElementById("qr-image").src = qrUrl;
    document.getElementById("download-qr-btn").href = qrUrl;

    // Show Vault Link
    document.getElementById("vault-link-text").value = finalLink;

    // Show result box
    document.getElementById("qr-output").style.display = "block";

    btn.disabled = false;
    btn.innerText = "Upload & Generate Secure QR";
    status.style.color = "#059669";
    status.innerText = "✅ Done! QR aur Vault Link ready hai.";
}

// ====================== COPY VAULT LINK ======================
function copyVaultLink() {
    var linkInput = document.getElementById("vault-link-text");
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(linkInput.value).then(function() {
        var btn = document.getElementById("copy-link-btn");
        btn.innerText = "Copied!";
        setTimeout(function() {
            btn.innerText = "Copy Vault Link";
        }, 2000);
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

// ====================== UNLOCK FROM PASTED LINK ======================
function startUnlockFromLink() {
    var vaultLink = document.getElementById("paste-vault-link").value.trim();
    var pin = document.getElementById("unlock-pin").value.trim();
    var status = document.getElementById("unlock-status");

    if (!vaultLink) {
        status.style.color = "#dc2626";
        status.innerText = "❌ Please paste the Vault Link!";
        return;
    }
    if (!pin) {
        status.style.color = "#dc2626";
        status.innerText = "❌ Please enter Secret PIN!";
        return;
    }

    try {
        // Extract #vault= part
        var hashPart = "";
        if (vaultLink.indexOf("#vault=") !== -1) {
            hashPart = vaultLink.split("#vault=")[1];
        } else {
            hashPart = vaultLink; // in case user pasted only the code
        }

        var decoded = xorText(decodeURIComponent(atob(hashPart)), pin);
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
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            throw new Error("Wrong PIN");
        }
    } catch (e) {
        status.style.color = "#dc2626";
        status.innerText = "❌ Incorrect PIN or invalid link!";
    }
}

// ====================== AUTO UNLOCK IF OPENED VIA QR ======================
if (window.location.hash && window.location.hash.indexOf("#vault=") === 0) {
    // Auto fill the paste box
    document.getElementById("paste-vault-link").value = window.location.href;
    document.getElementById("unlock-section").style.display = "block";
    document.getElementById("unlock-section").scrollIntoView({ behavior: "smooth" });
}
