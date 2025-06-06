from fastapi import FastAPI, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from typing import Dict
import os

app = FastAPI()

# Base path logic for portability
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# List of Languages present for translation
LANGUAGE_CODES =  {
  "en": "English",
  "hi": "Hindi",
  "fr": "French",
  "de": "German"
}

# Endpoint to get the supported languages
@app.get("/languages")
def get_languages() -> Dict[str, str]:
  return LANGUAGE_CODES

# Uploading the .srt or .vtt file and selecting the source and target language
@app.post("/upload-file")
async def upload_file(file: UploadFile = File(...), source_language: str = Form(...), target_language: str = Form(...)):
  if not(file.filename.endswith(".srt") or file.filename.endswith(".vtt")):
    return JSONResponse(status_code=400, content={"error": "Unsupported file format. Please upload .srt or .vtt files."})

  if source_language == target_language:
    return JSONResponse(status_code=400, content={"error": "Source and target languages cannot be same."})

  if ((source_language not in LANGUAGE_CODES) or (target_language not in LANGUAGE_CODES)):
    return JSONResponse(status_code=400, content={"error": "Unsupported language code."})

  contents = await file.read()
  subtitle_text = contents.decode("utf-8")

  # Simulate translation by appending text
  translated_lines = []
  for line in subtitle_text.splitlines():
    if line.strip() and not line.strip().isdigit() and "-->" not in line:
      translated_lines.append(f"[Translated to {target_language}] {line}")
    else:
      translated_lines.append(line)

  translated_content = "\n".join(translated_lines)
  base_name, ext = os.path.splitext(file.filename)
  translated_filename = f"{base_name}_translated_to_{target_language}{ext}"
  save_path = os.path.join(OUTPUT_DIR, translated_filename)

  with open(save_path, "w", encoding="utf-8") as f:
    f.write(translated_content)

  return {
    "original_filename": file.filename,
    "translated_filename": translated_filename,
    "message": "File uploaded, translated, and saved successfully."
  }

# Download subtitle file by dynamic name
@app.get("/download-subtitle")
def download_subtitle(filename: str = Query(..., description="Name of the subtitle file to download")):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        return {"error": "Requested file not found."}

    return FileResponse(
        path=file_path,
        media_type="application/octet-stream",
        filename=filename,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
