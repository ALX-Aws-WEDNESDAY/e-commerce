import os
import sys

# Ensure project root is on sys.path before pytest collection so local
# `code` package is found instead of the stdlib `code` module.
ROOT = os.path.dirname(os.path.dirname(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
