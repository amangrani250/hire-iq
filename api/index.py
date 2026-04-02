import os
import sys

# Define the path to the backend directory
# __file__ is /api/index.py, so parent is /, and we add /backend to path
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
backend_path = os.path.join(root_dir, 'backend')

if backend_path not in sys.path:
    sys.path.append(backend_path)

# Import the FastAPI app from backend/main.py
from main import app as application

# Export as 'app' for Vercel
app = application
