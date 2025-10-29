#!/usr/bin/env python3
"""
Audio Processing Module
=======================

Handles:
1. YouTube audio download via yt-dlp
2. Audio feature extraction via librosa (harmonic features)
3. Lyrics transcription via ElevenLabs API

Author: Ryan Seay
Date: 2025-10-29
"""

import os
import re
import tempfile
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import numpy as np
import requests

# Configure logging
logger = logging.getLogger(__name__)


# ============================================================================
# YOUTUBE DOWNLOAD
# ============================================================================

def download_youtube_audio(video_id: str, output_dir: Optional[str] = None) -> Tuple[str, str]:
    """
    Download audio from YouTube video using yt-dlp.

    Args:
        video_id: YouTube video ID (e.g., 'dQw4w9WgXcQ')
        output_dir: Directory to save audio file. If None, uses temp directory.

    Returns:
        Tuple of (audio_file_path, video_title)

    Raises:
        RuntimeError: If download fails
        ValueError: If video_id is invalid
    """
    if not video_id or not re.match(r'^[\w-]{11}$', video_id):
        raise ValueError(f"Invalid YouTube video ID: {video_id}")

    # Use temp directory if not specified
    if output_dir is None:
        output_dir = tempfile.gettempdir()

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Output template for yt-dlp
    output_template = str(output_dir / f"{video_id}.%(ext)s")

    try:
        # Download audio using yt-dlp
        # Format: best audio quality, convert to mp3
        cmd = [
            'yt-dlp',
            '-x',  # Extract audio
            '--audio-format', 'mp3',
            '--audio-quality', '0',  # Best quality
            '-o', output_template,
            '--no-playlist',
            '--quiet',
            '--no-warnings',
            '--print', 'after_move:filepath',  # Print final filepath
            '--print', 'title',  # Print video title
            # Bypass YouTube bot detection
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '--extractor-args', 'youtube:player_client=android,web',
            '--no-check-certificate',
            f'https://www.youtube.com/watch?v={video_id}'
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=300  # 5 minute timeout
        )

        # Parse output (last two lines are filepath and title)
        output_lines = result.stdout.strip().split('\n')
        if len(output_lines) >= 2:
            video_title = output_lines[0]
            audio_path = output_lines[-1]
        else:
            # Fallback: construct expected path
            audio_path = str(output_dir / f"{video_id}.mp3")
            video_title = video_id

        # Verify file exists
        if not os.path.exists(audio_path):
            raise RuntimeError(f"Downloaded file not found: {audio_path}")

        logger.info(f"Downloaded audio: {video_title} -> {audio_path}")
        return audio_path, video_title

    except subprocess.TimeoutExpired:
        raise RuntimeError(f"Download timeout for video {video_id}")
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr if e.stderr else str(e)
        raise RuntimeError(f"yt-dlp failed: {error_msg}")
    except Exception as e:
        raise RuntimeError(f"Download failed: {str(e)}")


# ============================================================================
# AUDIO FEATURE EXTRACTION
# ============================================================================

