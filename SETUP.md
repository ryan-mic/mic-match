# MIC Match - Complete Setup Guide

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Python 3.9+ installed (`python3 --version`)
- [ ] ffmpeg installed (`ffmpeg -version`)
- [ ] ElevenLabs API key (from elevenlabs.io)
- [ ] Git configured

## 🚀 Complete Setup (5 Minutes)

### Step 1: Frontend Setup

```bash
cd /Users/ryanseay/Documents/MIC-code/ryan-private/mic-match

# Install dependencies
npm install

# Verify installation
npm run dev
# Should see "Ready - started server on 0.0.0.0:3000"
# Press Ctrl+C to stop
```

### Step 2: Backend Setup

```bash
# Navigate to backend folder
cd backend

# Run automated setup
./setup.sh

# This script will:
# ✓ Check Python version
# ✓ Check ffmpeg installation
# ✓ Create virtual environment
# ✓ Install all dependencies
# ✓ Create .env template
```

### Step 3: Configure ElevenLabs API

```bash
# Edit the .env file
nano .env  # or use your preferred editor

# Add your API key:
ELEVENLABS_API_KEY=your_actual_key_here
STUDIO_LIBRARY_PATH=./studio_library.json
PORT=5000
DEBUG=True
```

### Step 4: Test Backend Standalone

```bash
# Activate virtual environment
source venv/bin/activate

# Start Flask server
python app.py

# You should see:
# * Running on http://127.0.0.1:5000
```

Keep this terminal open and open a new one for testing.

### Step 5: Test Backend API

In a new terminal:

```bash
cd backend
source venv/bin/activate

# Test with a known cover
python test_api.py 'https://www.youtube.com/watch?v=6hzrDeceEKc'

# Expected output:
# ✓ Health check passed
# ✓ Processing video...
# ✓ Match found: Artist - Song
# ✓ Confidence: HIGH
```

### Step 6: Start Full Stack

Terminal 1 (Backend):
```bash
cd backend
source venv/bin/activate
python app.py
# Keep running
```

Terminal 2 (Frontend):
```bash
cd ..  # Back to root
npm run dev
# Visit http://localhost:3000
```

### Step 7: Test End-to-End

1. Open http://localhost:3000 in your browser
2. Scroll down to see the 33-song database
3. Find a cover on YouTube for one of these songs
4. Paste the YouTube URL
5. Click "Analyze Cover"
6. Watch real-time progress
7. See the match result!

## 🧪 Test Videos

Here are some YouTube covers you can test (must be for songs in the database):

**Oasis - Wonderwall:**
- Search YouTube for "oasis wonderwall cover"
- Find any vocal cover (not instrumental)

**Nirvana - Smells Like Teen Spirit:**
- Search YouTube for "smells like teen spirit cover"
- Use covers with clear vocals

**Pink Floyd - Time:**
- Search YouTube for "pink floyd time cover"
- Acoustic versions work great

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Frontend loads at http://localhost:3000
- [ ] Backend responds at http://localhost:5000/health
- [ ] Song database displays (33 songs)
- [ ] Can submit YouTube URL
- [ ] Progress updates show in real-time
- [ ] Match result appears with confidence level

## 🐛 Common Issues & Fixes

### Issue: "ffmpeg not found"

**Fix:**
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
# Download from ffmpeg.org
```

### Issue: "ElevenLabs API error"

**Fix:**
1. Check API key is correct in backend/.env
2. Verify API quota at elevenlabs.io/subscription
3. Ensure audio file is < 25MB

### Issue: "Module not found" errors

**Fix:**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt --upgrade
```

### Issue: Frontend can't connect to backend

**Fix:**
1. Verify backend is running on port 5000
2. Check browser console for CORS errors
3. Ensure both servers are running simultaneously

### Issue: "Port already in use"

**Fix:**
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or use a different port
export PORT=5001
python app.py
```

## 📊 Expected Performance

**HIGH Confidence Matches (81%):**
- Should match in < 60 seconds
- Audio + Lyrics similarity both > 50%
- Gap > 0.20

**MODERATE Confidence (10%):**
- Match in 60-90 seconds
- One similarity metric lower
- Gap 0.10-0.20

**LOW Confidence (4%):**
- Shows "Needs Review"
- Human verification recommended
- Gap 0.05-0.10

**VERY_LOW/No Match (5%):**
- Shows "No Match Found"
- Not displayed to avoid false positives
- Gap < 0.05

## 🚀 Next Steps

### Deploy to Production

**Frontend (Vercel):**
```bash
npm i -g vercel
vercel
# Follow prompts
# Set NEXT_PUBLIC_API_URL to your backend URL
```

**Backend (Railway/Render/Heroku):**
1. Push backend/ folder to git
2. Set environment variables
3. Deploy with `python app.py`

### Add More Songs

1. Get studio recording FLAC/MP3
2. Extract features: `python -c "import audio_processor; ..."`
3. Transcribe lyrics: `python -c "import audio_processor; ..."`
4. Add to studio_library.json
5. Restart backend

### Monitor Performance

- Check ElevenLabs API usage
- Monitor response times
- Review VERY_LOW confidence matches
- Gather user feedback

## 📚 Additional Documentation

- **Complete README:** `README.md`
- **API Documentation:** `app/api/README.md`
- **Backend Guide:** `backend/README.md`
- **Quick Start:** `backend/QUICKSTART.md`

## 🎯 Success Criteria

Your MVP is ready when:

✅ All tests pass
✅ Can match HIGH confidence covers in < 60s
✅ Frontend shows real-time progress
✅ Results display correctly
✅ Error handling works gracefully
✅ Internal users can test successfully

---

**Need Help?** Check `backend/README.md` or open an issue in the repo.

**Ready to Deploy?** See "Next Steps" section above.

**Happy Matching! 🎵**
