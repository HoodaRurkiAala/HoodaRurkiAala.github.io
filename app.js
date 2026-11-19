var ghBase = "https://" + "://github.com";
document.getElementById("gh-btn").href = ghBase;
document.getElementById("proj2-link").href = ghBase;
document.getElementById("proj1-link").href = ghBase + "/HoodaRurkiAala.github.io";
document.getElementById("myForm").action = "https://" + "formsubmit.co/hoodarurkiaala@gmail.com";

fetch("https://" + "api.counterapi.dev/v1/hoodarurkiaala-is-a-dev/visits/up")
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d && d.count) document.getElementById("visitor-count").innerText = d.count;
    })
    .catch(function() {
        var c = parseInt(localStorage.getItem("hooda_visits") || "1") + 1;
        localStorage.setItem("hooda_visits", c);
        document.getElementById("visitor-count").innerText = c;
    });

function xorText(str, pin) {
    var out = "";
    for (var i = 0; i < str.length; i++) {
        out += String.fromCharCode(str.charCodeAt(i) ^ pin.charCodeAt(i % pin.length));
    }
    return out;
}

function generateFinalQR(fileUrl, fileName, resType, pin, status, btn) {
    var info = JSON.stringify({ u: fileUrl, n: fileName, t: resType });
    var locked = btoa(encodeURIComponent(xorText(info, pin)));
    var finalLink = window.location.origin + window.location.pathname + "#vault=" + locked;
    var qrUrl = "https://" + "://qrserver.com" + "/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(finalLink);

    document.getElementById("qr-image").src = qrUrl;
    document.getElementById("download-qr-btn").href = qrUrl;
    document.getElementById("qr-output").style.display = "block";
    btn.disabled = false;
    btn.innerText = "Upload & Generate Secure QR";
    status.style.color = "#059669";
    status.innerText = "✅ Done! Scan the QR code below.";
}

function uploadToBackupServer(file, pin, status, btn) {
    status.style.color = "#047857";
    status.innerText = "⏳ Uploading via Fast Server (0%)...";
    var formData = new FormData();
    formData.append("file", file);

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://" + "tmpfiles.org" + "/api/v1/upload", true);

    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
            var percent = Math.round((e.loaded / e.total) * 100);
            status.innerText = "⏳ Uploading via Fast Server (" + percent + "%)...";
        }
    };

    xhr.onload = function() {
        try {
            var res = JSON.parse(xhr.responseText);
            if (xhr.status === 200 && res.data && res.data.url) {
                var directUrl = res.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
                generateFinalQR(directUrl, file.name, "raw", pin, status, btn);
            } else {
                throw new Error("Backup failed");
            }
        } catch (err) {
            btn.disabled = false;
            btn.innerText = "Upload & Generate Secure QR";
            status.style.color = "#dc2626";
            status.innerText = "❌ Upload Failed! Please check your internet connection.";
        }
    };

    xhr.onerror = function() {
        btn.disabled = false;
        btn.innerText = "Upload & Generate Secure QR";
        status.style.color = "#dc2626";
        status.innerText = "❌ Network Error! Please check mobile data / Wi-Fi.";
    };

    xhr.send(formData);
}

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
    status.innerText = "⏳ Uploading original file (0%), please wait...";

    var resourceType = "raw";
    if (file.type.indexOf("image/") === 0) {
        resourceType = "image";
    } else if (file.type.indexOf("video/") === 0 || file.type.indexOf("audio/") === 0) {
        resourceType = "video";
    }

    var url = "https://" + "://cloudinary.com" + "/v1_1/ztpyye46/" + resourceType + "/upload";
    var formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "HoodaRurkiAala");

    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.timeout = 10000;

    var switched = false;
    function fallback() {
        if (!switched) {
            switched = true;
            try { xhr.abort(); } catch (e) {}
            uploadToBackupServer(file, pin, status, btn);
        }
    }

    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable && e.loaded > 0) {
            xhr.timeout = 0;
            var percent = Math.round((e.loaded / e.total) * 100);
            status.innerText = "⏳ Uploading original file (" + percent + "%), please wait...";
        }
    };

    xhr.ontimeout = fallback;
    xhr.onerror = fallback;

    xhr.onload = function() {
        if (switched) return;
        try {
            var data = JSON.parse(xhr.responseText);
            if (xhr.status === 200 && data.secure_url) {
                generateFinalQR(data.secure_url, file.name, resourceType, pin, status, btn);
            } else {
                fallback();
            }
        } catch (err) {
            fallback();
        }
    };

    xhr.send(formData);
}

if (window.location.hash && window.location.hash.indexOf("#vault=") === 0) {
    document.getElementById("unlock-section").style.display = "block";
    document.getElementById("unlock-section").scrollIntoView({ behavior: "smooth" });
}

function startUnlock() {
    var pin = document.getElementById("unlock-pin").value.trim();
    var status = document.getElementById("unlock-status");
    if (!pin) {
        status.style.color = "#dc2626";
        status.innerText = "❌ Please enter Secret PIN!";
        return;
    }
    try {
        var hashPart = window.location.hash.replace("#vault=", "");
        var decoded = xorText(decodeURIComponent(atob(hashPart)), pin);
        var fileData = JSON.parse(decoded);
        if (fileData && fileData.u && fileData.u.indexOf("http") === 0) {
            status.style.color = "#059669";
            status.innerText = "✅ PIN Verified! Downloading original file...";
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
        status.innerText = "❌ Incorrect PIN!";
    }
}
