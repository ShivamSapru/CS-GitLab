import sys
import os
from dotenv import load_dotenv

# Handle both cases: running from project root and from backend directory
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = current_dir if os.path.basename(current_dir) == 'backend' else None
project_root = os.path.dirname(current_dir) if backend_dir else current_dir

# Add project root to Python path for imports
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Load environment variables
load_dotenv()

try:
    # Try to import - will work whether run from root or backend directory
    from backend.database.db import engine
    from backend.database.models import Base
    
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")
    
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure you're running this script from the project root directory")
    print("   or that the backend module is properly configured")
    sys.exit(1)
except Exception as e:
    print(f"Error creating tables: {e}")
    print("Check your database connection and environment variables")
    sys.exit(1)
