# api/auth.py
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse, JSONResponse
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
import os

router = APIRouter()

# OAuth Setup
config = Config('.env')
oauth = OAuth(config)

oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile',
    }
)

@router.get("/login")
async def login(request: Request):
    redirect_uri = os.getenv("BACKEND_URL") + "/auth/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/auth/callback")
async def auth_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
        print("Token:", token)

        if "id_token" not in token:
            raise ValueError("id_token not returned by Google.")

        user = token["userinfo"]
        print("User Info:", user)

        request.session["user"] = dict(user)
        return RedirectResponse(os.getenv("FRONTEND_URL"))
    except Exception as e:
        print("OAuth Error:", e)
        return JSONResponse(status_code=500, content={"error": str(e)})
    
@router.get("/me")
async def me(request: Request):
    user = request.session.get('user')
    if user:
        return JSONResponse(user)
    return JSONResponse({"error": "Not logged in"}, status_code=401)

@router.get("/logout")
async def logout(request: Request):
    request.session.pop('user', None)
    return JSONResponse({"message": "Logged out"})
