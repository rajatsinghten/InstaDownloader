# InstaDownloader

A web application to download Instagram Reels, Photos, and Videos.

## Features

- Download Reels, Videos, Photos and Carousel posts
- Session-based authentication for private and restricted content
- Media preview before downloading
- Support for frontend (Vercel) and backend (Render) deployment

## Quick Start (Local Setup)

### Prerequisites

- Python 3.10 or higher
- An Instagram account

### 1. Installation

Clone the repository and install the backend dependencies:

```bash
git clone https://github.com/repository/InstaDownloader.git
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

To download content, you need to provide your Instagram session cookie:

1. Log into instagram.com in your web browser.
2. Open Developer Tools and navigate to the Cookies section under Application/Storage.
3. Copy the value of the `sessionid` cookie.
4. On the InstaDownloader webpage, click Setup and paste your session ID.

## Deployment

### Frontend (Vercel)

1. Import the repository into Vercel.
2. Vercel will automatically detect `vercel.json` and deploy from the `frontend` directory.
3. Edit `frontend/js/config.js` to point to your deployed backend API URL.

### Backend (Render)

1. Create a new Web Service on Render and connect the repository.
2. Render will automatically detect `render.yaml`.
3. Set the Environment Variable `PYTHON_VERSION` to `3.11`.

## Legal Disclaimer

This software is for personal use only. Users are responsible for complying with Instagram's Terms of Service and respecting the copyright of content creators. Do not use this tool for mass scraping or redistribution.
