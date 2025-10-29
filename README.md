# MIC Match - Cover Song Identifier MVP

A premium web application for identifying cover songs using the V7 matching algorithm with **97.7% precision**.

## 🎯 Overview

MIC Match analyzes YouTube cover videos and matches them against a database of 33 studio recordings using advanced audio fingerprinting and lyrics transcription.

### V7 Algorithm Performance
- **Precision:** 97.7%
- **F1 Score:** 98.8%
- **Total Errors:** 12/519 covers
- **High Confidence:** 81.1% of matches

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌───────────────┐
│   Next.js   │─────▶│  Flask API   │─────▶│   librosa +   │
│   Frontend  │◀─────│  (Port 5000) │◀─────│  ElevenLabs   │
└─────────────┘ SSE  └──────────────┘      └───────────────┘
```

### Technology Stack

**Frontend:**
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Server-Sent Events (SSE)

**Backend:**
- Flask 3.0 (Python)
- librosa (audio fingerprinting)
- ElevenLabs API (lyrics transcription)
- yt-dlp (YouTube download)

### V7 Algorithm Features

**Text Similarity:** 100% word-based (Jaccard index)
- Removed character-level matching (was causing false negatives on live performances)

**Audio Similarity:** Harmonic features
- 30% chroma_stft
- 35% chroma_cqt (best for pitch)
- 25% tonnetz (harmonic relationships)
- 10% spectral_contrast

**Weighting:** 30% audio / 70% lyrics
- Prioritizes lyrics reliability over audio variance
- Handles acoustic covers and live arrangements

**Confidence Levels:**
- **HIGH** (gap ≥0.20): Auto-match ✅
- **MODERATE** (gap ≥0.10): Auto-match ✅
- **LOW** (gap ≥0.05): Human review recommended ⚠️
- **VERY_LOW** (gap <0.05): No match displayed ❌

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- ffmpeg
- ElevenLabs API key

### 1. Install Frontend Dependencies

```bash
npm install
```

### 2. Set Up Backend

```bash
cd backend
./setup.sh  # Creates venv, installs dependencies
```

### 3. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env and add your ELEVENLABS_API_KEY
```

### 4. Start Development Servers

Terminal 1 (Backend):
```bash
cd backend
source venv/bin/activate
python app.py
# Running on http://localhost:5000
```

Terminal 2 (Frontend):
```bash
npm run dev
# Running on http://localhost:3000
```

### 5. Test the Application

Visit http://localhost:3000 and enter a YouTube URL of a cover song from the database.

## 📁 Project Structure

