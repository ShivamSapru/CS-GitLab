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


AZURE_TRANSLATOR_ENDPOINT = os.getenv("AZURE_TRANSLATOR_ENDPOINT")
AZURE_SUBSCRIPTION_KEY = os.getenv("AZURE_SUBSCRIPTION_KEY")
AZURE_REGION = os.getenv("AZURE_REGION")
AZURE_LANGUAGES_URL = os.getenv("AZURE_LANGUAGES_URL")


if not AZURE_SUBSCRIPTION_KEY or not AZURE_REGION:
    raise EnvironmentError("Missing AZURE_SUBSCRIPTION_KEY or AZURE_REGION in environment.")


MAX_CHAR_LIMIT = 20000  # Azure limit is 50000 characters per request


def fetch_language_codes() -> Dict[str, str]:
    try:
        if not AZURE_LANGUAGES_URL:
            raise EnvironmentError("AZURE_LANGUAGES_URL is not set in environment variables.")

        response = httpx.get(AZURE_LANGUAGES_URL)
        response.raise_for_status()
        data = response.json()

        translation_langs = data.get("translation", {})
        formatted_languages = {
            code: lang_data["name"]
            for code, lang_data in translation_langs.items()
        }

        return formatted_languages

    except Exception as e:
        print(f"Failed to fetch Azure language codes: {e}")
        return {}


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


def detect_and_translate(texts, to_lang, no_prof):
    path = "translate?api-version=3.0"
    params = f"&to={to_lang}"
    if no_prof:
        params += "&profanityAction=Marked"
    url = AZURE_TRANSLATOR_ENDPOINT + path + params
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_SUBSCRIPTION_KEY,
        "Ocp-Apim-Subscription-Region": AZURE_REGION,
        "Content-Type": "application/json",
    }

     # DEBUG: Print the actual request details
    print("=== DEBUG REQUEST ===")
    print(f"URL: {url}")
    print(f"Headers: {headers}")
    print(f"Target Language: {to_lang}")
    print(f"Texts to translate: {texts[:2]}...")  # First 2 items only
    print("====================")

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


# List of Languages present for translation
LANGUAGE_CODES = fetch_language_codes()

# Endpoint to get the supported languages
@router.get("/languages")
def get_languages() -> Dict[str, str]:
    return LANGUAGE_CODES

# Health check endpoint
@router.get("/health")
def health_check():
    return {"status": "healthy", "message": "Backend server is running"}

# Uploading the .srt or .vtt file and selecting the source and target language
@router.post("/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    # source_language: str = Form(...),
    target_language: str = Form(...),
    censor_profanity: bool = Form(...)
):
    try:
        input_path = os.path.join(temp_dir, file.filename)
        base_name, file_ext = os.path.splitext(file.filename)
        tag = " and Censored" if censor_profanity else ""
        output_filename = f"{base_name} (Translated to {target_language.upper()}{tag}){file_ext}"
        output_path = os.path.join(temp_dir, output_filename)

        with open(input_path, "wb") as f:
            f.write(await file.read())

        if file_ext.lower() == ".srt":
            with open(input_path, "r", encoding="utf-8") as f:
                subtitles = list(srt.parse(f.read()))
            texts = [s.content for s in subtitles]
            translated = detect_and_translate(texts, target_language, censor_profanity)
            for i, s in enumerate(subtitles):
                s.content = translated[i]
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(srt.compose(subtitles))

        elif file_ext.lower() == ".vtt":
            vtt = webvtt.read(input_path)
            texts = [caption.text for caption in vtt.captions]
            translated = detect_and_translate(texts, target_language, censor_profanity)
            for i, caption in enumerate(vtt.captions):
                caption.text = translated[i]
            vtt.save(output_path)
        else:
            raise ValueError("Unsupported file format. Please upload .srt or .vtt")

        return {
            "original_filename": file.filename,
            "translated_filename": output_filename,
            # "source_language": source_language,
            "target_language": target_language,
            "target_language_name": LANGUAGE_CODES[target_language],
            "message": "File uploaded, translated, and saved successfully."
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error: {str(e)}"}
        )

# Download subtitle file by dynamic name
@router.get("/download-subtitle")
def download_subtitle(filename: str = Query(..., description="Name of the subtitle file to download")):
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

@router.get("/debug-env")
def debug_environment():
    """Debug endpoint to check environment variables"""
    return {
        "endpoint": os.getenv("AZURE_TRANSLATOR_ENDPOINT"),
        "region": os.getenv("AZURE_REGION"),
        "key_exists": bool(os.getenv("AZURE_SUBSCRIPTION_KEY")),
        "key_length": len(os.getenv("AZURE_SUBSCRIPTION_KEY", "")),
        "working_directory": os.getcwd(),
        "env_file_exists": os.path.exists(".env")
    }
