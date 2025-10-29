# Audio Processing Backend Service

Flask-based backend service for YouTube audio processing and cover song matching using the V7 algorithm.

## Features

- **YouTube Audio Download**: Extract audio from YouTube videos using yt-dlp
- **Audio Fingerprinting**: Extract harmonic features (chroma, tonnetz, spectral contrast) using librosa
- **Lyrics Transcription**: Speech-to-text using ElevenLabs API
- **Cover Matching**: V7 algorithm (30% audio / 70% lyrics) with 97.7% precision
- **SSE Streaming**: Real-time progress updates via Server-Sent Events
- **CORS Enabled**: Ready for frontend integration

## Project Structure

```
backend/
├── app.py                 # Flask application with SSE streaming
├── matcher_v7.py          # V7 cover matching algorithm
├── audio_processor.py     # Audio download, features, transcription
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
└── README.md             # This file
```

## Installation

### 1. Prerequisites

- Python 3.9+
- ffmpeg (required by yt-dlp and librosa)

**Install ffmpeg:**

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### 2. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your ElevenLabs API key
```

Required environment variables:

```bash
ELEVENLABS_API_KEY=your_api_key_here
STUDIO_LIBRARY_PATH=studio_library.json
PORT=5000
DEBUG=false
```

### 4. Prepare Studio Library

Create `studio_library.json` with your reference songs:

```json
[
  {
    "artist": "Artist Name",
    "title": "Song Title",
    "lyrics": "transcribed lyrics...",
    "audio_features": {
      "chroma_stft_mean": [0.1, 0.2, ...],
      "chroma_cqt_mean": [0.1, 0.2, ...],
      "tonnetz_mean": [0.1, 0.2, ...],
      "spectral_contrast_mean": [0.1, 0.2, ...]
    }
  }
]
```

## Usage

### Start Server

```bash
python app.py
```

Server runs on `http://localhost:5000` by default.

### API Endpoints

#### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "audio-processor",
  "version": "1.0.0"
}
```

#### Process Video

```bash
POST /process
Content-Type: application/json

{
  "youtube_url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

Returns SSE stream with progress updates:

**Progress Messages:**

```json
{"status": "downloading", "message": "Downloading audio...", "progress": 0}
{"status": "downloading", "message": "Downloaded: Video Title", "progress": 25}
{"status": "fingerprinting", "message": "Extracting features...", "progress": 25}
{"status": "fingerprinting", "message": "Audio features extracted", "progress": 50}
{"status": "transcribing", "message": "Transcribing lyrics...", "progress": 50}
{"status": "transcribing", "message": "Transcribed 1500 characters", "progress": 75}
{"status": "matching", "message": "Matching against library...", "progress": 75}
{"status": "matching", "message": "Matched: Artist - Song", "progress": 90}
```

**Final Result:**

```json
{
  "status": "complete",
  "message": "Processing complete",
  "progress": 100,
  "result": {
    "video_id": "VIDEO_ID",
    "title": "Video Title",
    "match": "Artist - Song Title",
    "confidence": "HIGH",
    "combinedScore": 0.87,
    "audioSim": 0.75,
    "lyricsSim": 0.92,
    "gap": 0.25,
    "top5": [...]
  }
}
```

**Error Message:**

```json
{
  "status": "error",
  "message": "Error description",
  "progress": 50
}
```

### Frontend Integration Example

```javascript
const eventSource = new EventSource('http://localhost:5000/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ youtube_url: 'https://youtube.com/watch?v=...' })
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  console.log(`Status: ${data.status}, Progress: ${data.progress}%`);

  if (data.status === 'complete') {
    console.log('Match:', data.result.match);
    console.log('Confidence:', data.result.confidence);
    eventSource.close();
  }

  if (data.status === 'error') {
    console.error('Error:', data.message);
    eventSource.close();
  }
};
```

## V7 Algorithm Details

### Text Similarity (70% weight)
- Pure word-based Jaccard index
- Removed character-level matching (too brittle for live performances)
- Handles stage banter, ad-libs, audience interaction

### Audio Similarity (30% weight)
- Chroma STFT: 30%
- Chroma CQT: 35% (best for pitch)
- Tonnetz: 25% (harmonic relationships)
- Spectral Contrast: 10%

### Confidence Levels
- **HIGH**: gap ≥ 0.20 (clear winner)
- **MODERATE**: gap ≥ 0.10 (strong match)
- **LOW**: gap ≥ 0.05 (weak match)
- **VERY_LOW**: gap < 0.05 (ambiguous, needs review)

### Performance Metrics
- Precision: **97.7%**
- F1 Score: **98.8%**
- Tested on: 519 covers, 33 studio songs

## Error Handling

The service includes comprehensive error handling:

- **Invalid YouTube URL**: Returns 400 with error message
- **Download failures**: Streams error at 25% progress
- **Feature extraction errors**: Streams error at 50% progress
- **Transcription failures**: Streams error at 75% progress
- **Matching errors**: Streams error at 90% progress
- **API key issues**: Detected at health check and during processing

## Logging

Logs are written to stdout with the format:

```
2025-10-29 10:30:45 - app - INFO - Processing video: VIDEO_ID
2025-10-29 10:30:50 - audio_processor - INFO - Downloaded audio: Video Title
2025-10-29 10:31:00 - audio_processor - INFO - Audio features extracted successfully
```

## Production Considerations

### Security
- Never commit `.env` file with real API keys
- Use environment-specific `.env` files
- Consider rate limiting for the `/process` endpoint
- Add authentication for production deployment

### Performance
- Consider caching audio features for repeated videos
- Implement queue system for concurrent requests
- Use Redis for progress tracking across instances
- Add retry logic for API failures

### Scaling
- Deploy with Gunicorn/uWSGI instead of Flask dev server
- Use nginx reverse proxy
- Implement request queue (Celery + Redis)
- Add monitoring (Prometheus, Datadog)

### Deployment Example (Gunicorn)

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 --timeout 300 app:app
```

## Troubleshooting

### ffmpeg not found
```bash
brew install ffmpeg  # macOS
sudo apt-get install ffmpeg  # Linux
```

### librosa installation issues
```bash
pip install --upgrade pip setuptools wheel
pip install numba==0.58.1
pip install librosa==0.10.1
```

### ElevenLabs API errors
- Check API key is valid
- Verify API quota hasn't been exceeded
- Check audio file format is supported

### Memory issues with large files
- Adjust librosa sample rate: `sr=16000` instead of `sr=22050`
- Process shorter clips
- Increase system memory

## Development

### Run in debug mode

```bash
export DEBUG=true
python app.py
```

### Run tests (if you add them)

```bash
pytest tests/
```

### Code formatting

```bash
pip install black
black app.py audio_processor.py matcher_v7.py
```

## License

MIT

## Author

Ryan Seay - 2025-10-29
