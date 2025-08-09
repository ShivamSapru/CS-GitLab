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
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse, Response
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
async def check_status_with_fallback(project_id: str, request: Request, db: Session = Depends(get_db)):
    """Status check with media_url fallback logic"""
    try:
        print(f"🔍 Status check for: {project_id}")

        project = db.query(TranscriptionProject).filter_by(project_id=project_id).first()

        if not project:
            return {"status": "Not Found", "message": "Project not found"}

        response = {
            "status": project.status,
            "message": f"Transcription is {project.status.lower()}",
        }

        # Add media_url - use proxy URL regardless of database state
        if project.status == "Completed":
            # Always provide proxy URL for completed projects
            proxy_url = f"http://localhost:8000/api/proxy-media/{project_id}"
            response["media_url"] = proxy_url
            print(f"✅ Added proxy media_url: {proxy_url}")

        # Add other fields
        if hasattr(project, 'filename') and project.filename:
            response["filename"] = project.filename

        if hasattr(project, 'subtitle_file_url') and project.subtitle_file_url:
            response["subtitle_file_url"] = project.subtitle_file_url

        return response

    except Exception as e:
        print(f"❌ Status check error: {str(e)}")
        return {"status": "Error", "message": str(e)}

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
    """Get user from session or create a default user - FIXED"""
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
            # FIX: Use the correct field names from your User model
            user = User(
                user_id=str(uuid.uuid4()),
                email=default_email,
                display_name="Guest User",  # ← CHANGED: name -> display_name
                password_hash="guest_user_no_password",  # ← ADDED: required field
                role="guest"  # ← ADDED: optional but good to have
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        user_id = user.user_id

    return user, user_id

def monitor_transcription_job(job_id, project_id, user_id, file_name, output_format, locale="en-US"):
    """Background task to monitor transcription with custom filename format"""
    try:
        print(f"🚀 Starting monitoring for project {project_id}")

        db = SessionLocal()

        # Poll for Azure transcription results
        files_url = poll_transcription_result(job_id)
        phrases = get_transcription_file(files_url)

        # Generate subtitle file content
        subtitle_content = convert_to_srt(phrases, output_format)

        # UPDATED: Create filename in new format: filename_transcribed_.locale.extension
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]

        # Clean the original filename and remove any extensions
        safe_name = re.sub(r'[^\w\-_.]', '_', file_name)
        # Remove common video/audio extensions to get base name
        base_name = re.sub(r'\.(mp4|mov|avi|mkv|webm|mp3|wav|m4a|flac)$', '', safe_name, flags=re.IGNORECASE)

        # Create the new filename format: basename_transcribed_.locale.extension
        out_name = f"{base_name}_transcribed_.{locale}.{output_format}"
        out_path = os.path.join(temp_dir, out_name)

        print(f"💾 Saving subtitle file: {out_name}")

        with open(out_path, "w", encoding="utf-8") as f:
            f.write(subtitle_content)

        # Save to Azure for backup with organized structure
        try:
            blob_service = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
            # UPDATED: Use organized blob name
            blob_name = f"subtitles/{project_id}_{out_name}"
            blob_client = blob_service.get_blob_client(container=AZURE_BLOB_CONTAINER, blob=blob_name)
            with open(out_path, "rb") as data:
                blob_client.upload_blob(data, overwrite=True)

            # UPDATED: Longer expiry for production use
            sas_token = generate_blob_sas(
                account_name=blob_service.account_name,
                container_name=AZURE_BLOB_CONTAINER,
                blob_name=blob_name,
                account_key=blob_service.credential.account_key,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.now(timezone.utc) + timedelta(days=7)  # 7 days instead of 48 hours
            )
            subtitle_file_url = f"https://{blob_service.account_name}.blob.core.windows.net/{AZURE_BLOB_CONTAINER}/{blob_name}?{sas_token}"
            print(f"✅ Azure backup saved: {blob_name}")

        except Exception as azure_error:
            print(f"⚠️ Azure upload failed (continuing anyway): {azure_error}")
            subtitle_file_url = None

        # Update database
        project = db.query(TranscriptionProject).filter_by(project_id=project_id).first()
        if project:
            project.status = "Completed"
            project.subtitle_file_url = subtitle_file_url
            project.filename = out_name  # UPDATED: Store the new filename format
            project.updated_at = datetime.now(timezone.utc)  # Add timestamp
            db.commit()
            print(f"✅ Database updated with filename: {out_name}")

        # UPDATED: Better notification message
        notif = Notification(
            creation_time=datetime.now(timezone.utc),
            user_id=user_id,
            project_id=project_id,
            project_status="Completed",
            message=f"Transcription completed: {base_name} ({locale})",
            is_read=False
        )
        db.add(notif)
        db.commit()

        # UPDATED: Store completion status with all necessary info
        completed_transcriptions[project_id] = {
            "status": "Completed",
            "message": "Transcription completed successfully!",
            "filename": out_name,
            "media_url": f"http://localhost:8000/api/proxy-media/{project_id}",  # Include proxy URL
            "subtitle_file_url": subtitle_file_url,
            "timestamp": datetime.now(timezone.utc)
        }

        print(f"🎉 Transcription completed successfully: {out_name}")
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

        # Update database with error
        db = SessionLocal()
        try:
            project = db.query(TranscriptionProject).filter_by(project_id=project_id).first()
            if project:
                project.status = "Failed"
                project.updated_at = datetime.now(timezone.utc)
                db.commit()

            # Create failure notification
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
        except Exception as db_error:
            print(f"❌ Failed to update database with error: {db_error}")
        finally:
            db.close()

