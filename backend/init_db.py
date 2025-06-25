from database.db import engine
from database.models import Base
from dotenv import load_dotenv
import os

# Load .env from current directory
# load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv()

Base.metadata.create_all(bind = engine)
print("Tables created successfully")