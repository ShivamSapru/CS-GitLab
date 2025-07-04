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

    DATABASE_URL = f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOSTNAME}:{POSTGRES_PORT}/{POSTGRES_DB}"
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"

settings = Settings()