# MAIN TRANSCRIPTION ENDPOINT - Simplified hybrid approach
# Fixed version of your transcription endpoint with proper error handling

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
        print(f"📊 File info: size={file.size}, type={file.content_type}")

        # Validate environment variables first
        required_env_vars = [
            "AZURE_SPEECH_KEY",
            "AZURE_SPEECH_REGION",
            "AZURE_STORAGE_CONNECTION_STRING",
            "AZURE_STORAGE_CONTAINER_NAME"
        ]

        missing_vars = []
        for var in required_env_vars:
            if not os.getenv(var):
                missing_vars.append(var)

        if missing_vars:
            error_msg = f"Missing environment variables: {', '.join(missing_vars)}"
            print(f"❌ {error_msg}")
            return JSONResponse(
                status_code=500,
                content={"error": f"Server configuration error: {error_msg}"}
            )

        # Get or create user
        try:
            user, user_id = get_or_create_user(db, request)
            print(f"✅ User: {user.email}")
        except Exception as user_error:
            print(f"❌ User creation error: {user_error}")
            return JSONResponse(
                status_code=500,
                content={"error": f"User authentication error: {str(user_error)}"}
            )

        # Validate output format
        if output_format not in ["srt", "vtt"]:
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid output format. Must be 'srt' or 'vtt'"}
            )

        # Validate file
        if not file.filename:
            return JSONResponse(
                status_code=400,
                content={"error": "No filename provided"}
            )

        # Check file size (limit to 500MB)
        if file.size and file.size > 500 * 1024 * 1024:
            return JSONResponse(
                status_code=400,
                content={"error": "File too large. Maximum size is 500MB"}
            )

        # Process file names
        base_name, file_ext = os.path.splitext(file.filename)
        safe_name = re.sub(r'[^\w\-_.]', '_', base_name)
        unique_id = uuid.uuid4().hex[:8]

        # Create input file path
        input_filename = f"{safe_name}_input_{unique_id}{file_ext}"
        input_path = os.path.join(temp_dir, input_filename)

        print(f"📁 Saving file to: {input_path}")

        # Save uploaded file
        try:
            file_content = await file.read()
            print(f"📊 Read {len(file_content)} bytes from upload")

            with open(input_path, "wb") as f:
                f.write(file_content)

            print(f"✅ File saved successfully")

            # Verify file was written
            if not os.path.exists(input_path):
                raise Exception("File was not saved properly")

            file_size = os.path.getsize(input_path)
            print(f"📊 Saved file size: {file_size} bytes")

        except Exception as file_error:
            print(f"❌ File save error: {file_error}")
            return JSONResponse(
                status_code=500,
                content={"error": f"Failed to save uploaded file: {str(file_error)}"}
            )

        # Initialize Azure Blob Service
        try:
            blob_service = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
            print("✅ Azure Blob Service initialized")
        except Exception as azure_error:
            print(f"❌ Azure initialization error: {azure_error}")
            return JSONResponse(
                status_code=500,
                content={"error": f"Azure storage initialization failed: {str(azure_error)}"}
            )

        # Upload original file to Azure for media preview
        try:
            blob_name_original = f"input_{unique_id}_{os.path.basename(input_path)}"
            blob_client_original = blob_service.get_blob_client(
                container=AZURE_BLOB_CONTAINER,
                blob=blob_name_original
            )

            with open(input_path, "rb") as data:
                blob_client_original.upload_blob(data, overwrite=True)

            # Generate SAS token for media preview
            sas_token_original = generate_blob_sas(
                account_name=blob_service.account_name,
                container_name=AZURE_BLOB_CONTAINER,
                blob_name=blob_name_original,
                account_key=blob_service.credential.account_key,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.now(timezone.utc) + timedelta(hours=48)
            )

            media_url = f"https://{blob_service.account_name}.blob.core.windows.net/{AZURE_BLOB_CONTAINER}/{blob_name_original}?{sas_token_original}"
            print(f"✅ Original file uploaded for preview: {blob_name_original}")

        except Exception as upload_error:
            print(f"❌ Azure upload error: {upload_error}")
            return JSONResponse(
                status_code=500,
                content={"error": f"Failed to upload file to Azure: {str(upload_error)}"}
            )

        # Convert to WAV for transcription
        try:
            wav_filename = f"{safe_name}_converted_{unique_id}.wav"
            wav_path = os.path.join(temp_dir, wav_filename)

            print(f"🔄 Converting to WAV: {wav_path}")
            convert_to_wav(input_path, wav_path)

            if not os.path.exists(wav_path):
                raise Exception("WAV conversion failed - output file not created")

            wav_size = os.path.getsize(wav_path)
            print(f"✅ WAV conversion complete: {wav_size} bytes")

        except Exception as conv_error:
            print(f"❌ WAV conversion error: {conv_error}")
            # Clean up input file
            try:
                os.remove(input_path)
            except:
                pass
            return JSONResponse(
                status_code=500,
                content={"error": f"Audio conversion failed: {str(conv_error)}"}
            )

        # Upload WAV file to Azure for transcription
        try:
            blob_name_wav = f"wav_{unique_id}_{os.path.basename(wav_path)}"
            blob_client_wav = blob_service.get_blob_client(
                container=AZURE_BLOB_CONTAINER,
                blob=blob_name_wav
            )

            with open(wav_path, "rb") as data:
                blob_client_wav.upload_blob(data, overwrite=True)

            # Generate SAS token for transcription
            sas_token_wav = generate_blob_sas(
                account_name=blob_service.account_name,
                container_name=AZURE_BLOB_CONTAINER,
                blob_name=blob_name_wav,
                account_key=blob_service.credential.account_key,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.now(timezone.utc) + timedelta(hours=6)
            )

            audio_url = f"https://{blob_service.account_name}.blob.core.windows.net/{AZURE_BLOB_CONTAINER}/{blob_name_wav}?{sas_token_wav}"
            print(f"✅ WAV file uploaded for transcription: {blob_name_wav}")

        except Exception as wav_upload_error:
            print(f"❌ WAV upload error: {wav_upload_error}")
            # Clean up files
            try:
                os.remove(input_path)
                os.remove(wav_path)
            except:
                pass
            return JSONResponse(
                status_code=500,
                content={"error": f"Failed to upload audio for transcription: {str(wav_upload_error)}"}
            )

        # Start Azure transcription job
        try:
            print(f"🚀 Starting Azure transcription job")
            job_id = create_transcription_job(audio_url, censor_profanity, max_speakers, locale)
            print(f"✅ Transcription job started: {job_id}")

        except Exception as job_error:
            print(f"❌ Transcription job error: {job_error}")
            # Clean up files
            try:
                os.remove(input_path)
                os.remove(wav_path)
            except:
                pass
            return JSONResponse(
                status_code=500,
                content={"error": f"Failed to start transcription job: {str(job_error)}"}
            )

        # Create database record
        try:
            project = TranscriptionProject(
                user_id=user_id,
                status="In Progress",
                created_at=datetime.now(timezone.utc),
                subtitle_file_url=None,
                media_url=media_url
            )
            db.add(project)
            db.commit()
            db.refresh(project)
            print(f"✅ Database record created: {project.project_id}")
            print(f"   Project ID: {project.project_id}")
            print(f"   Media URL in object: {media_url}")
            print(f"   Media URL stored: {getattr(project, 'media_url', 'ATTRIBUTE_MISSING')}")

        except Exception as db_error:
            print(f"❌ Database error: {db_error}")
            # Clean up files
            try:
                os.remove(input_path)
                os.remove(wav_path)
            except:
                pass
            return JSONResponse(
                status_code=500,
                content={"error": f"Database error: {str(db_error)}"}
            )

        # Setup background monitoring
        try:
            tag = " and Censored" if censor_profanity else ""
            file_name = f"{base_name} (Transcribed{tag}).{locale}"

            background_tasks.add_task(
                monitor_transcription_job,
                job_id,
                project.project_id,
                user_id,
                file.filename,
                output_format,
                locale
            )
            print(f"✅ Background task scheduled")

        except Exception as bg_error:
            print(f"❌ Background task error: {bg_error}")
            # Update project status to failed
            try:
                project.status = "Failed"
                db.commit()
            except:
                pass
            return JSONResponse(
                status_code=500,
                content={"error": f"Failed to schedule background task: {str(bg_error)}"}
            )

        # Clean up local files
        try:
            os.remove(input_path)
            os.remove(wav_path)
            print("✅ Local files cleaned up")
        except Exception as cleanup_error:
            print(f"⚠️ Cleanup warning: {cleanup_error}")
            # Don't fail the request for cleanup issues

        print(f"🎉 Transcription request completed successfully")

        return {
            "message": "Transcription job started successfully.",
            "project_id": project.project_id,
            "transcribed_filename": f"{file_name}.{output_format}",
            "user_id": user_id,
            "media_url": media_url,
            "status": "In Progress"
        }


    except Exception as e:
        print(f"❌ Unexpected transcription error: {str(e)}")
        import traceback
        traceback.print_exc()

        return JSONResponse(
            status_code=500,
            content={
                "error": f"Transcription failed: {str(e)}",
                "details": "Check server logs for more information"
            }
        )


