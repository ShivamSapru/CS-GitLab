import os
import re
import time
import json
import uuid
import httpx
import tempfile
import pandas as pd
import ffmpeg

from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional
from fastapi import APIRouter, UploadFile, File, Form, Query, Request, Depends, BackgroundTasks, Header, HTTPException
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from dotenv import load_dotenv
from asyncio import Queue
import asyncio

from starlette.middleware.sessions import SessionMiddleware
import secrets

from backend.database.models import TranscriptionProject, User, Notification
from backend.database.db import SessionLocal
from sqlalchemy.orm import Session
from datetime import datetime, timezone



load_dotenv()

router = APIRouter()
temp_dir = tempfile.mkdtemp()
completed_transcriptions = {}

# Store active SSE connections
active_connections: Dict[str, Queue] = {}


# --- DB Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Environment variables
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION")
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_BLOB_CONTAINER = os.getenv("AZURE_STORAGE_CONTAINER_NAME")
BATCH_ENDPOINT = os.getenv("BATCH_ENDPOINT").replace("AZURE_SPEECH_REGION", AZURE_SPEECH_REGION)
GET_ENDPOINT_TEMPLATE = os.getenv("GET_ENDPOINT_TEMPLATE").replace("AZURE_SPEECH_REGION", AZURE_SPEECH_REGION)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Locale mappings
df = pd.read_csv(DATA_DIR / "locale_language_table.csv")
LOCALE_LANGUAGES = dict(zip(df['Locale (BCP-47)'], df['Language']))

with open(DATA_DIR / "candidate_locales.json", "r", encoding="utf-8") as f:
    candidate_locales = json.load(f)

CANDIDATE_LOCALES = list(candidate_locales.keys())

# Endpoint to get the supported locales
@router.get("/locales")
def get_locales() -> Dict[str, str]:
    return LOCALE_LANGUAGES

@router.get("/transcription-status-check/{project_id}")
async def check_transcription_status(project_id: str, request: Request, db: Session = Depends(get_db)):
    """Check if transcription is completed"""

    # Check if we have a completion status in memory first
    if project_id in completed_transcriptions:
        result = completed_transcriptions[project_id]
        # Clean up old entries (optional)
        if (datetime.now(timezone.utc) - result["timestamp"]).total_seconds() > 3600:  # 1 hour
            del completed_transcriptions[project_id]
        return result

    # Check database status
    user, user_id = get_or_create_user(db, request)
    project = db.query(TranscriptionProject).filter_by(
        project_id=project_id,
        user_id=user_id
    ).first()

    if not project:
        return {"status": "Not Found", "message": "Project not found"}

    # Return the actual filename from database
    return {
        "status": project.status,
        "message": f"Transcription is {project.status.lower()}",
        "filename": getattr(project, 'local_filename', None) or getattr(project, 'subtitle_file_url', None)
    }

# Convert mono audio, 16kHz WAV
def convert_to_wav(input_path, output_path):
    ffmpeg.input(input_path).output(
        output_path, format='wav', acodec='pcm_s16le', ac=1, ar='16000'
    ).overwrite_output().run(quiet=True)
    return output_path

# Format output to SRT/VTT
def convert_to_srt(segments, output_format):
    srt_output = "WEBVTT\n\n" if output_format == "vtt" else ""

    for i, seg in enumerate(segments, 1):
        start_sec = seg.get('offsetInTicks', 0) / 1e7
        end_sec = (seg.get('offsetInTicks', 0) + seg.get('durationInTicks', 0)) / 1e7

        start = str(timedelta(seconds=start_sec))[:11]
        end = str(timedelta(seconds=end_sec))[:11]

        if output_format == "srt":
            start = start.replace('.', ',')
            end = end.replace('.', ',')

        text = seg.get("nBest", [{}])[0].get("display", "")
        srt_output += f"{i}\n{start} --> {end}\n{text}\n\n"

    return srt_output

