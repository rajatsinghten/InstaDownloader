
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.background import BackgroundTask

from downloader import (
    is_valid_instagram_url,
    extract_info,
    download_media,
    cleanup_file,
    get_session_status,
    DOWNLOADS_DIR,
)


# ── Lifespan ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Clean up any leftover downloads on startup."""
    for f in os.listdir(DOWNLOADS_DIR):
        fpath = os.path.join(DOWNLOADS_DIR, f)
        if os.path.isfile(fpath) and f != ".gitkeep":
            os.remove(fpath)
    yield


# ── App ───────────────────────────────────────────────────
app = FastAPI(
    title="InstaDownloader API",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow all origins for Vercel frontend → Render backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ────────────────────────────────────────────────
class URLRequest(BaseModel):
    url: str


# ── Media Routes ──────────────────────────────────────────
@app.post("/api/extract")
async def extract_media_info(req: URLRequest):
    """Extract metadata from an Instagram URL (no download)."""
    url = req.url.strip()

    if not is_valid_instagram_url(url):
        raise HTTPException(
            status_code=400,
            detail="Invalid Instagram URL. Please provide a link to a post, reel, or video.",
        )

    try:
        info = extract_info(url)
        return {"success": True, "data": info}
    except Exception as e:
        error_msg = str(e)
        if "login" in error_msg.lower() or "empty media" in error_msg.lower():
            raise HTTPException(
                status_code=401,
                detail="Instagram requires authentication. Configure session env vars on the backend and redeploy.",
            )
        raise HTTPException(
            status_code=422,
            detail=f"Could not extract media info: {error_msg}",
        )


@app.post("/api/download")
async def download_media_file(req: URLRequest):
    """Download media from an Instagram URL and return file info."""
    url = req.url.strip()

    if not is_valid_instagram_url(url):
        raise HTTPException(
            status_code=400,
            detail="Invalid Instagram URL.",
        )

    try:
        result = download_media(url)
        return {"success": True, "data": result}
    except Exception as e:
        error_msg = str(e)
        if "login" in error_msg.lower() or "empty media" in error_msg.lower():
            raise HTTPException(
                status_code=401,
                detail="Instagram requires authentication. Configure session env vars on the backend and redeploy.",
            )
        raise HTTPException(
            status_code=500,
            detail=f"Download failed: {error_msg}",
        )


@app.get("/api/file/{filename}")
async def serve_file(filename: str):
    """Serve a downloaded file."""
    filepath = os.path.join(DOWNLOADS_DIR, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")

    ext = os.path.splitext(filename)[1].lower()
    media_types = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=filepath,
        media_type=media_type,
        filename=filename,
        background=BackgroundTask(cleanup_file, filepath),
    )


@app.delete("/api/file/{filename}")
async def delete_file(filename: str):
    """Clean up a downloaded file."""
    filepath = os.path.join(DOWNLOADS_DIR, filename)
    cleanup_file(filepath)
    return {"success": True}


# ── Health Check ──────────────────────────────────────────
@app.get("/api/health")
async def health_check():
    """Health check endpoint for deployment monitoring."""
    session = get_session_status()
    return {
        "status": "ok",
        "version": "1.0.0",
        "session": session,
    }


# ── Serve Frontend (local dev only) ──────────────────────
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


# ── Run ───────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
