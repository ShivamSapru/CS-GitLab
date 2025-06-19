# Subtitle Translator App

A full-stack platform to translate both static subtitle files and real-time captions from live events.

## Features

- Upload and translate `.srt` and `.vtt` subtitle files
- Real-time translation of live captions (Zoom, MS Teams)
- Web-based subtitle editor and download tools
- Multi-language support and profanity filter

## Tech Stack

- Frontend: React.js
- Backend: FastAPI + WebSockets
- Translation: Azure AI Translator
- Storage: PostgreSQL
- Deployment: Docker

---

## 🛠️ Getting Started

### Step 0: Create Your Environment File

1. Copy the example environment configuration:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and insert the necessary credentials using the steps below.

---

## 🔐 Authentication Setup

This app supports two types of login:

* **Google OAuth 2.0 Login**
* **Email + Password Login**

FastAPI sessions are secured using cookie-based sessions via `SessionMiddleware`.

### Step 1: Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project (or create a new one).
3. Navigate to: `APIs & Services > Credentials`.
4. Click **Create Credentials > OAuth client ID**.
5. Choose **Web application**.
6. Under **Authorized JavaScript origins**, add:

   * `http://localhost:3000`
7. Under **Authorized redirect URIs**, add:

   * `http://localhost:8000/auth/callback`
8. Save and copy:

   * **Client ID**
   * **Client Secret**

Add these to your `.env` file:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

---

### Step 2: Session Secret Key

Generate a secure key:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Add this to your `.env` file:

```env
SESSION_SECRET_KEY=your_generated_secret_key
```

---

## 🌐 Azure AI Translator Setup

To enable subtitle translation:

1. Go to [Azure Portal](https://portal.azure.com/).
2. Navigate to **Create a resource > AI + Machine Learning > Translator**.
3. Fill in the required fields:

   * **Resource Name**: e.g., `subtitle-translator-api`
   * **Region**: e.g., `northeurope`
   * **Pricing Tier**: Choose **F0 (free)** or **S1 (standard)**
4. Click **Review + Create**, then **Create**.
5. Once the resource is created:

   * Go to **Keys and Endpoint**
   * Copy:

     * **Key 1**
     * **Region**
     * **Endpoint** (e.g., `https://api.cognitive.microsofttranslator.com/`)

Add these to your `.env` file:

```env
AZURE_SUBSCRIPTION_KEY=your_key_1
AZURE_REGION=your_region
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com
AZURE_LANGUAGES_URL=https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation
```

---

## ▶️ Running the Project

### Start the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Start the Frontend

```bash
cd frontend
npm install
npm run dev
```
