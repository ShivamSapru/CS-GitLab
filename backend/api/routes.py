<<<<<<< HEAD
import os
import httpx
import tempfile
import time

from fastapi import APIRouter, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse, FileResponse
from typing import Dict, Optional
from dotenv import load_dotenv

import srt
import webvtt

load_dotenv()

router = APIRouter()

temp_dir = tempfile.mkdtemp()
=======
from fastapi import APIRouter, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse, FileResponse
from typing import Dict
import os

router = APIRouter()

# Base path logic for portability
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)
>>>>>>> 66d26b30de1ea117b44ef5a006aa553fca3a92fb

# List of Languages present for translation
LANGUAGE_CODES = {
    "en": "English",
    "hi": "Hindi",
    "fr": "French",
    "de": "German"
}

<<<<<<< HEAD
AZURE_TRANSLATOR_ENDPOINT = os.getenv("AZURE_TRANSLATOR_ENDPOINT")
AZURE_SUBSCRIPTION_KEY = os.getenv("AZURE_SUBSCRIPTION_KEY")
AZURE_REGION = os.getenv("AZURE_REGION")


if not AZURE_SUBSCRIPTION_KEY or not AZURE_REGION:
    raise EnvironmentError("Missing AZURE_SUBSCRIPTION_KEY or AZURE_REGION in environment.")


MAX_CHAR_LIMIT = 20000  # Azure limit is 50000 characters/request


def post_with_retries(url, headers, json_body, retries=14):
    for i in range(retries):
        response = httpx.post(url, headers=headers, json=json_body)
        if response.status_code == 429:
            wait = 5
            print(f"Rate limited. Retrying in {wait} seconds...")
            time.sleep(wait)
            continue
        response.raise_for_status()
        return response
    raise Exception("Exceeded retry limit for translation request.")


def chunk_texts(texts, max_chars):
    chunks = []
    current_chunk = []
    current_length = 0

    for text in texts:
        length = len(text)
        if current_length + length > max_chars:
            chunks.append(current_chunk)
            current_chunk = [text]
            current_length = length
        else:
            current_chunk.append(text)
            current_length += length

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def detect_and_translate(texts, to_lang):
    path = "/translate?api-version=3.0"
    params = f"&to={to_lang}"
    url = AZURE_TRANSLATOR_ENDPOINT + path + params
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_SUBSCRIPTION_KEY,
        "Ocp-Apim-Subscription-Region": AZURE_REGION,
        "Content-type": "application/json",
    }

    translated = []
    count = 1
    total_chunks = chunk_texts(texts, MAX_CHAR_LIMIT)
    for chunk in total_chunks:
        body = [{"Text": t} for t in chunk]
        try:
            # print("\nSource Chunk", count, ":", body)
            print("\nTranslating Chunk", count, "of", len(total_chunks))
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


=======
>>>>>>> 66d26b30de1ea117b44ef5a006aa553fca3a92fb
# Endpoint to get the supported languages
@router.get("/languages")
def get_languages() -> Dict[str, str]:
    return LANGUAGE_CODES

<<<<<<< HEAD

=======
>>>>>>> 66d26b30de1ea117b44ef5a006aa553fca3a92fb
# Health check endpoint
@router.get("/health")
def health_check():
    return {"status": "healthy", "message": "Backend server is running"}

<<<<<<< HEAD

=======
>>>>>>> 66d26b30de1ea117b44ef5a006aa553fca3a92fb
# Uploading the .srt or .vtt file and selecting the source and target language
@router.post("/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    source_language: str = Form(...),
    target_language: str = Form(...)
):
    try:
<<<<<<< HEAD
        input_path = os.path.join(temp_dir, file.filename)
        base_name, file_ext = os.path.splitext(file.filename)
        output_filename = f"{base_name} (Translated to {target_language.upper()}){file_ext}"
        output_path = os.path.join(temp_dir, output_filename)

        with open(input_path, "wb") as f:
            f.write(await file.read())

        if file_ext.lower() == ".srt":
            with open(input_path, "r", encoding="utf-8") as f:
                subtitles = list(srt.parse(f.read()))
            texts = [s.content for s in subtitles]
            translated = detect_and_translate(texts, target_language)
            for i, s in enumerate(subtitles):
                s.content = translated[i]
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(srt.compose(subtitles))

        elif file_ext.lower() == ".vtt":
            vtt = webvtt.read(input_path)
            texts = [caption.text for caption in vtt.captions]
            translated = detect_and_translate(texts, target_language)
            for i, caption in enumerate(vtt.captions):
                caption.text = translated[i]
            vtt.save(output_path)
        else:
            raise ValueError("Unsupported file format. Please upload .srt or .vtt")

        return {
            "original_filename": file.filename,
            "translated_filename": output_filename,
=======
        # Validate file format
        if not (file.filename.endswith(".srt") or file.filename.endswith(".vtt")):
            return JSONResponse(
                status_code=400,
                content={"error": "Unsupported file format. Please upload .srt or .vtt files."}
            )

        # Validate language codes
        if source_language == target_language:
            return JSONResponse(
                status_code=400,
                content={"error": "Source and target languages cannot be same."}
            )

        if source_language not in LANGUAGE_CODES or target_language not in LANGUAGE_CODES:
            return JSONResponse(
                status_code=400,
                content={"error": "Unsupported language code."}
            )

        # Read and process the file
        contents = await file.read()
        subtitle_text = contents.decode("utf-8")

        # Simulate translation by appending text
        translated_lines = []
        for line in subtitle_text.splitlines():
            if line.strip() and not line.strip().isdigit() and "-->" not in line:
                translated_lines.append(f"[Translated to {LANGUAGE_CODES[target_language]}] {line}")
            else:
                translated_lines.append(line)

        translated_content = "\n".join(translated_lines)

        # Generate translated filename
        base_name, ext = os.path.splitext(file.filename)
        translated_filename = f"{base_name}_translated_to_{target_language}{ext}"
        save_path = os.path.join(OUTPUT_DIR, translated_filename)

        # Save the translated file
        with open(save_path, "w", encoding="utf-8") as f:
            f.write(translated_content)

        return {
            "original_filename": file.filename,
            "translated_filename": translated_filename,
>>>>>>> 66d26b30de1ea117b44ef5a006aa553fca3a92fb
            "source_language": source_language,
            "target_language": target_language,
            "target_language_name": LANGUAGE_CODES[target_language],
            "message": "File uploaded, translated, and saved successfully."
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error: {str(e)}"}
        )

<<<<<<< HEAD

=======
>>>>>>> 66d26b30de1ea117b44ef5a006aa553fca3a92fb
# Download subtitle file by dynamic name
@router.get("/download-subtitle")
def download_subtitle(filename: str = Query(..., description="Name of the subtitle file to download")):
    try:
<<<<<<< HEAD
        file_path = os.path.join(temp_dir, filename)
=======
        file_path = os.path.join(OUTPUT_DIR, filename)
>>>>>>> 66d26b30de1ea117b44ef5a006aa553fca3a92fb

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