# Create transcription job
def create_transcription_job(audio_url: str, censor_profanity="False", max_speakers=2, locale="en-US"):
    payload = {
        "displayName": f"Transcription_{uuid.uuid4()}",
        "locale": locale,
        "contentUrls": [audio_url],
        "properties": {
            "wordLevelTimestampsEnabled": True,
            "punctuationMode": "DictatedAndAutomatic",
            "timeToLiveHours": 6,
            "languageIdentification": {
                "candidateLocales": CANDIDATE_LOCALES,
                "mode": "Continuous"
            },
            "diarization": {
                "enabled": True,
                "maxSpeakers": max_speakers
            }
        }
    }
    if censor_profanity:
        payload["properties"]["profanityFilterMode"] = "Masked"

    headers = {"Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY}
    response = httpx.post(BATCH_ENDPOINT, headers=headers, json=payload)
    response.raise_for_status()
    job_url = response.json()["self"]
    job_id = job_url.split("/")[-1].split("?")[0]
    return job_id

# Poll for status
def poll_transcription_result(job_id: str, timeout_sec=300):
    headers = {"Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY}
    for _ in range(timeout_sec // 10):
        response = httpx.get(GET_ENDPOINT_TEMPLATE + job_id, headers=headers)
        data = response.json()
        print("Transcription Status:", data["status"])
        if data["status"] == "Succeeded":
            return data["links"]["files"]
        elif data["status"] == "Failed":
            raise Exception("Transcription failed.")
        time.sleep(10)
    raise TimeoutError("Polling timed out.")

# Fetch transcription JSON
def get_transcription_file(files_url: str):
    headers = {"Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY}
    response = httpx.get(files_url, headers=headers)
    data = response.json()
    transcript_url = next((f["links"]["contentUrl"] for f in data["values"] if f["kind"] == "Transcription"), None)
    if not transcript_url:
        raise Exception("No transcript found.")
    transcript_json = httpx.get(transcript_url).json()
    return transcript_json.get("recognizedPhrases", [])

async def send_sse_update(project_id: str, data: dict):
    """Send update to SSE connection with better error handling"""
    print(f"📤 Attempting to send SSE update to {project_id}: {data.get('status', 'unknown')}")
    print(f"📊 Active connections check: {project_id in active_connections}")
    print(f"📊 All active connections: {list(active_connections.keys())}")

    # More robust check
    connection = active_connections.get(project_id)
    if connection is not None:
        try:
            # Try to put the data with a timeout
            await asyncio.wait_for(connection.put(data), timeout=5.0)
            print(f"✅ SSE update sent successfully to {project_id}")
        except asyncio.TimeoutError:
            print(f"⏱️ SSE update timeout for {project_id}")
            # Remove stale connection
            active_connections.pop(project_id, None)
        except Exception as e:
            print(f"❌ Failed to send SSE update to {project_id}: {e}")
            # Remove failed connection
            active_connections.pop(project_id, None)
    else:
        print(f"⚠️ No active SSE connection found for project {project_id}")

# Simple user helper
def get_or_create_user(db: Session, request: Request = None):
    """Get user from session or create a default user"""
    user = None
    user_id = None

    # Try to get user from session first
    if hasattr(request, 'session') and request and 'user' in request.session:
        session_user = request.session['user']
        user_email = session_user.get('email')

        if user_email:
            user = db.query(User).filter(User.email == user_email).first()
            if user:
                user_id = user.user_id
                print(f"Found session user: {user.email}")

    # If no session user, create/use guest user
    if not user:
        print("No session user found, using guest user")
        default_email = "guest@transcription.app"
        user = db.query(User).filter(User.email == default_email).first()

        if not user:
            user = User(
                user_id=str(uuid.uuid4()),
                email=default_email,
                name="Guest User"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        user_id = user.user_id

    return user, user_id

def monitor_transcription_job(job_id, project_id, user_id, file_name, output_format):
    """Background task to monitor transcription - simplified approach"""
    try:
        print(f"🚀 Starting monitoring for project {project_id}")

        db = SessionLocal()

        # Poll for Azure transcription results
        files_url = poll_transcription_result(job_id)
        phrases = get_transcription_file(files_url)

        # Generate subtitle file content
        subtitle_content = convert_to_srt(phrases, output_format)

        # Save to local file
        safe_name = re.sub(r'[^\w\-_.]', '_', file_name)
        out_name = f"{safe_name}.{output_format}"
        out_path = os.path.join(temp_dir, out_name)

        with open(out_path, "w", encoding="utf-8") as f:
            f.write(subtitle_content)

        # Save to Azure for backup
        try:
            blob_service = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
            blob_name = os.path.basename(out_path)
            blob_client = blob_service.get_blob_client(container=AZURE_BLOB_CONTAINER, blob=blob_name)
            with open(out_path, "rb") as data:
                blob_client.upload_blob(data, overwrite=True)

            sas_token = generate_blob_sas(
                account_name=blob_service.account_name,
                container_name=AZURE_BLOB_CONTAINER,
                blob_name=blob_name,
                account_key=blob_service.credential.account_key,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.now(timezone.utc) + timedelta(hours=24)
            )
            subtitle_file_url = f"https://{blob_service.account_name}.blob.core.windows.net/{AZURE_BLOB_CONTAINER}/{blob_name}?{sas_token}"
        except Exception as azure_error:
            print(f"Azure upload failed: {azure_error}")
            subtitle_file_url = None

        # Update database
        project = db.query(TranscriptionProject).filter_by(project_id=project_id).first()
        if project:
            project.status = "Completed"
            project.subtitle_file_url = subtitle_file_url
            project.local_filename = out_name
            db.commit()

        # Create notification
        notif = Notification(
            creation_time=datetime.now(timezone.utc),
            user_id=user_id,
            project_id=project_id,
            project_status="Completed",
            message="Your transcription is ready.",
            is_read=False
        )
        db.add(notif)
        db.commit()

        # Store completion status for polling
        completed_transcriptions[project_id] = {
            "status": "Completed",
            "message": "Transcription completed successfully!",
            "filename": out_name,
            "timestamp": datetime.now(timezone.utc)
        }

        print(f"✅ Transcription completed successfully: {out_path}")
        db.close()

    except Exception as e:
        print(f"❌ Background task failed: {str(e)}")
        import traceback
        traceback.print_exc()

        # Store error status
        completed_transcriptions[project_id] = {
            "status": "Failed",
            "message": f"Transcription failed: {str(e)}",
            "timestamp": datetime.now(timezone.utc)
        }

        db = SessionLocal()
        project = db.query(TranscriptionProject).filter_by(project_id=project_id).first()
        if project:
            project.status = "Failed"
            db.commit()

        notif = Notification(
            creation_time=datetime.now(timezone.utc),
            user_id=user_id,
            project_id=project_id,
            project_status="Failed",
            message=f"Transcription failed: {str(e)}",
            is_read=False
        )
        db.add(notif)
        db.commit()
        db.close()

# MAIN TRANSCRIPTION ENDPOINT - Simplified hybrid approach
@router.post("/transcribe")
async def transcribe_audio_video(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    locale: str = Form(...),
    max_speakers: int = Form(...),
    censor_profanity: bool = Form(...),
    output_format: str = Form("srt"),
    db: Session = Depends(get_db)
):
    try:
        print(f"🎯 Starting transcription for: {file.filename}")

        # Get or create user
        user, user_id = get_or_create_user(db, request)

        if output_format not in ["srt", "vtt"]:
            return JSONResponse(status_code=400, content={"error": "Invalid output format."})

        # Process file
        base_name, _ = os.path.splitext(file.filename)
        safe_name = re.sub(r'[^\w\-_.]', '_', base_name)
        input_path = os.path.join(temp_dir, f"{safe_name}_input_{uuid.uuid4().hex[:8]}.{file.filename.split('.')[-1]}")

        with open(input_path, "wb") as f:
            f.write(await file.read())

        # Convert to WAV
        wav_path = os.path.join(temp_dir, f"{safe_name}_converted_{uuid.uuid4().hex[:8]}.wav")
        convert_to_wav(input_path, wav_path)

        # Upload to Azure for transcription
        blob_service = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
        blob_name = f"input_{uuid.uuid4().hex}_{os.path.basename(wav_path)}"
        blob_client = blob_service.get_blob_client(container=AZURE_BLOB_CONTAINER, blob=blob_name)

        with open(wav_path, "rb") as data:
            blob_client.upload_blob(data, overwrite=True)

        # Generate SAS token
        sas_token = generate_blob_sas(
            account_name=blob_service.account_name,
            container_name=AZURE_BLOB_CONTAINER,
            blob_name=blob_name,
            account_key=blob_service.credential.account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.now(timezone.utc) + timedelta(hours=2)
        )
        audio_url = f"https://{blob_service.account_name}.blob.core.windows.net/{AZURE_BLOB_CONTAINER}/{blob_name}?{sas_token}"

        # Start Azure transcription
        job_id = create_transcription_job(audio_url, censor_profanity, max_speakers, locale)

        # Create database record
        tag = " and Censored" if censor_profanity else ""
        file_name = f"{base_name} (Transcribed{tag}).{locale}"

        project = TranscriptionProject(
            user_id=user_id,
            status="In Progress",
            created_at=datetime.now(timezone.utc),
            subtitle_file_url=None,
        )
        db.add(project)
        db.commit()
        db.refresh(project)

        background_tasks.add_task(
            monitor_transcription_job,
            job_id,
            project.project_id,
            user_id,
            file_name,
            output_format
        )

        # Clean up input files
        try:
            os.remove(input_path)
            os.remove(wav_path)
        except:
            pass

        return {
            "message": "Transcription job started.",
            "project_id": project.project_id,
            "transcribed_filename": f"{file_name}.{output_format}",
            "user_id": user_id
        }

    except Exception as e:
        print(f"❌ Transcription error: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": f"Transcription failed: {str(e)}"})

# Download endpoint - handles both local and Azure files
@router.get("/download-transcription")
async def download_transcribed_file(
    request: Request,
    filename: str = Query(..., description="Name of the transcribed subtitle file to download"),
    db: Session = Depends(get_db)
):
    try:
        user, user_id = get_or_create_user(db, request)

        print(f"🔍 Download request for: {filename} by user: {user.email}")

        # Method 1: Try to find exact local file
        file_path = os.path.join(temp_dir, filename)
        if os.path.exists(file_path):
            print(f"✅ Found exact local file: {file_path}")
            return FileResponse(
                path=file_path,
                media_type="application/octet-stream",
                filename=filename,
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )

        # Method 2: Find in database by user and match filename pattern
        projects = db.query(TranscriptionProject).filter(
            TranscriptionProject.user_id == user_id,
            TranscriptionProject.status == "Completed"
        ).all()

        print(f"🔍 Found {len(projects)} completed projects for user")

        # Try to match by partial filename
        for project in projects:
            if hasattr(project, 'local_filename') and project.local_filename:
                local_path = os.path.join(temp_dir, project.local_filename)
                if os.path.exists(local_path):
                    # Check if the requested filename matches the project's file
                    if (filename in project.local_filename or
                        project.local_filename in filename or
                        filename.replace('.srt', '').replace('.vtt', '') in project.local_filename):
                        print(f"✅ Found matching project file: {local_path}")
                        return FileResponse(
                            path=local_path,
                            media_type="application/octet-stream",
                            filename=filename,
                            headers={"Content-Disposition": f"attachment; filename={filename}"}
                        )

        # Method 3: Try Azure URL if available
        for project in projects:
            if project.subtitle_file_url:
                try:
                    print(f"⬇️ Trying Azure download for project {project.project_id}")
                    import httpx
                    async with httpx.AsyncClient() as client:
                        response = await client.get(project.subtitle_file_url)
                        if response.status_code == 200:
                            print("✅ Azure download successful")
                            from fastapi.responses import Response
                            return Response(
                                content=response.content,
                                media_type="application/octet-stream",
                                headers={"Content-Disposition": f"attachment; filename={filename}"}
                            )
                except Exception as e:
                    print(f"⚠️ Azure download failed: {e}")
                    continue

        # Method 4: Fuzzy search in temp directory
        import glob
        pattern_searches = [
            os.path.join(temp_dir, f"*{filename}*"),
            os.path.join(temp_dir, f"*{filename.split('.')[0]}*"),
        ]

        for pattern in pattern_searches:
            matching_files = glob.glob(pattern)
            if matching_files:
                actual_file = matching_files[0]
                print(f"✅ Found fuzzy match: {actual_file}")
                return FileResponse(
                    path=actual_file,
                    media_type="application/octet-stream",
                    filename=filename,
                    headers={"Content-Disposition": f"attachment; filename={filename}"}
                )

        # Debug: List all files in temp directory
        temp_files = os.listdir(temp_dir) if os.path.exists(temp_dir) else []
        print(f"📁 Available temp files: {temp_files[:10]}")  # Show first 10

        return JSONResponse(
            status_code=404,
            content={
                "error": "File not found",
                "debug": {
                    "requested_filename": filename,
                    "user_id": user_id,
                    "projects_found": len(projects),
                    "temp_files_count": len(temp_files)
                }
            }
        )

    except Exception as e:
        print(f"❌ Download error: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": f"Download failed: {str(e)}"}
        )

# Status endpoint
@router.get("/transcription-status/{project_id}")
async def get_transcription_status(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    try:
        user, user_id = get_or_create_user(db, request)

        project = db.query(TranscriptionProject).filter_by(
            project_id=project_id,
            user_id=user_id
        ).first()

        if not project:
            return JSONResponse(status_code=404, content={"error": "Project not found"})

        response_data = {
            "project_id": project.project_id,
            "status": project.status,
            "created_at": project.created_at.isoformat(),
        }

        if project.status == "Completed":
            # Generate a reasonable filename
            filename = getattr(project, 'local_filename', f"transcription_{project_id[:8]}.srt")
            response_data.update({
                "subtitle_file_url": project.subtitle_file_url,
                "filename": filename
            })

        return response_data

    except Exception as e:
        print(f"❌ Status check error: {str(e)}")
        return JSONResponse(status_code=500, content={"error": f"Status check failed: {str(e)}"})

# Notifications endpoints
@router.get("/notifications")
def get_notifications(request: Request, db: Session = Depends(get_db)):
    try:
        user, user_id = get_or_create_user(db, request)
        notifications = db.query(Notification).filter_by(user_id=user_id).order_by(
            Notification.creation_time.desc()
        ).limit(10).all()
        return notifications
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/notifications/mark-read")
def mark_notifications_read(request: Request, db: Session = Depends(get_db)):
    try:
        user, user_id = get_or_create_user(db, request)
        db.query(Notification).filter_by(user_id=user_id, is_read=False).update({"is_read": True})
        db.commit()
        return {"message": "All notifications marked as read."}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# Test endpoint
@router.get("/test-auth")
async def test_auth(request: Request, db: Session = Depends(get_db)):
    user, user_id = get_or_create_user(db, request)
    return {
        "user_id": user_id,
        "user_email": user.email,
        "authenticated": True
    }
