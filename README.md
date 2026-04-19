# 📸 InstaDownloader

A beautiful web tool to download Instagram Reels, Photos, and Videos.

Built with **FastAPI** + **yt-dlp** + **Vanilla HTML/CSS/JS**.

![Dark glassmorphism UI with Instagram-inspired gradients](https://img.shields.io/badge/UI-Dark_Glassmorphism-blueviolet?style=flat-square)
![Python](https://img.shields.io/badge/Backend-Python_FastAPI-green?style=flat-square)
![Deploy](https://img.shields.io/badge/Deploy-Vercel_+_Render-blue?style=flat-square)

---

## ✨ Features

- 🎬 **Download Reels, Videos, Photos & Carousels** from any public/private Instagram post
- 🔐 **Session-based auth** — paste your Instagram session cookie once, download anything
- 👁️ **Preview before download** — see thumbnail, type badge, uploader, and duration
- 🎨 **Stunning dark UI** — glassmorphism cards, Instagram gradient accents, micro-animations
- 📱 **Fully responsive** — works on desktop and mobile
- 🚀 **Deploy-ready** — Vercel (frontend) + Render (backend) configs included

---

## 🚀 Quick Start (Local)

### Prerequisites

- Python 3.10+ (3.9 works but deprecated by yt-dlp)
- An Instagram account (for session cookies)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/InstaDownloader.git
cd InstaDownloader

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r backend/requirements.txt
```

### 2. Start the Server

```bash
cd backend
python main.py
```

The app will be running at **http://localhost:8000**.

### 3. Set Up Your Session

1. Open [instagram.com](https://www.instagram.com) in your browser and log in
2. Open DevTools (`F12` or `Cmd+Option+I`)
3. Go to **Application** → **Cookies** → **instagram.com**
4. Copy the value of `sessionid`
5. In the app, click **Setup** and paste your session ID
6. Click **Save Session**

### 4. Download!

Paste any Instagram link and hit **Fetch Media** → **Download**.

---

## 🌐 Deployment

### Frontend → Vercel

1. Fork/push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Vercel will auto-detect `vercel.json` and deploy the `frontend/` directory
4. After deploy, edit `frontend/js/config.js` and set your Render backend URL:

```javascript
window.INSTA_API_URL = "https://your-app-name.onrender.com";
```

### Backend → Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your repo
3. Render will auto-detect `render.yaml`
4. Set the **Python Version** to `3.11` in environment variables
5. Deploy!

> **Note**: On Render free tier, the server spins down after inactivity. The first request after idle may take ~30 seconds.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/session` | Save Instagram session cookies |
| `GET` | `/api/session` | Check authentication status |
| `DELETE` | `/api/session` | Clear stored session |
| `POST` | `/api/extract` | Extract media info (no download) |
| `POST` | `/api/download` | Download media and get file info |
| `GET` | `/api/file/{filename}` | Serve a downloaded file |
| `DELETE` | `/api/file/{filename}` | Clean up a downloaded file |
| `GET` | `/api/health` | Health check |

### Example: Set Session

```bash
curl -X POST http://localhost:8000/api/session \
  -H "Content-Type: application/json" \
  -d '{"sessionid": "YOUR_SESSION_ID_HERE"}'
```

### Example: Download a Reel

```bash
# Extract info
curl -X POST http://localhost:8000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.instagram.com/reel/ABC123/"}'

# Download
curl -X POST http://localhost:8000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.instagram.com/reel/ABC123/"}'
```

---

## 🏗️ Project Structure

```
InstaDownloader/
├── backend/
│   ├── main.py              # FastAPI server + routes
│   ├── downloader.py         # yt-dlp wrapper + session management
│   ├── requirements.txt      # Python dependencies
│   └── downloads/            # Temp download storage
├── frontend/
│   ├── index.html            # Main UI
│   ├── css/style.css         # Design system
│   └── js/
│       ├── config.js         # API URL config
│       └── app.js            # Frontend logic
├── vercel.json               # Vercel deployment config
├── render.yaml               # Render deployment config
├── .gitignore
└── README.md
```

---

## ⚠️ Disclaimer

This tool is for **personal use only**. Always respect content creators' rights and Instagram's Terms of Service. Do not use this tool for mass scraping or redistribution of copyrighted content.

---

## 📄 License

MIT License — do whatever you want with it.
