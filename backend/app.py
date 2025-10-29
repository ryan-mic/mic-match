#!/usr/bin/env python3
"""
Flask Backend Service for Audio Processing and Cover Matching
=============================================================

SSE (Server-Sent Events) streaming API for:
1. YouTube audio download
2. Audio feature extraction
3. Lyrics transcription
4. Cover song matching (V7 algorithm)

Endpoints:
- POST /process: Process YouTube video and match against library
- GET /health: Health check endpoint

Author: Ryan Seay
Date: 2025-10-29
"""

import os
import re
import json
import logging
import traceback
from typing import Dict, Any, Generator
from pathlib import Path

from flask import Flask, request, Response, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Import local modules
from audio_processor import process_youtube_video, download_youtube_audio, extract_audio_features, transcribe_lyrics
from matcher_v7 import identify_cover_v7


# ============================================================================
# CONFIGURATION
# ============================================================================

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
STUDIO_LIBRARY_PATH = os.getenv('STUDIO_LIBRARY_PATH', 'studio_library.json')


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def extract_video_id(youtube_url: str) -> str:
    """
    Extract video ID from YouTube URL.

    Supports formats:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://m.youtube.com/watch?v=VIDEO_ID
    - VIDEO_ID (raw ID)

    Args:
        youtube_url: YouTube URL or video ID

    Returns:
        Video ID (11 characters)

    Raises:
        ValueError: If URL is invalid or video ID cannot be extracted
    """
    if not youtube_url:
        raise ValueError("YouTube URL is required")

    # If already a valid video ID, return as-is
    if re.match(r'^[\w-]{11}$', youtube_url):
        return youtube_url

    # Extract from various URL formats
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
        r'v=([a-zA-Z0-9_-]{11})',
    ]

    for pattern in patterns:
        match = re.search(pattern, youtube_url)
        if match:
            return match.group(1)

    raise ValueError(f"Could not extract video ID from URL: {youtube_url}")


def load_studio_library() -> list:
    """
    Load studio song library from JSON file.

    Returns:
        List of studio songs with lyrics and audio_features

    Raises:
        FileNotFoundError: If library file doesn't exist
        json.JSONDecodeError: If library file is invalid JSON
    """
    library_path = Path(STUDIO_LIBRARY_PATH)

    if not library_path.exists():
        raise FileNotFoundError(f"Studio library not found: {STUDIO_LIBRARY_PATH}")

    with open(library_path, 'r') as f:
        library = json.load(f)

    if not isinstance(library, list):
        raise ValueError("Studio library must be a list of songs")

    logger.info(f"Loaded {len(library)} songs from studio library")
    return library


def create_sse_message(data: Dict[str, Any]) -> str:
    """
    Create Server-Sent Events (SSE) formatted message.

    Args:
        data: Dictionary to send as JSON

    Returns:
        SSE formatted string
    """
    return f"data: {json.dumps(data)}\n\n"


# ============================================================================
# STREAMING PROCESS HANDLER
# ============================================================================

