# 🎬 Subtitle Translator App

A web application that translates subtitles in real-time for Zoom/Teams events and static files using large language models (LLMs).

## Features
- Upload subtitle files (.srt/.vtt) and translate to multiple languages
- Real-time translation for live captions
- Download translated subtitles or transcripts
- Secure and accessible UI

## Tech Stack
- Frontend: React.js
- Backend: FastAPI
- Translation: OpenAI / HuggingFace / Azure Translator
- CI/CD: GitHub Actions + Azure Pipelines
- Deployment: Azure App Services

## Setup

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
