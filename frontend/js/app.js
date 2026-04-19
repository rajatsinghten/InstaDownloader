/**
 * InstaDownloader — Frontend Logic
 * Handles session management, URL validation, API calls, preview, and downloads.
 */

// ── Config ───────────────────────────────────────────────
// For local dev, API_BASE = same origin.
// For Vercel→Render deployment, set this to your Render backend URL.
const API_BASE = window.INSTA_API_URL || window.location.origin;
const REQUEST_TIMEOUT = 60000;

// ── DOM Elements ─────────────────────────────────────────
const urlInput = document.getElementById("url-input");
const pasteBtn = document.getElementById("paste-btn");
const fetchBtn = document.getElementById("fetch-btn");
const previewSection = document.getElementById("preview-section");
const previewImg = document.getElementById("preview-img");
const previewTitle = document.getElementById("preview-title");
const uploaderName = document.getElementById("uploader-name");
const typeBadge = document.getElementById("type-badge");
const typeBadgeText = document.getElementById("type-badge-text");
const durationBadge = document.getElementById("duration-badge");
const durationText = document.getElementById("duration-text");
const carouselInfo = document.getElementById("carousel-info");
const carouselCount = document.getElementById("carousel-count");
const downloadBtn = document.getElementById("download-btn");
const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toast-message");
const toastSuccess = document.getElementById("toast-success");
const toastSuccessMessage = document.getElementById("toast-success-message");

// Session elements
const sessionDot = document.getElementById("session-dot");
const sessionMessage = document.getElementById("session-message");
const sessionToggleBtn = document.getElementById("session-toggle-btn");
const sessionToggleText = document.getElementById("session-toggle-text");
const sessionPanel = document.getElementById("session-panel");
const sessionCloseBtn = document.getElementById("session-close-btn");
const sessionIdInput = document.getElementById("session-id-input");
const csrfInput = document.getElementById("csrf-input");
const useridInput = document.getElementById("userid-input");
const saveSessionBtn = document.getElementById("save-session-btn");
const clearSessionBtn = document.getElementById("clear-session-btn");

// ── State ────────────────────────────────────────────────
let currentMediaInfo = null;
let isAuthenticated = false;

// ── Helpers ──────────────────────────────────────────────
function isValidInstagramURL(url) {
    const pattern = /https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/(p|reel|reels|tv)\/[\w-]+/;
    return pattern.test(url.trim());
}

function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out. The server may be busy — try again.")), timeout)
        ),
    ]);
}

function friendlyError(message) {
    const lower = message.toLowerCase();
    if (lower.includes("429") || lower.includes("rate")) {
        return "Instagram is rate-limiting requests. Wait a minute and try again.";
    }
    if (lower.includes("session") || lower.includes("401") || lower.includes("authentication") || lower.includes("login") || lower.includes("empty media")) {
        return "Authentication required. Please set your Instagram session cookie first.";
    }
    if (lower.includes("private")) {
        return "This post appears to be private and cannot be downloaded.";
    }
    if (lower.includes("not found") || lower.includes("404")) {
        return "Post not found. It may have been deleted or the URL is incorrect.";
    }
    if (lower.includes("timed out")) {
        return message;
    }
    if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
        return "Cannot reach the server. Make sure the backend is running.";
    }
    return message || "Something went wrong. Please try again.";
}

function formatFileSize(bytes) {
    if (!bytes) return "";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
}

// ── Session Management ───────────────────────────────────
async function checkSession() {
    try {
        const res = await fetch(`${API_BASE}/api/session`);
        const data = await res.json();
        const status = data.data;

        isAuthenticated = status.authenticated;
        sessionDot.classList.toggle("active", isAuthenticated);
        sessionMessage.textContent = status.message;
        sessionToggleText.textContent = isAuthenticated ? "Update" : "Setup";
    } catch {
        sessionMessage.textContent = "Server unreachable";
        sessionDot.classList.remove("active");
        isAuthenticated = false;
    }
}

sessionToggleBtn.addEventListener("click", () => {
    sessionPanel.classList.toggle("visible");
});

sessionCloseBtn.addEventListener("click", () => {
    sessionPanel.classList.remove("visible");
});

saveSessionBtn.addEventListener("click", async () => {
    const sessionId = sessionIdInput.value.trim();
    if (!sessionId || sessionId.length < 10) {
        showToast("Please enter a valid session ID (it's a long string).");
        return;
    }

    saveSessionBtn.disabled = true;
    saveSessionBtn.textContent = "Saving...";

    try {
        const res = await fetch(`${API_BASE}/api/session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sessionid: sessionId,
                csrftoken: csrfInput.value.trim(),
                ds_user_id: useridInput.value.trim(),
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || "Failed to save session");
        }

        showSuccessToast("Session saved! You can now download content.");
        sessionPanel.classList.remove("visible");
        await checkSession();
    } catch (err) {
        showToast(err.message);
    } finally {
        saveSessionBtn.disabled = false;
        saveSessionBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
            </svg>
            Save Session`;
    }
});

clearSessionBtn.addEventListener("click", async () => {
    try {
        await fetch(`${API_BASE}/api/session`, { method: "DELETE" });
        showSuccessToast("Session cleared.");
        sessionIdInput.value = "";
        csrfInput.value = "";
        useridInput.value = "";
        await checkSession();
    } catch {
        showToast("Failed to clear session.");
    }
});

// ── Input Handling ───────────────────────────────────────
urlInput.addEventListener("input", () => {
    const val = urlInput.value.trim();
    fetchBtn.disabled = !isValidInstagramURL(val);
});

urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !fetchBtn.disabled) {
        fetchMedia();
    }
});