# Also add this helper function to check environment setup
@router.get("/health-check")
async def health_check():
    """Check if all required services are properly configured"""
    try:
        issues = []

        # Check environment variables
        required_vars = [
            "AZURE_SPEECH_KEY",
            "AZURE_SPEECH_REGION",
            "AZURE_STORAGE_CONNECTION_STRING",
            "AZURE_STORAGE_CONTAINER_NAME",
            "BATCH_ENDPOINT",
            "GET_ENDPOINT_TEMPLATE"
        ]

        for var in required_vars:
            if not os.getenv(var):
                issues.append(f"Missing environment variable: {var}")

        # Check Azure Blob Storage
        try:
            blob_service = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
            container_client = blob_service.get_container_client(AZURE_BLOB_CONTAINER)
            container_client.get_container_properties()
        except Exception as azure_error:
            issues.append(f"Azure Blob Storage issue: {str(azure_error)}")

        # Check temp directory
        if not os.path.exists(temp_dir):
            try:
                os.makedirs(temp_dir, exist_ok=True)
            except Exception as temp_error:
                issues.append(f"Temp directory issue: {str(temp_error)}")

        # Check ffmpeg
        try:
            import subprocess
            result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True, timeout=5)
            if result.returncode != 0:
                issues.append("FFmpeg not available or not working")
        except Exception as ffmpeg_error:
            issues.append(f"FFmpeg check failed: {str(ffmpeg_error)}")

        if issues:
            return JSONResponse(
                status_code=500,
                content={
                    "status": "unhealthy",
                    "issues": issues
                }
            )

        return {
            "status": "healthy",
            "message": "All services are properly configured",
            "temp_dir": temp_dir,
            "azure_container": AZURE_BLOB_CONTAINER
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "error": str(e)
            }
        )

