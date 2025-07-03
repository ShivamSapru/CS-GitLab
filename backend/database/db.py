import os
from sqlalchemy import create_engine
from dotenv import load_dotenv
from sqlalchemy.orm import sessionmaker, declarative_base

# Load .env from the backend folder
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv(dotenv_path=env_path)
 
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in .env file or environment.")

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

