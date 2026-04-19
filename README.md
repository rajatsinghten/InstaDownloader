# InstaDownloader

A web application to download Instagram Reels, Photos, and Videos.
Live Link : https://insta-downloader-roan.vercel.app/
## Features

- Download Reels, Videos, Photos and Carousel posts
- Media preview before downloading
- Support for frontend (Vercel) and backend (Render) deployment

## Quick Start (Local Setup)

### Prerequisites

- Python 3.10 or higher
- An Instagram account

### 1. Installation

Clone the repository and install the backend dependencies:

```bash
git clone https://github.com/rajatsinghten/InstaDownloader.git
cd InstaDownloader

python3 -m venv venv
source venv/bin/activate

pip install -r backend/requirements.txt
```

### 2. Run the server

```bash
cd backend
python main.py
```

The application will start at `http://localhost:8000`.

### 3. Authentication Setup

Set Instagram cookies as backend environment variables:

1. Log into instagram.com in your browser.
2. Open DevTools and copy the `sessionid` cookie value.
3. Set `SESSIONID` in your backend environment.
4. Optionally set `CSRFTOKEN` and `DS_USER_ID` for better compatibility.

## Deployment

### Frontend (Vercel)

1. Import the repository into Vercel.
2. Vercel will automatically detect `vercel.json` and deploy from the `frontend` directory.
3. Edit `frontend/js/config.js` to point to your deployed backend API URL.

### Backend (Render)

1. Create a new Web Service on Render and connect the repository.
2. Render will automatically detect `render.yaml`.
3. Set the Environment Variable `PYTHON_VERSION` to `3.11`.
4. Add `SESSIONID` (required), plus optional `CSRFTOKEN` and `DS_USER_ID`.

## Legal Disclaimer

This software is for personal use only. Users are responsible for complying with Instagram's Terms of Service and respecting the copyright of content creators. Do not use this tool for mass scraping or redistribution.