# Download endpoint - handles both local and Azure files
@router.get("/download-transcription/{project_id}")
async def download_transcription_custom_filename(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Download transcription with custom filename format"""
    try:
        print(f"🔍 Download request for project: {project_id}")

        project = db.query(TranscriptionProject).filter_by(project_id=project_id).first()

        if not project:
            return JSONResponse(
                status_code=404,
                content={"error": "Project not found"}
            )

        # Try Azure URL first
        if hasattr(project, 'subtitle_file_url') and project.subtitle_file_url:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(project.subtitle_file_url)
                    if response.status_code == 200:
                        print("✅ Azure download successful")

                        # Generate custom filename format: filename_transcribed_.locale.extension
                        filename = "transcription_transcribed_.en-US.srt"  # default

                        if hasattr(project, 'filename') and project.filename:
                            stored_filename = project.filename

                            # If it's not a URL, try to extract components
                            if not stored_filename.startswith('http'):
                                # Try to parse existing filename pattern
                                # Example: "video_transcribed_.en-US.srt" or "video__Transcribed_.en-US.srt"
                                if '_transcribed_' in stored_filename or '__Transcribed_' in stored_filename:
                                    filename = stored_filename
                                else:
                                    # Create new format from stored filename
                                    base_name = stored_filename.replace('.srt', '').replace('.vtt', '')
                                    filename = f"{base_name}_transcribed_.en-US.srt"
                            else:
                                # Fallback for URL-based filenames
                                filename = f"transcription_{project_id[:8]}_transcribed_.en-US.srt"

                        # Clean filename
                        import re
                        filename = re.sub(r'[^\w\-_.]', '_', filename)

                        from fastapi.responses import Response
                        return Response(
                            content=response.content,
                            media_type="text/plain; charset=utf-8",
                            headers={
                                "Content-Disposition": f"attachment; filename={filename}",
                                "Content-Type": "text/plain; charset=utf-8"
                            }
                        )
            except Exception as azure_error:
                print(f"❌ Azure download failed: {azure_error}")

        # Fallback to local files
        import glob
        project_files = glob.glob(os.path.join(temp_dir, f"*{project_id[:8]}*"))

        if project_files:
            actual_file = project_files[0]
            original_filename = os.path.basename(actual_file)

            # Generate custom filename format
            if '_transcribed_' in original_filename or '__Transcribed_' in original_filename:
                filename = original_filename
            else:
                # Create new format
                base_name = original_filename.replace('.srt', '').replace('.vtt', '')
                filename = f"{base_name}_transcribed_.en-US.srt"

            print(f"✅ Using local file with custom filename: {filename}")
            return FileResponse(
                path=actual_file,
                media_type="text/plain",
                filename=filename,
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )

        return JSONResponse(
            status_code=404,
            content={"error": "Transcription file not found"}
        )

    except Exception as e:
        print(f"❌ Download error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Download failed: {str(e)}"}
        )





#  fix the status check endpoint to return media_url properly
@router.get("/transcription-status-check/{project_id}")
async def check_transcription_status_fixed_user(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Status check with better user handling"""
    try:
        print(f"🔍 Status check for: {project_id}")

        # Check completed transcriptions cache first (no user filtering)
        if project_id in completed_transcriptions:
            cached_result = completed_transcriptions[project_id]
            print(f"📊 Found in cache: {list(cached_result.keys())}")

            # Always get fresh data from database for media_url
            try:
                project = db.query(TranscriptionProject).filter_by(project_id=project_id).first()
                if project and project.media_url:
                    cached_result["media_url"] = project.media_url
                    print(f"✅ Added media_url from DB to cache")
            except Exception as db_error:
                print(f"⚠️ DB lookup failed: {db_error}")

            return cached_result

        # Try to get user, but don't fail if user creation fails
        try:
            user, user_id = get_or_create_user(db, request)
            print(f"✅ User: {user_id}")
        except Exception as user_error:
            print(f"⚠️ User creation failed: {user_error}")
            user_id = None

        # First try with user filtering
        project = None
        if user_id:
            project = db.query(TranscriptionProject).filter_by(
                project_id=project_id,
                user_id=user_id
            ).first()
            print(f"📊 Project found with user filter: {project is not None}")

        # If not found with user filter, try without user filter (for guest scenarios)
        if not project:
            print("🔄 Trying without user filter...")
            project = db.query(TranscriptionProject).filter_by(project_id=project_id).first()
            print(f"📊 Project found without user filter: {project is not None}")

        if not project:
            print(f"❌ Project not found: {project_id}")
            return {"status": "Not Found", "message": "Project not found"}

        print(f"✅ Found project: {project.status}")
        print(f"   Project user: {project.user_id}")
        print(f"   Request user: {user_id}")

        # Build response with all available data
        response = {
            "status": project.status,
            "message": f"Transcription is {project.status.lower()}",
        }

        # Add media_url if it exists
        if hasattr(project, 'media_url') and project.media_url:
            response["media_url"] = project.media_url
            print(f"✅ Added media_url to response: {project.media_url[:50]}...")
        else:
            print(f"❌ No media_url in project")

        # Add filename if it exists
        if hasattr(project, 'filename') and project.filename:
            response["filename"] = project.filename
            print(f"✅ Added filename to response")

        # Add subtitle_file_url if it exists
        if hasattr(project, 'subtitle_file_url') and project.subtitle_file_url:
            response["subtitle_file_url"] = project.subtitle_file_url
            print(f"✅ Added subtitle_file_url to response")

        print(f"📊 Final response contains: {list(response.keys())}")
        return response

    except Exception as e:
        print(f"❌ Status check error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"status": "Error", "message": str(e)}

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
            # filename = getattr(project, 'local_filename', f"transcription_{project_id[:8]}.srt")
            response_data.update({
                "subtitle_file_url": project.subtitle_file_url,
                "filename": project.filename,
                "media_url": project.media_url
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


@router.get("/check-media-urls")
async def check_all_media_urls(db: Session = Depends(get_db)):
    """Check what media URLs are stored in database"""
    try:
        projects = db.query(TranscriptionProject).filter(
            TranscriptionProject.status == "Completed"
        ).order_by(TranscriptionProject.created_at.desc()).limit(10).all()

        results = []
        for project in projects:
            project_info = {
                "project_id": str(project.project_id),
                "status": project.status,
                "created_at": project.created_at.isoformat() if project.created_at else None,
            }

            # Check all possible attributes
            for attr in ['media_url', 'subtitle_file_url', 'filename']:
                if hasattr(project, attr):
                    value = getattr(project, attr)
                    if value and len(str(value)) > 100:
                        project_info[attr] = str(value)[:100] + "... (truncated)"
                    else:
                        project_info[attr] = value
                else:
                    project_info[attr] = f"MISSING_COLUMN_{attr}"

            results.append(project_info)

        return {
            "total_completed_projects": len(results),
            "projects": results,
            "cache_keys": list(completed_transcriptions.keys())
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}


@router.get("/check-database-schema")
async def check_database_schema(db: Session = Depends(get_db)):
    """Check what columns exist in transcription_projects table"""
    try:
        from sqlalchemy import text

        # Get table schema
        result = db.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'transcription_projects'
            ORDER BY ordinal_position
        """)).fetchall()

        columns = []
        for row in result:
            columns.append({
                "name": row[0],
                "type": row[1],
                "nullable": row[2]
            })

        # Also check if we have any sample data
        sample_project = db.query(TranscriptionProject).first()
        sample_data = {}

        if sample_project:
            for column in columns:
                try:
                    value = getattr(sample_project, column["name"])
                    sample_data[column["name"]] = str(value)[:100] if value else None
                except AttributeError:
                    sample_data[column["name"]] = "ATTRIBUTE_ERROR"

        return {
            "table_exists": len(columns) > 0,
            "columns": columns,
            "sample_data": sample_data,
            "has_media_url_column": any(col["name"] == "media_url" for col in columns)
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

@router.get("/proxy-media/{project_id}")
async def proxy_media_file(project_id: str, request: Request, db: Session = Depends(get_db)):
    """Proxy media file through backend to avoid CORS issues"""
    try:
        # Get project
        project = db.query(TranscriptionProject).filter_by(project_id=project_id).first()

        if not project or not project.media_url:
            return JSONResponse(status_code=404, content={"error": "Media file not found"})

        # Stream the media file from Azure
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(project.media_url)

            if response.status_code == 200:
                return StreamingResponse(
                    iter([response.content]),
                    media_type="video/mp4",
                    headers={
                        "Accept-Ranges": "bytes",
                        "Content-Length": str(len(response.content)),
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET, HEAD",
                        "Access-Control-Allow-Headers": "*"
                    }
                )
            else:
                return JSONResponse(status_code=404, content={"error": "Media file not accessible"})

    except Exception as e:
        print(f"❌ Media proxy error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/proxy-media/{project_id}")
@router.head("/proxy-media/{project_id}")
async def proxy_media_fixed(project_id: str, request: Request, db: Session = Depends(get_db)):
    """Fixed proxy with proper imports"""
    try:
        print(f"🎬 Media proxy: {request.method} for {project_id}")

        # Get project
        project = db.query(TranscriptionProject).filter_by(project_id=project_id).first()

        if not project:
            print(f"❌ Project not found: {project_id}")
            return JSONResponse(status_code=404, content={"error": "Project not found"})

        # Get media URL
        media_url = getattr(project, 'media_url', None)
        print(f"📊 Media URL: {media_url[:50] if media_url else 'NULL'}...")

        if not media_url:
            print(f"❌ No media_url for project {project_id}")
            return JSONResponse(status_code=404, content={"error": "No media file available"})

        # For HEAD requests
        if request.method == "HEAD":
            print("📊 HEAD request - returning headers")
            return Response(
                status_code=200,
                headers={
                    "Content-Type": "video/mp4",
                    "Accept-Ranges": "bytes",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                    "Access-Control-Allow-Headers": "*"
                }
            )

        # For GET requests
        if request.method == "GET":
            print("📊 GET request - proxying content")

            import httpx
            async with httpx.AsyncClient(timeout=30.0) as client:
                azure_response = await client.get(media_url)

                if azure_response.status_code == 200:
                    print(f"✅ Azure success: {len(azure_response.content)} bytes")

                    return StreamingResponse(
                        iter([azure_response.content]),
                        media_type="video/mp4",
                        headers={
                            "Content-Length": str(len(azure_response.content)),
                            "Accept-Ranges": "bytes",
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                            "Cache-Control": "public, max-age=3600"
                        }
                    )
                else:
                    print(f"❌ Azure error: {azure_response.status_code}")
                    return JSONResponse(
                        status_code=azure_response.status_code,
                        content={"error": f"Azure returned {azure_response.status_code}"}
                    )

        return JSONResponse(status_code=405, content={"error": "Method not allowed"})

    except Exception as e:
        print(f"❌ Proxy error: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.options("/proxy-media/{project_id}")
async def proxy_media_options(project_id: str):
    """CORS preflight"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        }
    )
