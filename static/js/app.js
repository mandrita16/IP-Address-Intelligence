
const ipInput = document.getElementById("ipInput");
const searchBtn = document.getElementById("searchBtn");
const myIpBtn = document.getElementById("myIpBtn");
const message = document.getElementById("message");
const results = document.getElementById("results");

let currentIPData = null;
let map = null;
let marker = null;

function showMessage(text, type = "error") {
    message.textContent = text;
    message.className = `message ${type === "loading" ? "loading" : ""}`;
}

function clearMessage() {
    message.textContent = "";
    message.className = "message";
}

function displayValue(id, value, fallback = "Not available") {
    document.getElementById(id).textContent =
        value === null || value === undefined || value === ""
            ? fallback
            : String(value);
}

async function lookupIP(ip = null) {
    clearMessage();

    searchBtn.disabled = true;
    myIpBtn.disabled = true;
    showMessage("Analyzing IP address...", "loading");

    try {
        const endpoint = ip
            ? `/api/lookup?ip=${encodeURIComponent(ip)}`
            : "/api/my-ip";

        const response = await fetch(endpoint);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to retrieve IP information.");
        }

        currentIPData = data;
        displayResults(data);

        showMessage("IP information retrieved successfully.", "loading");
    } catch (error) {
        results.classList.add("hidden");
        showMessage(error.message || "Something went wrong.");
    } finally {
        searchBtn.disabled = false;
        myIpBtn.disabled = false;
    }
}

function displayResults(data) {
    results.classList.remove("hidden");

    const version = data.version ||
        (data.ip && data.ip.includes(":") ? "IPv6" : "IPv4");

    const city = data.city;
    const region = data.region;
    const country = data.country_name;

    displayValue("ipAddress", data.ip);
    displayValue("ipVersion", version, "IP");
    displayValue("location", [city, region].filter(Boolean).join(", "));
    displayValue(
        "coordinates",
        data.latitude != null && data.longitude != null
            ? `${data.latitude}, ${data.longitude}`
            : null
    );
    displayValue("country", country);
    displayValue("continent", data.continent_code);
    displayValue("isp", data.org);
    displayValue("asn", data.asn);
    displayValue("timezone", data.timezone);
    displayValue("utcOffset", data.utc_offset);
    displayValue("region", region);
    displayValue("postal", data.postal);
    displayValue("asnDetail", data.asn);
    displayValue("continentDetail", data.continent_code);

    updateMap(data.latitude, data.longitude);

    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 100);
}

function updateMap(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        if (map) {
            map.remove();
            map = null;
            marker = null;
        }

        document.getElementById("map").textContent =
            "Map coordinates are not available for this IP.";
        return;
    }

    const mapElement = document.getElementById("map");

    if (!map) {
        mapElement.textContent = "";

        map = L.map("map").setView([lat, lng], 10);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
    } else {
        map.setView([lat, lng], 10);
    }

    if (marker) {
        marker.setLatLng([lat, lng]);
    } else {
        marker = L.marker([lat, lng]).addTo(map);
    }

    marker.bindPopup("Approximate IP location").openPopup();
}

searchBtn.addEventListener("click", () => {
    const ip = ipInput.value.trim();

    if (!ip) {
        showMessage("Please enter an IP address.");
        ipInput.focus();
        return;
    }

    lookupIP(ip);
});

ipInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        searchBtn.click();
    }
});

myIpBtn.addEventListener("click", () => lookupIP());

document.getElementById("copyBtn").addEventListener("click", async () => {
    if (!currentIPData?.ip) return;

    try {
        await navigator.clipboard.writeText(currentIPData.ip);
        showMessage("IP address copied to clipboard.", "loading");
    } catch {
        showMessage("Could not copy the IP address.");
    }
});

document.getElementById("exportBtn").addEventListener("click", () => {
    if (!currentIPData) return;

    const blob = new Blob(
        [JSON.stringify(currentIPData, null, 4)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `ip-report-${currentIPData.ip}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
});

window.addEventListener("load", () => {
    lookupIP();
});
