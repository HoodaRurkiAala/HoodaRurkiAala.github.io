var ghBase = "https://github.com";
document.getElementById("gh-btn").href = ghBase;
document.getElementById("proj2-link").href = ghBase;
document.getElementById("proj1-link").href = ghBase + "/HoodaRurkiAala.github.io";
document.getElementById("myForm").action = "https://formsubmit.co";

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

function xorText(str, pin) {
    var out = "";
    for (var i = 0; i < str.length; i++) {
        out += String.fromCharCode(str.charCodeAt(i) ^ pin.charCodeAt(i % pin.length));
    }
    return out;
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
    status.innerText = "⏳ Uploading original file, please wait...";

    var formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "HoodaRurkiAala");

    fetch("https://cloudinary.com", {
        method: "POST",
        body: formData
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.secure_url) {
            var info = JSON.stringify({ u: data.secure_url, n: file.name });
            var locked = btoa(encodeURIComponent(xorText(info, pin)));
            var finalLink = window.location.origin + window.location.pathname + "#vault=" + locked;
            var qrUrl = "https://qrserver.com" + encodeURIComponent(finalLink);

            document.getElementById("qr-image").src = qrUrl;
            document.getElementById("download-qr-btn").href = qrUrl;
            document.getElementById("qr-output").style.display = "block";
            status.style.color = "#059669";
            status.innerText = "✅ Done! Scan the QR code below.";
        } else {
            status.style.color = "#dc2626";
            status.innerText = "❌ Error: " + (data.error ? data.error.message : "Check preset");
        }
    })
    .catch(function(err) {
        status.style.color = "#dc2626";
        status.innerText = "❌ Network Error: " + err.message;
    })
    .finally(function() {
        btn.disabled = false;
        btn.innerText = "Upload & Generate Secure QR";
    });
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
            var origUrl = fileData.u.split("/upload/").join("/upload/fl_attachment/");
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
