/**
 * InstaDownloader — Frontend Logic
 * Handles URL validation, API calls, preview display, and downloads.
 */

const API_BASE = window.location.origin;
const REQUEST_TIMEOUT = 60000; // 60s timeout for extraction/download

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

// ── State ────────────────────────────────────────────────
let currentMediaInfo = null;

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
        return "Instagram is rate-limiting requests. Please wait a minute and try again.";
    }
    if (lower.includes("private") || lower.includes("login")) {
        return "This post appears to be private. Only public posts can be downloaded.";
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

function resetState() {
    currentMediaInfo = null;
    previewSection.classList.remove("visible");
    downloadBtn.classList.remove("loading");
    downloadBtn.disabled = false;
    fetchBtn.classList.remove("loading");
    fetchBtn.disabled = !isValidInstagramURL(urlInput.value.trim());
}

// ── Input Handling ───────────────────────────────────────
urlInput.addEventListener("input", () => {
    const val = urlInput.value.trim();
    fetchBtn.disabled = !isValidInstagramURL(val);

    // Auto-fetch when a valid URL is pasted
    if (isValidInstagramURL(val) && val.length > 20) {
        // Small delay to distinguish typing from pasting
        clearTimeout(urlInput._autoFetchTimer);
        urlInput._autoFetchTimer = setTimeout(() => {
            // Only auto-fetch if the entire value looks pasted (quick input)
        }, 800);
    }
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

        // Visual feedback
        pasteBtn.style.color = "var(--color-video)";
        setTimeout(() => {
            pasteBtn.style.color = "";
        }, 600);

        // Auto-fetch if valid
        if (isValidInstagramURL(text)) {
            setTimeout(fetchMedia, 300);
        }
    } catch (err) {
        showToast("Clipboard access denied. Please paste manually.");
    }
});

// ── Fetch Button ─────────────────────────────────────────
fetchBtn.addEventListener("click", fetchMedia);

async function fetchMedia() {
    const url = urlInput.value.trim();
    if (!isValidInstagramURL(url)) return;

    // Set loading state
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
    // Thumbnail
    if (data.thumbnail) {
        previewImg.src = data.thumbnail;
        previewImg.alt = data.title || "Instagram media preview";
    } else {
        previewImg.src = "";
        previewImg.alt = "No preview available";
    }

    // Title
    previewTitle.textContent = data.title || "Instagram Media";

    // Uploader
    uploaderName.textContent = data.uploader || "Unknown";

    // Type Badge
    const mediaType = data.type || "video";
    typeBadge.className = `type-badge ${mediaType}`;
    typeBadgeText.textContent = mediaType.charAt(0).toUpperCase() + mediaType.slice(1);

    // Duration
    if (data.duration && data.duration > 0) {
        const mins = Math.floor(data.duration / 60);
        const secs = Math.floor(data.duration % 60);
        durationText.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
        durationBadge.classList.add("visible");
    } else {
        durationBadge.classList.remove("visible");
    }

    // Carousel
    if (data.type === "carousel" && data.item_count) {
        carouselCount.textContent = data.item_count;
        carouselInfo.classList.add("visible");
    } else {
        carouselInfo.classList.remove("visible");
    }

    // Show preview
    previewSection.classList.add("visible");

    // Scroll to preview
    setTimeout(() => {
        previewSection.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
}

// ── Download Button ──────────────────────────────────────
downloadBtn.addEventListener("click", downloadMedia);

async function downloadMedia() {
    if (!currentMediaInfo) return;

    const url = currentMediaInfo.url || urlInput.value.trim();

    // Set loading state
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
            // Download all carousel files
            for (const file of data.files) {
                await triggerFileDownload(file.filename);
            }
            const totalSize = data.files.reduce((s, f) => s + (f.size || 0), 0);
            const sizeStr = totalSize ? ` (${formatFileSize(totalSize)})` : "";
            showSuccessToast(`Downloaded ${data.files.length} files${sizeStr}!`);
        } else {
            // Single file download
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

    // Clean up the file on the server after a delay
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

    // Server health check
    fetch(`${API_BASE}/api/extract`, { method: "OPTIONS" }).catch(() => {
        showToast("⚠️ Backend server not detected. Make sure it's running on port 8000.", 6000);
    });
});