def extract_audio_features(audio_path: str) -> Dict[str, List[float]]:
    """
    Extract harmonic audio features using librosa.

    Features extracted:
    - chroma_stft_mean: Short-time Fourier transform chromagram (12 pitch classes)
    - chroma_cqt_mean: Constant-Q transform chromagram (12 pitch classes)
    - tonnetz_mean: Tonal centroid features (6 dimensions)
    - spectral_contrast_mean: Spectral valley/peak contrast (7 bands)

    Args:
        audio_path: Path to audio file

    Returns:
        Dictionary with feature vectors as lists

    Raises:
        RuntimeError: If feature extraction fails
        FileNotFoundError: If audio file doesn't exist
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    try:
        import librosa

        # Load audio file
        logger.info(f"Loading audio: {audio_path}")
        y, sr = librosa.load(audio_path, sr=22050, mono=True)

        # Extract harmonic features
        logger.info("Extracting audio features...")

        # 1. Chroma STFT (Short-time Fourier Transform)
        chroma_stft = librosa.feature.chroma_stft(y=y, sr=sr)
        chroma_stft_mean = np.mean(chroma_stft, axis=1)

        # 2. Chroma CQT (Constant-Q Transform) - best for pitch
        chroma_cqt = librosa.feature.chroma_cqt(y=y, sr=sr)
        chroma_cqt_mean = np.mean(chroma_cqt, axis=1)

        # 3. Tonnetz (Tonal Centroid Features)
        tonnetz = librosa.feature.tonnetz(y=y, sr=sr)
        tonnetz_mean = np.mean(tonnetz, axis=1)

        # 4. Spectral Contrast
        spectral_contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
        spectral_contrast_mean = np.mean(spectral_contrast, axis=1)

        features = {
            'chroma_stft_mean': chroma_stft_mean.tolist(),
            'chroma_cqt_mean': chroma_cqt_mean.tolist(),
            'tonnetz_mean': tonnetz_mean.tolist(),
            'spectral_contrast_mean': spectral_contrast_mean.tolist()
        }

        logger.info("Audio features extracted successfully")
        return features

    except ImportError:
        raise RuntimeError("librosa not installed. Install with: pip install librosa")
    except Exception as e:
        raise RuntimeError(f"Feature extraction failed: {str(e)}")


# ============================================================================
# LYRICS TRANSCRIPTION
# ============================================================================

def transcribe_lyrics(audio_path: str, api_key: str) -> str:
    """
    Transcribe audio to text using ElevenLabs API.

    Args:
        audio_path: Path to audio file
        api_key: ElevenLabs API key

    Returns:
        Transcribed lyrics text

    Raises:
        RuntimeError: If transcription fails
        FileNotFoundError: If audio file doesn't exist
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    if not api_key:
        raise ValueError("ElevenLabs API key is required")

    try:
        logger.info(f"Transcribing audio: {audio_path}")

        # ElevenLabs Speech-to-Text API endpoint
        url = "https://api.elevenlabs.io/v1/audio-to-text"

        headers = {
            "xi-api-key": api_key
        }

        # Read audio file
        with open(audio_path, 'rb') as f:
            files = {
                'audio': (os.path.basename(audio_path), f, 'audio/mpeg')
            }

            # Make API request
            response = requests.post(
                url,
                headers=headers,
                files=files,
                timeout=120  # 2 minute timeout
            )

        # Check response
        if response.status_code == 200:
            result = response.json()
            lyrics = result.get('text', '')

            if not lyrics:
                logger.warning("Transcription returned empty text")
                return ""

            logger.info(f"Transcription complete: {len(lyrics)} characters")
            return lyrics

        elif response.status_code == 401:
            raise RuntimeError("Invalid ElevenLabs API key")
        elif response.status_code == 429:
            raise RuntimeError("ElevenLabs API rate limit exceeded")
        else:
            error_msg = response.json().get('detail', response.text)
            raise RuntimeError(f"ElevenLabs API error ({response.status_code}): {error_msg}")

    except requests.exceptions.Timeout:
        raise RuntimeError("Transcription timeout")
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"API request failed: {str(e)}")
    except Exception as e:
        raise RuntimeError(f"Transcription failed: {str(e)}")


# ============================================================================
# FULL PIPELINE
# ============================================================================

def process_youtube_video(
    video_id: str,
    api_key: str,
    output_dir: Optional[str] = None,
    keep_audio: bool = False
) -> Dict:
    """
    Complete pipeline: download, extract features, transcribe.

    Args:
        video_id: YouTube video ID
        api_key: ElevenLabs API key
        output_dir: Directory for audio files
        keep_audio: If False, delete audio file after processing

    Returns:
        Dictionary with:
        - video_id: YouTube video ID
        - title: Video title
        - audio_path: Path to audio file (if keep_audio=True)
        - audio_features: Extracted audio features
        - lyrics: Transcribed lyrics

    Raises:
        RuntimeError: If any step fails
    """
    audio_path = None

    try:
        # Step 1: Download audio
        logger.info(f"Processing YouTube video: {video_id}")
        audio_path, video_title = download_youtube_audio(video_id, output_dir)

        # Step 2: Extract features
        audio_features = extract_audio_features(audio_path)

        # Step 3: Transcribe lyrics
        lyrics = transcribe_lyrics(audio_path, api_key)

        result = {
            'video_id': video_id,
            'title': video_title,
            'audio_path': audio_path if keep_audio else None,
            'audio_features': audio_features,
            'lyrics': lyrics
        }

        # Cleanup audio file if requested
        if not keep_audio and audio_path and os.path.exists(audio_path):
            os.remove(audio_path)
            logger.info(f"Removed temporary audio file: {audio_path}")

        return result

    except Exception as e:
        # Cleanup on failure
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except Exception:
                pass
        raise RuntimeError(f"Video processing failed: {str(e)}")
