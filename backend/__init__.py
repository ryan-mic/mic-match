"""
Audio Processing Backend Service
=================================

Flask-based backend for YouTube audio processing and cover song matching.

Modules:
    app: Flask application with SSE streaming API
    audio_processor: Audio download, feature extraction, transcription
    matcher_v7: V7 cover matching algorithm (97.7% precision)

Author: Ryan Seay
Date: 2025-10-29
Version: 1.0.0
"""

__version__ = "1.0.0"
__author__ = "Ryan Seay"
__email__ = "your.email@example.com"

from . import matcher_v7
from . import audio_processor
from . import app

__all__ = ["matcher_v7", "audio_processor", "app"]
