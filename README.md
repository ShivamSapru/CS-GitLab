# Subtitle Translator App

A full-stack platform to translate both static subtitle files and real-time captions from live events.

## Features
- Upload .srt/.vtt and translate
- Real-time integration with Zoom/MS Teams
- Web-based editor and export tools

## Tech Stack
- React.js, FastAPI, WebSockets
- Azure + Docker + PostgreSQL

## Authentication Setup

This app supports two types of login:

- **Google OAuth 2.0 Login**
- **Email + Password Login**

Both use secure cookie-based sessions maintained using FastAPI’s `SessionMiddleware`.

### Step 1: Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project (or create a new one).
3. Navigate to: `APIs & Services > Credentials`.
4. Click **Create Credentials > OAuth client ID**.
5. Choose **Web application**.
6. Under **Authorized JavaScript origins**, add: http://localhost:3000
7. Under **Authorized redirect URIs**, add: http://localhost:8000/auth/callback
8. Save and copy:
- **Client ID**
- **Client Secret**

Add these to your `.env` file:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Step 2: Secret Session key
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```
Add this to your .env file:
```env
SESSION_SECRET_KEY=your-generated-secret-key
```

## Running the Project

### Start the backend
```bash
cd backend
uvicorn main:app --reload
```

### Start the frontend
```bash
cd frontend
npm install
npm run dev
```