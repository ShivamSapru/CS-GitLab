import os
# from dotenv import load_dotenv

# load_dotenv()

class Settings:
    # DATABASE_URL = os.getenv("DATABASE_URL")
    POSTGRES_DB = os.getenv("POSTGRES_DB")
    POSTGRES_USER = os.getenv("POSTGRES_USER")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
    POSTGRES_HOSTNAME = os.getenv("POSTGRES_HOSTNAME")
    POSTGRES_PORT = os.getenv("POSTGRES_PORT")

    # Fixed: Make SSL conditional based on environment variable
    # Default to requiring SSL in production, but allow disabling for CI/testing
    ssl_mode = "require" if os.getenv("POSTGRES_REQUIRE_SSL", "true").lower() == "true" else "disable"
    DATABASE_URL = f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOSTNAME}:{POSTGRES_PORT}/{POSTGRES_DB}?sslmode={ssl_mode}"
    
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"

settings = Settings()
