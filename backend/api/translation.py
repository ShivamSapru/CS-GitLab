import os
import io
import httpx
import zipfile
import tempfile
import srt
import webvtt
import time

from fastapi import APIRouter, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from typing import Dict, List
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
temp_dir = tempfile.mkdtemp()

class ZipRequest(BaseModel):
    filenames: List[str]

# Environment variables
AZURE_TRANSLATOR_LANGUAGES = os.getenv("AZURE_TRANSLATOR_LANGUAGES")
AZURE_TRANSLATOR_ENDPOINT = os.getenv("AZURE_TRANSLATOR_ENDPOINT")
AZURE_TRANSLATOR_KEY = os.getenv("AZURE_TRANSLATOR_KEY")
AZURE_TRANSLATOR_REGION = os.getenv("AZURE_TRANSLATOR_REGION")

MAX_CHAR_LIMIT = 20000  # Azure limit: 50000 characters/request

if not AZURE_TRANSLATOR_KEY or not AZURE_TRANSLATOR_REGION:
    raise EnvironmentError("Missing Azure Translator credentials.")


def fetch_language_codes() -> Dict[str, str]:
    try:
        if not AZURE_TRANSLATOR_LANGUAGES:
            raise EnvironmentError("AZURE_TRANSLATOR_LANGUAGES is not set.")
        response = httpx.get(AZURE_TRANSLATOR_LANGUAGES)
        response.raise_for_status()
        data = response.json()
        return {code: lang["name"] for code, lang in data.get("translation", {}).items()}
    except Exception as e:
        print(f"Error fetching language codes: {e}")
        return {}


def post_with_retries(url, headers, json_body, retries=14):
    for _ in range(retries):
        response = httpx.post(url, headers=headers, json=json_body)
        if response.status_code == 429:
            wait = 5
            print(f"Rate limited. Retrying in {wait} seconds...")
            time.sleep(wait)
            continue
        response.raise_for_status()
        return response
    raise Exception("Exceeded retry limit for translation.")


def chunk_texts(texts: List[str], max_chars: int) -> List[List[str]]:
    chunks, current_chunk, current_len = [], [], 0
    for text in texts:
        if current_len + len(text) > max_chars:
            chunks.append(current_chunk)
            current_chunk = [text]
            current_len = len(text)
        else:
            current_chunk.append(text)
            current_len += len(text)
    if current_chunk:
        chunks.append(current_chunk)
    return chunks


def detect_and_translate(texts, to_lang, no_prof=False):
    url = f"{AZURE_TRANSLATOR_ENDPOINT.rstrip('/')}/translate?api-version=3.0&to={to_lang}"
    if no_prof:
        url += "&profanityAction=Marked"
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_TRANSLATOR_KEY,
        "Ocp-Apim-Subscription-Region": AZURE_TRANSLATOR_REGION,
        "Content-Type": "application/json; charset=UTF-8",
    }

    translated = []
    count = 1
    total_chunks = chunk_texts(texts, MAX_CHAR_LIMIT)
    for chunk in total_chunks:
        body = [{"Text": t} for t in chunk]
        try:
            # print("\nSource Chunk", count, ":", body)
            print("Translating Chunk", count, "of", len(total_chunks))
            response = post_with_retries(url, headers, body)
            data = response.json()
            translated.extend([item["translations"][0]["text"] for item in data])
            count += 1
        except httpx.HTTPStatusError as e:
            print("Status Code:", e.response.status_code)
            print("Response Text:", e.response.text)
            raise e
        except Exception as ex:
            print("Translation Error:", ex)
            raise ex
    # print("\nTranslated Output:", translated)
    return translated


# List of Languages present for translation
LANGUAGE_CODES = fetch_language_codes()

# Endpoint to get the supported languages
@router.get("/languages")
def get_languages() -> Dict[str, str]:
    return LANGUAGE_CODES

# Uploading the .srt or .vtt file and selecting target language(s)
@router.post("/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    target_language: str = Form(...),
    censor_profanity: bool = Form(...)
):
    try:
        input_path = os.path.join(temp_dir, file.filename)
        base, ext = os.path.splitext(file.filename)
        tag = " and Censored" if censor_profanity else ""
        target_language_name = LANGUAGE_CODES.get(target_language, "Unknown")
        output_filename = f"{base} (Translated to {target_language_name}{tag}).{target_language}{ext}"
        output_path = os.path.join(temp_dir, output_filename)

        with open(input_path, "wb") as f:
            f.write(await file.read())

        if ext.lower() == ".srt":
            with open(input_path, "r", encoding="utf-8") as f:
                subtitles = list(srt.parse(f.read()))
            texts = [s.content for s in subtitles]
            translated = detect_and_translate(texts, target_language, censor_profanity)
            for i, s in enumerate(subtitles):
                s.content = translated[i]
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(srt.compose(subtitles))

        elif ext.lower() == ".vtt":
            vtt = webvtt.read(input_path)
            texts = [c.text for c in vtt.captions]
            translated = detect_and_translate(texts, target_language, censor_profanity)
            for i, c in enumerate(vtt.captions):
                c.text = translated[i]
            vtt.save(output_path)

        else:
            raise ValueError("Unsupported file format. Please upload .srt or .vtt")

        return {
            "original_filename": file.filename,
            "translated_filename": output_filename,
            "target_language": target_language,
            "target_language_name": target_language_name,
            "message": "File uploaded, translated, and saved successfully."
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Translation failed: {str(e)}"})

# Download subtitle file by dynamic name
@router.get("/download-subtitle")
def download_subtitle(
    filename: str = Query(..., description="Name of the subtitle file to download")
):
    try:
        file_path = os.path.join(temp_dir, filename)

        if not os.path.exists(file_path):
            return JSONResponse(
                status_code=404,
                content={"error": "Requested file not found."}
            )

        return FileResponse(
            path=file_path,
            media_type="application/octet-stream",
            filename=filename,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Download failed: {str(e)}"}
        )

# Create and return a ZIP file containing multiple translated subtitle files
@router.post("/download-zip")
async def download_zip(request: ZipRequest):
    try:
        # Create a BytesIO object to store the ZIP file in memory
        zip_buffer = io.BytesIO()

        # Create a ZIP file
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for filename in request.filenames:
                # Use the same temp_dir that your other endpoints use
                file_path = os.path.join(temp_dir, filename)

                # Check if file exists
                if not os.path.exists(file_path):
                    return JSONResponse(
                        status_code=404,
                        content={"error": f"File {filename} not found"}
                    )

                # Add file to ZIP
                zip_file.write(file_path, filename)

        # Reset buffer position to beginning
        zip_buffer.seek(0)

        # Return the ZIP file as a streaming response
        return StreamingResponse(
            io.BytesIO(zip_buffer.read()),
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=translated_subtitles.zip"}
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Error creating ZIP file: {str(e)}"}
        )
