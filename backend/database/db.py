import os
from sqlalchemy import create_engine
from dotenv import load_dotenv
from sqlalchemy.orm import sessionmaker, declarative_base

# Load .env from the backend folder
# env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
# load_dotenv(dotenv_path=env_path)
load_dotenv()

# DATABASE_URL = os.getenv("DATABASE_URL")
POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_HOSTNAME = os.getenv("POSTGRES_HOSTNAME")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")

DATABASE_URL = f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOSTNAME}:{POSTGRES_PORT}/{POSTGRES_DB}"

if not POSTGRES_DB or not POSTGRES_USER or not POSTGRES_PASSWORD or not POSTGRES_HOSTNAME or not POSTGRES_PORT:
    raise ValueError("One or more required PostgreSQL environment variables are missing. Please check your .env file or system environment.")

# Create the SQLAlchemy Engine
engine = create_engine(DATABASE_URL)

# Create a SessionLocal class for database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for declarative models
Base = declarative_base()

# --- NEW FUNCTION TO CREATE TABLES ---
def create_db_tables():
    """
    Creates all database tables defined in Base.metadata.
    This function should be called on application startup.
    """
    print("Attempting to create database tables...")
    Base.metadata.create_all(engine) # This is the key line!
    print("Database tables created or already exist.")

# Dependency for getting a database session (common FastAPI pattern)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

