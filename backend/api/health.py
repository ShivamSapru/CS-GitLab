from fastapi import APIRouter
from fastapi.responses import JSONResponse
import os
import httpx

from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# Environment variables
AZURE_TRANSLATOR_KEY = os.getenv("AZURE_TRANSLATOR_KEY")
AZURE_TRANSLATOR_REGION = os.getenv("AZURE_TRANSLATOR_REGION")
AZURE_TRANSLATOR_ENDPOINT = os.getenv("AZURE_TRANSLATOR_ENDPOINT")

# Check internal environment setup, not make external calls
@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Backend is up. Azure Translator assumed reachable.",
        "azure_translator_key_configured": bool(AZURE_TRANSLATOR_KEY),
        "azure_translator_endpoint_configured": bool(AZURE_TRANSLATOR_ENDPOINT),
        "azure_translator_region_configured": bool(AZURE_TRANSLATOR_REGION),
    }

# Only invoke manually for debugging
@router.get("/debug/translator-check")
def debug_translator():
    url = f"{os.getenv('AZURE_TRANSLATOR_ENDPOINT').rstrip('/')}/translate?api-version=3.0&to=fr"
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_TRANSLATOR_KEY,
        "Ocp-Apim-Subscription-Region": AZURE_TRANSLATOR_REGION,
        "Content-Type": "application/json; charset=UTF-8",
    }
    json_body = [{"Text": "Hello, world!!"}]
    # print(url, headers, json_body)

    try:
        resp = httpx.post(url, headers=headers, json=json_body)
        # print(resp.status_code, resp.json())

        if resp.status_code == 200:
            return {
                "status": f"{resp.status_code} healthy",
                "message": "Backend server is running and Azure Translator is reachable."
            }

        elif resp.status_code == 401:
            return JSONResponse(
                content={
                    "status": f"{resp.status_code} unauthorized",
                    "message": "Invalid or missing Azure credentials. Check API key and region."
                }
            )

        elif resp.status_code == 403:
            return JSONResponse(
                content={
                    "status": f"{resp.status_code} forbidden",
                    "message": "Access to Azure Translator is forbidden. Verify subscription and permissions."
                }
            )

        elif resp.status_code == 429:
            return JSONResponse(
                content={
                    "status": f"{resp.status_code} rate_limited",
                    "message": "Azure Translator rate limit exceeded. Try again later or optimize request volume."
                }
            )

        elif resp.status_code == 503:
            return JSONResponse(
                content={
                    "status": f"{resp.status_code} service_unavailable",
                    "message": "Azure Translator service temporarily unavailable."
                }
            )

        else:
            return JSONResponse(
                status_code=resp.status_code,
                content={
                    "status": "error",
                    "message": f"Unexpected error occurred. Azure response code: {resp.status_code}"
                }
            )

    except Exception as e:
        return JSONResponse(
            content={
                "status": "internal_error",
                "message": f"Health check failed due to: {str(e)}"
            }
        )
