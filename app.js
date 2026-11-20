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
    var pin = document.getElementById("secret-pin").value.trim();
    var status = document.getElementById("upload-status");

    if (!pin) {
        status.style.color = "#dc2626";
        status.innerText = "❌ Please enter a Secret PIN first!";
        return;
    }

    if (typeof cloudinary === "undefined") {
        status.style.color = "#dc2626";
        status.innerText = "❌ Cloudinary script not loaded!";
        return;
    }

    status.style.color = "#047857";
    status.innerText = "⏳ Opening Official Cloudinary Uploader...";

    var myWidget = cloudinary.createUploadWidget({
        cloudName: "ztpyye46",
        uploadPreset: "HoodaRurkiAala",
        sources: ["local", "camera"],
        multiple: false,
        resourceType: "auto",
        maxFileSize: 100000000
    }, function(error, result) {
        if (error) {
            status.style.color = "#dc2626";
            status.innerText = "❌ Upload Error: " + (error.statusText || error.message || "Failed");
            return;
        }
        if (result && result.event === "success") {
            var fileUrl = result.info.secure_url;
            var fileName = result.info.original_filename + (result.info.format ? "." + result.info.format : "");
            var resType = result.info.resource_type;

            var info = JSON.stringify({ u: fileUrl, n: fileName, t: resType });
            var locked = btoa(encodeURIComponent(xorText(info, pin)));
            var finalLink = window.location.origin + window.location.pathname + "#vault=" + locked;
            var qrUrl = "https://qrserver.com" + encodeURIComponent(finalLink);

            document.getElementById("qr-image").src = qrUrl;
            document.getElementById("download-qr-btn").href = qrUrl;
            document.getElementById("qr-output").style.display = "block";
            status.style.color = "#059669";
            status.innerText = "✅ Done! Scan the QR code below.";
        }
    });

    myWidget.open();
}

if (window.location.hash && window.location.hash.indexOf("#vault=") === 0) {
    var unlockBox = document.getElementById("unlock-section");
    if (unlockBox) {
        unlockBox.style.display = "block";
        unlockBox.scrollIntoView({ behavior: "smooth" });
    }
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
        status.innerText = "❌ Incorrect PIN!";
    }
}
<script src="https://cloudinary.com" type="text/javascript"></script>
<script src="app.js"></script>
