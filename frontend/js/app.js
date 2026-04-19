/**
 * InstaDownloader — Frontend Logic
 * Handles URL validation, API calls, preview display, and downloads.
 */

const API_BASE = window.location.origin;

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

// ── URL Validation ───────────────────────────────────────
function isValidInstagramURL(url) {
    const pattern = /https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/(p|reel|reels|tv)\/[\w-]+/;
    return pattern.test(url.trim());
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
        const response = await fetch(`${API_BASE}/api/extract`, {
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
        showToast(err.message || "Failed to fetch media. Check the URL and try again.");
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
        const response = await fetch(`${API_BASE}/api/download`, {
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
            showSuccessToast(`Downloaded ${data.files.length} files!`);
        } else {
            // Single file download
            await triggerFileDownload(data.filename);
            showSuccessToast("Download complete!");
        }
    } catch (err) {
        showToast(err.message || "Download failed. Please try again.");
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

// ── Auto-focus on load ───────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
    urlInput.focus();
});