def process_video_stream(video_id: str) -> Generator[str, None, None]:
    """
    Process video with SSE streaming progress updates.

    Yields SSE messages for each processing step:
    - downloading (25%)
    - fingerprinting (50%)
    - transcribing (75%)
    - matching (90%)
    - complete (100%)

    Args:
        video_id: YouTube video ID

    Yields:
        SSE formatted progress messages
    """
    audio_path = None

    try:
        # Validate API key
        if not ELEVENLABS_API_KEY:
            yield create_sse_message({
                'status': 'error',
                'message': 'ElevenLabs API key not configured',
                'progress': 0
            })
            return

        # Load studio library
        try:
            studio_library = load_studio_library()
        except Exception as e:
            yield create_sse_message({
                'status': 'error',
                'message': f'Failed to load studio library: {str(e)}',
                'progress': 0
            })
            return

        # Step 1: Download audio (0-25%)
        yield create_sse_message({
            'status': 'downloading',
            'message': 'Downloading audio from YouTube...',
            'progress': 0
        })

        try:
            audio_path, video_title = download_youtube_audio(video_id)
            yield create_sse_message({
                'status': 'downloading',
                'message': f'Downloaded: {video_title}',
                'progress': 25
            })
        except Exception as e:
            yield create_sse_message({
                'status': 'error',
                'message': f'Download failed: {str(e)}',
                'progress': 25
            })
            return

        # Step 2: Extract audio features (25-50%)
        yield create_sse_message({
            'status': 'fingerprinting',
            'message': 'Extracting audio fingerprint...',
            'progress': 25
        })

        try:
            audio_features = extract_audio_features(audio_path)
            yield create_sse_message({
                'status': 'fingerprinting',
                'message': 'Audio features extracted',
                'progress': 50
            })
        except Exception as e:
            yield create_sse_message({
                'status': 'error',
                'message': f'Feature extraction failed: {str(e)}',
                'progress': 50
            })
            return

        # Step 3: Transcribe lyrics (50-75%)
        yield create_sse_message({
            'status': 'transcribing',
            'message': 'Transcribing lyrics...',
            'progress': 50
        })

        try:
            lyrics = transcribe_lyrics(audio_path, ELEVENLABS_API_KEY)
            yield create_sse_message({
                'status': 'transcribing',
                'message': f'Transcribed {len(lyrics)} characters',
                'progress': 75
            })
        except Exception as e:
            yield create_sse_message({
                'status': 'error',
                'message': f'Transcription failed: {str(e)}',
                'progress': 75
            })
            return

        # Step 4: Match against library (75-90%)
        yield create_sse_message({
            'status': 'matching',
            'message': 'Matching against studio library...',
            'progress': 75
        })

        try:
            # Prepare video data for matcher
            youtube_video = {
                'video_id': video_id,
                'title': video_title,
                'lyrics': lyrics,
                'audio_features': audio_features
            }

            # Run V7 matching algorithm
            match_result = identify_cover_v7(youtube_video, studio_library, verbose=False)

            yield create_sse_message({
                'status': 'matching',
                'message': f'Matched: {match_result["match"]}',
                'progress': 90
            })
        except Exception as e:
            yield create_sse_message({
                'status': 'error',
                'message': f'Matching failed: {str(e)}',
                'progress': 90
            })
            return

        # Step 5: Complete (90-100%)
        yield create_sse_message({
            'status': 'complete',
            'message': 'Processing complete',
            'progress': 100,
            'result': {
                'video_id': video_id,
                'title': video_title,
                'match': match_result['match'],
                'confidence': match_result['confidence'],
                'combinedScore': match_result['combined_score'],
                'audioSim': match_result['audio_similarity'],
                'lyricsSim': match_result['lyrics_similarity'],
                'gap': match_result['gap'],
                'top5': match_result['top_5']
            }
        })

    except Exception as e:
        logger.error(f"Unexpected error processing video {video_id}: {str(e)}")
        logger.error(traceback.format_exc())
        yield create_sse_message({
            'status': 'error',
            'message': f'Unexpected error: {str(e)}',
            'progress': 0
        })

    finally:
        # Cleanup: Remove temporary audio file
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                logger.info(f"Cleaned up audio file: {audio_path}")
            except Exception as e:
                logger.warning(f"Failed to cleanup audio file: {str(e)}")


# ============================================================================
# ROUTES
# ============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint.

    Returns:
        JSON response with service status
    """
    status = {
        'status': 'healthy',
        'service': 'audio-processor',
        'version': '1.0.0'
    }

    # Check if API key is configured
    if not ELEVENLABS_API_KEY:
        status['warnings'] = ['ElevenLabs API key not configured']

    # Check if studio library exists
    if not Path(STUDIO_LIBRARY_PATH).exists():
        if 'warnings' not in status:
            status['warnings'] = []
        status['warnings'].append(f'Studio library not found: {STUDIO_LIBRARY_PATH}')

    return jsonify(status)


@app.route('/process', methods=['POST'])
def process_video():
    """
    Process YouTube video with SSE streaming.

    Request body:
        {
            "youtube_url": "https://www.youtube.com/watch?v=..."
        }

    Returns:
        SSE stream with progress updates and final result
    """
    try:
        # Parse request body
        data = request.get_json()

        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        youtube_url = data.get('youtube_url')

        if not youtube_url:
            return jsonify({'error': 'youtube_url is required'}), 400

        # Extract video ID
        try:
            video_id = extract_video_id(youtube_url)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        logger.info(f"Processing video: {video_id}")

        # Return SSE stream
        def generate():
            try:
                for message in process_video_stream(video_id):
                    logger.info(f"Yielding SSE message: {message[:100]}...")  # Log first 100 chars
                    yield message
            except Exception as e:
                logger.error(f"Error in SSE generator: {str(e)}")
                logger.error(traceback.format_exc())
                error_msg = create_sse_message({
                    'status': 'error',
                    'message': f'Streaming error: {str(e)}',
                    'progress': 0
                })
                yield error_msg

        return Response(
            generate(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no',
                'Connection': 'keep-alive'
            }
        )

    except Exception as e:
        logger.error(f"Error in /process endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors."""
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(e):
    """Handle 500 errors."""
    logger.error(f"Internal server error: {str(e)}")
    return jsonify({'error': 'Internal server error'}), 500


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    # Check configuration
    if not ELEVENLABS_API_KEY:
        logger.warning("ELEVENLABS_API_KEY not set. Set it in .env file.")

    if not Path(STUDIO_LIBRARY_PATH).exists():
        logger.warning(f"Studio library not found: {STUDIO_LIBRARY_PATH}")

    # Run Flask app
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'false').lower() == 'true'

    logger.info(f"Starting Flask server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug, threaded=True)
