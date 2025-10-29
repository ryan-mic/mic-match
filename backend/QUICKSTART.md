# Quick Start Guide

Get the audio processing backend running in 5 minutes.

## Prerequisites

- Python 3.9+
- ffmpeg (`brew install ffmpeg` on macOS)
- ElevenLabs API key ([Get one here](https://elevenlabs.io/app/settings/api-keys))

## Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Run automated setup
./setup.sh

# 3. Edit .env file with your API key
nano .env
# Add: ELEVENLABS_API_KEY=your_actual_key_here

# 4. (Optional) Add your studio library data
# Replace studio_library.json with your actual song data
```

## Run Server

```bash
# Activate virtual environment
source venv/bin/activate

# Start Flask server
python app.py
```

Server runs at `http://localhost:5000`

## Test API

```bash
# Health check
curl http://localhost:5000/health

# Process a video (in another terminal)
python test_api.py 'https://youtube.com/watch?v=dQw4w9WgXcQ'
```

## API Usage

### Using curl (SSE stream)

```bash
curl -N -X POST http://localhost:5000/process \
  -H "Content-Type: application/json" \
  -d '{"youtube_url": "https://youtube.com/watch?v=VIDEO_ID"}'
```

### Using JavaScript (fetch API)

```javascript
const response = await fetch('http://localhost:5000/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ youtube_url: 'https://youtube.com/watch?v=...' })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  const lines = text.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      console.log(`${data.progress}%: ${data.message}`);

      if (data.status === 'complete') {
        console.log('Match:', data.result.match);
        console.log('Confidence:', data.result.confidence);
      }
    }
  }
}
```

## Progress Flow

1. **Downloading (0-25%)**: Download audio from YouTube
2. **Fingerprinting (25-50%)**: Extract harmonic features (chroma, tonnetz, spectral)
3. **Transcribing (50-75%)**: Convert audio to text via ElevenLabs
4. **Matching (75-90%)**: Run V7 algorithm against studio library
5. **Complete (90-100%)**: Return match results with confidence

## Expected Response

```json
{
  "status": "complete",
  "progress": 100,
  "result": {
    "match": "Artist - Song Title",
    "confidence": "HIGH",
    "combinedScore": 0.87,
    "audioSim": 0.75,
    "lyricsSim": 0.92,
    "gap": 0.25
  }
}
```

## Troubleshooting

**Server won't start:**
```bash
# Check if port 5000 is in use
lsof -ti:5000

# Use different port
PORT=8000 python app.py
```

**ffmpeg not found:**
```bash
brew install ffmpeg  # macOS
sudo apt-get install ffmpeg  # Linux
```

**ElevenLabs API error:**
- Verify API key in .env file
- Check API quota at [ElevenLabs Dashboard](https://elevenlabs.io/app)

**Import errors:**
```bash
source venv/bin/activate
pip install -r requirements.txt
```

## Production Deployment

For production, use Gunicorn instead of Flask dev server:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 --timeout 300 app:app
```

## Next Steps

- Replace `studio_library.json` with your actual song data
- Add authentication middleware
- Implement request queuing for concurrent requests
- Add monitoring and logging
- Deploy behind nginx reverse proxy

## Support

For issues, check the main [README.md](README.md) for detailed documentation.