// ── Paste Button ─────────────────────────────────────────
pasteBtn.addEventListener("click", async () => {
    try {
        const text = await navigator.clipboard.readText();
        urlInput.value = text;
        urlInput.dispatchEvent(new Event("input"));

        pasteBtn.style.color = "var(--color-video)";
        setTimeout(() => { pasteBtn.style.color = ""; }, 600);

        if (isValidInstagramURL(text)) {
            setTimeout(fetchMedia, 300);
        }
    } catch {
        showToast("Clipboard access denied. Please paste manually.");
    }
});

// ── Fetch Media ──────────────────────────────────────────
fetchBtn.addEventListener("click", fetchMedia);

async function fetchMedia() {
    const url = urlInput.value.trim();
    if (!isValidInstagramURL(url)) return;

    if (!isAuthenticated) {
        showToast("Please set your Instagram session cookie first.");
        sessionPanel.classList.add("visible");
        return;
    }

    fetchBtn.classList.add("loading");
    fetchBtn.disabled = true;
    previewSection.classList.remove("visible");

    try {
        const response = await fetchWithTimeout(`${API_BASE}/api/extract`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Failed to extract media info");
        }

        currentMediaInfo = result.data;
        displayPreview(result.data);
    } catch (err) {
        showToast(friendlyError(err.message));
    } finally {
        fetchBtn.classList.remove("loading");
        fetchBtn.disabled = !isValidInstagramURL(urlInput.value.trim());
    }
}

// ── Display Preview ──────────────────────────────────────
function displayPreview(data) {
    if (data.thumbnail) {
        previewImg.src = data.thumbnail;
        previewImg.alt = data.title || "Instagram media preview";
    } else {
        previewImg.src = "";
        previewImg.alt = "No preview available";
    }

    previewTitle.textContent = data.title || "Instagram Media";
    uploaderName.textContent = data.uploader || "Unknown";

    const mediaType = data.type || "video";
    typeBadge.className = `type-badge ${mediaType}`;
    typeBadgeText.textContent = mediaType.charAt(0).toUpperCase() + mediaType.slice(1);

    if (data.duration && data.duration > 0) {
        const mins = Math.floor(data.duration / 60);
        const secs = Math.floor(data.duration % 60);
        durationText.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
        durationBadge.classList.add("visible");
    } else {
        durationBadge.classList.remove("visible");
    }

    if (data.type === "carousel" && data.item_count) {
        carouselCount.textContent = data.item_count;
        carouselInfo.classList.add("visible");
    } else {
        carouselInfo.classList.remove("visible");
    }

    previewSection.classList.add("visible");
    setTimeout(() => {
        previewSection.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
}

// ── Download ─────────────────────────────────────────────
downloadBtn.addEventListener("click", downloadMedia);

async function downloadMedia() {
    if (!currentMediaInfo) return;

    const url = currentMediaInfo.url || urlInput.value.trim();

    downloadBtn.classList.add("loading");
    downloadBtn.disabled = true;

    try {
        const response = await fetchWithTimeout(`${API_BASE}/api/download`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Download failed");
        }

        const data = result.data;

        if (data.type === "carousel" && data.files) {
            for (const file of data.files) {
                await triggerFileDownload(file.filename);
            }
            const totalSize = data.files.reduce((s, f) => s + (f.size || 0), 0);
            const sizeStr = totalSize ? ` (${formatFileSize(totalSize)})` : "";
            showSuccessToast(`Downloaded ${data.files.length} files${sizeStr}!`);
        } else {
            await triggerFileDownload(data.filename);
            const sizeStr = data.size ? ` (${formatFileSize(data.size)})` : "";
            showSuccessToast(`Download complete${sizeStr}!`);
        }
    } catch (err) {
        showToast(friendlyError(err.message));
    } finally {
        downloadBtn.classList.remove("loading");
        downloadBtn.disabled = false;
    }
}

async function triggerFileDownload(filename) {
    const fileUrl = `${API_BASE}/api/file/${encodeURIComponent(filename)}`;
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
        fetch(`${API_BASE}/api/file/${encodeURIComponent(filename)}`, {
            method: "DELETE",
        }).catch(() => {});
    }, 5000);
}

// ── Toast Notifications ──────────────────────────────────
function showToast(message, duration = 4000) {
    toastMessage.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove("visible");
    }, duration);
}

function showSuccessToast(message, duration = 3000) {
    toastSuccessMessage.textContent = message;
    toastSuccess.classList.add("visible");
    clearTimeout(toastSuccess._timer);
    toastSuccess._timer = setTimeout(() => {
        toastSuccess.classList.remove("visible");
    }, duration);
}

// ── Drag & Drop URL ──────────────────────────────────────
document.body.addEventListener("dragover", (e) => e.preventDefault());
document.body.addEventListener("drop", (e) => {
    e.preventDefault();
    const text = e.dataTransfer.getData("text/plain");
    if (text && isValidInstagramURL(text)) {
        urlInput.value = text;
        urlInput.dispatchEvent(new Event("input"));
        setTimeout(fetchMedia, 200);
    }
});

// ── Init ─────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
    urlInput.focus();
    checkSession();
});
