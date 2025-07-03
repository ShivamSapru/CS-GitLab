from backend.database.db import engine
from backend.database.models import Base
from dotenv import load_dotenv
import os

# Load .env from current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

Base.metadata.create_all(bind = engine)
print("Tables created successfully")