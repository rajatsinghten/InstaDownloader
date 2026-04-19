"""
Instagram media downloader powered by yt-dlp.
Handles extraction of metadata and downloading of Reels, Photos, and Videos.
Uses browser cookies for Instagram authentication (required since 2025).
"""

import glob
import os
import re
import sys
import uuid
from typing import Optional

import yt_dlp

DOWNLOADS_DIR = os.path.join(os.path.dirname(__file__), "downloads")
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

# ── Browser cookie detection ──────────────────────────────
# Instagram now requires authentication for most content.
# yt-dlp can extract cookies directly from your browser.
# We try browsers in order of likelihood on macOS.
_BROWSERS_TO_TRY = ["chrome", "safari", "firefox", "edge", "brave"]


def _detect_browser() -> Optional[str]:
    """Find a browser that yt-dlp can extract cookies from."""
    for browser in _BROWSERS_TO_TRY:
        try:
            # Try creating a YoutubeDL instance with this browser's cookies
            ydl = yt_dlp.YoutubeDL({
                "quiet": True,
                "no_warnings": True,
                "cookiesfrombrowser": (browser,),
            })
            ydl.close()
            return browser
        except Exception:
            continue
    return None


# Cache the result so we only detect once
_COOKIE_BROWSER = None
_COOKIE_BROWSER_CHECKED = False


def _get_cookie_browser():
    global _COOKIE_BROWSER, _COOKIE_BROWSER_CHECKED
    if not _COOKIE_BROWSER_CHECKED:
        _COOKIE_BROWSER = _detect_browser()
        _COOKIE_BROWSER_CHECKED = True
        if _COOKIE_BROWSER:
            print(f"✅ Using cookies from: {_COOKIE_BROWSER}", file=sys.stderr)
        else:
            print("⚠️  No browser cookies found. Only public posts will work.", file=sys.stderr)
    return _COOKIE_BROWSER


def _base_opts() -> dict:
    """Base yt-dlp options shared across extract and download."""
    opts = {
        "quiet": True,
        "no_warnings": True,
        "no_color": True,
    }
    browser = _get_cookie_browser()
    if browser:
        opts["cookiesfrombrowser"] = (browser,)
    return opts


def is_valid_instagram_url(url: str) -> bool:
    """Validate that a URL is a legitimate Instagram post/reel URL."""
    pattern = r"https?://(www\.)?(instagram\.com|instagr\.am)/(p|reel|reels|tv)/[\w-]+"
    return bool(re.match(pattern, url.strip()))


def _detect_media_type(info: dict) -> str:
    """Determine the media type from yt-dlp extracted info."""
    url = info.get("webpage_url", "")
    if "/reel/" in url or "/reels/" in url:
        return "reel"

    # Check if it's a video or image
    if info.get("ext") in ("jpg", "jpeg", "png", "webp"):
        return "photo"
    if info.get("duration") and info.get("duration") > 0:
        return "video"
    if info.get("ext") in ("mp4", "webm", "mkv"):
        return "video"

    return "video"


def _find_downloaded_file(file_id: str) -> Optional[str]:
    """Find a downloaded file by its unique ID prefix in the downloads dir."""
    pattern = os.path.join(DOWNLOADS_DIR, f"{file_id}_*")
    matches = glob.glob(pattern)
    if matches:
        # Return the first non-part file (avoid .part files from incomplete downloads)
        for m in matches:
            if not m.endswith(".part"):
                return m
        return matches[0]
    return None


def extract_info(url: str) -> dict:
    """
    Extract metadata from an Instagram URL without downloading.
    Returns: dict with title, thumbnail, type, duration, uploader, etc.
    """
    ydl_opts = {
        **_base_opts(),
        "skip_download": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    if not info:
        raise ValueError("Could not extract information from URL")

    # Handle playlist/carousel posts
    entries = info.get("entries")
    if entries:
        # Carousel post — return info about all items
        items = []
        for entry in entries:
            items.append({
                "title": entry.get("title", "Instagram Media"),
                "thumbnail": entry.get("thumbnail", ""),
                "type": _detect_media_type(entry),
                "duration": entry.get("duration"),
                "ext": entry.get("ext", "mp4"),
                "url": entry.get("webpage_url", url),
            })
        return {
            "title": info.get("title", "Instagram Carousel"),
            "thumbnail": items[0]["thumbnail"] if items else "",
            "type": "carousel",
            "items": items,
            "item_count": len(items),
            "uploader": info.get("uploader", info.get("channel", "Unknown")),
            "url": url,
        }

    media_type = _detect_media_type(info)

    return {
        "title": info.get("title", "Instagram Media"),
        "thumbnail": info.get("thumbnail", ""),
        "type": media_type,
        "duration": info.get("duration"),
        "uploader": info.get("uploader", info.get("channel", "Unknown")),
        "ext": info.get("ext", "mp4"),
        "url": url,
        "width": info.get("width"),
        "height": info.get("height"),
    }


def download_media(url: str) -> dict:
    """
    Download media from an Instagram URL.
    Returns: dict with filename, filepath, and media type.
    """
    file_id = uuid.uuid4().hex[:10]

    ydl_opts = {
        **_base_opts(),
        "outtmpl": os.path.join(DOWNLOADS_DIR, f"{file_id}_%(title).50s.%(ext)s"),
        "format": "best",
        "writethumbnail": False,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)

    if not info:
        raise ValueError("Download failed — no info returned")

    # Handle carousel / playlist
    entries = info.get("entries")
    if entries:
        files = []
        for entry in entries:
            filepath = ydl.prepare_filename(entry)
            # Fallback: search by file_id prefix if prepare_filename is wrong
            if not os.path.exists(filepath):
                filepath = _find_downloaded_file(file_id) or filepath
            if os.path.exists(filepath):
                files.append({
                    "filename": os.path.basename(filepath),
                    "filepath": filepath,
                    "type": _detect_media_type(entry),
                    "size": os.path.getsize(filepath),
                })
        return {
            "type": "carousel",
            "files": files,
            "count": len(files),
        }

    # Single file
    filepath = ydl.prepare_filename(info)

    if not os.path.exists(filepath):
        # yt-dlp sometimes changes extension after post-processing
        base = os.path.splitext(filepath)[0]
        for ext in [".mp4", ".webm", ".jpg", ".jpeg", ".png", ".webp"]:
            candidate = base + ext
            if os.path.exists(candidate):
                filepath = candidate
                break

    # Last resort: glob search by file_id
    if not os.path.exists(filepath):
        found = _find_downloaded_file(file_id)
        if found:
            filepath = found

    if not os.path.exists(filepath):
        raise FileNotFoundError(
            "Download completed but file could not be located. "
            "This may be an Instagram authentication issue — "
            "ensure you're logged into Instagram in your browser."
        )

    return {
        "filename": os.path.basename(filepath),
        "filepath": filepath,
        "type": _detect_media_type(info),
        "size": os.path.getsize(filepath),
    }


def cleanup_file(filepath: str):
    """Remove a downloaded file after it has been served."""
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except OSError:
        pass
