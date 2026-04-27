"""pytest conftest — adds backend root to sys.path so src.* modules are importable."""
import sys
import os

# Insert backend root so `from src.api.schemas import ...` works without
# installing the package
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