```
mic-match/
├── app/                      # Next.js app directory
│   ├── api/                 # API routes
│   │   ├── match/          # Cover matching endpoint
│   │   ├── songs/          # Song list endpoint
│   │   └── types.ts        # TypeScript definitions
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── page.tsx            # Main UI
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── backend/                 # Flask backend
│   ├── app.py              # Main Flask app
│   ├── matcher_v7.py       # V7 matching algorithm
│   ├── audio_processor.py  # Audio processing
│   ├── studio_library.json # Song database
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
├── public/                  # Static assets
├── studio_songs.json        # Frontend song list
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

## 🎵 Test Database (33 Songs)

The application includes 33 studio songs across 11 genres:

- **Alternative Rock:** Radiohead, Gorillaz, Audioslave, A Perfect Circle
- **Classic Rock:** Pink Floyd, Fleetwood Mac
- **Grunge:** Nirvana
- **Britpop:** Oasis
- **R&B Neo-Soul:** Frank Ocean, Amy Winehouse
- **Experimental Electronic:** Billie Eilish
- **Electronic Pop:** Daft Punk
- **Indie:** Death Cab For Cutie, The Shins, Portugal. The Man
- **Emo Post-Hardcore:** The Used
- **Post-Punk Revival:** Yeah Yeah Yeahs
- **Alternative Pop-Rock:** Alanis Morissette

⚠️ **Important:** Covers must have vocals - instrumental covers won't match.

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```env
ELEVENLABS_API_KEY=your_key_here
STUDIO_LIBRARY_PATH=./studio_library.json
PORT=5000
DEBUG=True
```

**Frontend (vercel.json):**
```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "http://localhost:5000"
  }
}
```

## 📊 API Documentation

### POST /api/match

Analyzes a YouTube cover and returns matching results via SSE stream.

**Request:**
```json
{
  "youtubeUrl": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response (SSE Stream):**
```json
{"status":"downloading","progress":25}
{"status":"fingerprinting","progress":50}
{"status":"transcribing","progress":75}
{"status":"matching","progress":90}
{
  "status":"complete",
  "progress":100,
  "result":{
    "match":"Artist - Song Title",
    "confidence":"HIGH",
    "audioSim":0.75,
    "lyricsSim":0.92,
    "combinedScore":0.87,
    "gap":0.25
  }
}
```

### GET /api/songs

Returns the list of songs in the test database.

**Response:**
```json
{
  "songs": [
    {"artist":"Oasis","title":"Wonderwall","genre":"Britpop"},
    ...
  ],
  "count": 33
}
```

## 🚀 Deployment

### Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Configure environment variables in Vercel dashboard:
- `NEXT_PUBLIC_API_URL`: Your backend URL

### Backend (Python Server)

1. **Railway / Render / Heroku:**
   - Upload backend/ folder
   - Set ELEVENLABS_API_KEY environment variable
   - Deploy with `python app.py`

2. **Requirements:**
   - Python 3.9+
   - 2GB RAM minimum
   - ffmpeg installed
   - ElevenLabs API access

## 🧪 Testing

### Test Backend API

```bash
cd backend
source venv/bin/activate
python test_api.py 'https://www.youtube.com/watch?v=VIDEO_ID'
```

### Test Frontend Locally

```bash
npm run dev
# Visit http://localhost:3000
```

## 📈 Performance Metrics

### V7 Algorithm Results (519 covers tested)

| Confidence | Matches | Precision |
|------------|---------|-----------|
| HIGH       | 421     | 100.0%    |
| MODERATE   | 53      | 100.0%    |
| LOW        | 18      | 100.0%    |
| VERY_LOW   | 27      | 55.6%     |

**Total: 97.7% precision, 98.8% F1 score**

### Improvements Over V6

- Errors reduced from 48 to 12 (-75%)
- Precision improved from 90.8% to 97.7% (+6.9pp)
- HIGH confidence matches increased from 42.8% to 81.1% (+38.3pp)

## 🐛 Troubleshooting

**Frontend won't start:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Backend errors:**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt --upgrade
python app.py
```

**ffmpeg not found:**
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
```

**ElevenLabs API errors:**
- Verify API key in backend/.env
- Check API quota at elevenlabs.io
- Ensure audio file is < 25MB

## 📝 Development Notes

### Key Design Decisions

1. **SSE over WebSockets:** Simpler, unidirectional, works through proxies
2. **30/70 Audio/Lyrics Weighting:** Lyrics are more reliable signal
3. **Word-Only Text Similarity:** Character matching was too brittle
4. **Confidence-Based Display:** Only show HIGH/MODERATE, hide VERY_LOW

### Future Enhancements

- [ ] Genre-specific weighting (acoustic: 20/80, electronic: 40/60)
- [ ] Transcription quality scoring
- [ ] Batch processing for multiple URLs
- [ ] User accounts and history
- [ ] Expanded song database

## 🤝 Contributing

This is an internal MVP for testing. For production deployment:

1. Add authentication
2. Implement rate limiting
3. Set up CDN for static assets
4. Monitor ElevenLabs API usage
5. Add error tracking (Sentry)
6. Implement caching layer

## 📄 License

Internal use only - MIC

## 🔗 Links

- **Backend Documentation:** `backend/README.md`
- **API Documentation:** `app/api/README.md`
- **Quick Start Guide:** `backend/QUICKSTART.md`

---

**Built with ❤️ using V7 Algorithm (97.7% precision)**
