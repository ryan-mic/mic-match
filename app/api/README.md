# MIC Match API Routes

This directory contains the Next.js API routes for the MIC Match application.

## Endpoints

### POST /api/match

Processes a YouTube URL to match it against the studio songs database.

**Request Body:**
```json
{
  "youtubeUrl": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
Server-Sent Events (SSE) stream with the following event types:

1. **Downloading**
```json
{
  "status": "downloading",
  "progress": 25,
  "message": "Downloading audio from YouTube..."
}
```

2. **Fingerprinting**
```json
{
  "status": "fingerprinting",
  "progress": 50,
  "message": "Creating audio fingerprint..."
}
```

3. **Transcribing**
```json
{
  "status": "transcribing",
  "progress": 75,
  "message": "Transcribing lyrics..."
}
```

4. **Matching**
```json
{
  "status": "matching",
  "progress": 90,
  "message": "Finding best match..."
}
```

5. **Complete**
```json
{
  "status": "complete",
  "progress": 100,
  "match": {
    "artist": "Oasis",
    "title": "Wonderwall",
    "genre": "Unknown"
  },
  "confidence": "HIGH",
  "audioSim": 0.95,
  "lyricsSim": 0.87
}
```

6. **Error**
```json
{
  "status": "error",
  "progress": 0,
  "error": "Error message here"
}
```

**Confidence Levels:**
- `HIGH`: Both audio and lyrics similarity > 0.8
- `MODERATE`: One metric > 0.8, other > 0.6
- `LOW`: Metrics between 0.4-0.6
- `VERY_LOW`: Metrics below 0.4

**Status Codes:**
- `200`: Success (streaming response)
- `400`: Invalid request (missing or invalid YouTube URL)
- `500`: Server error

**Example Usage:**
```typescript
const eventSource = new EventSource('/api/match', {
  method: 'POST',
  body: JSON.stringify({ youtubeUrl: 'https://youtube.com/watch?v=...' })
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.status, data.progress);

  if (data.status === 'complete') {
    console.log('Match found:', data.match);
    eventSource.close();
  }
};
```

### GET /api/songs

Returns the list of available studio songs from the database.

**Response:**
```json
{
  "songs": [
    {
      "artist": "Oasis",
      "title": "Wonderwall",
      "genre": "Unknown"
    },
    {
      "artist": "Nirvana",
      "title": "Smells Like Teen Spirit",
      "genre": "Unknown"
    }
    // ... more songs
  ],
  "count": 33
}
```

**Status Codes:**
- `200`: Success
- `404`: Songs file not found
- `500`: Server error

**Example Usage:**
```typescript
const response = await fetch('/api/songs');
const data = await response.json();
console.log(`Loaded ${data.count} songs`);
```

## Backend Service

Both routes depend on a Python backend service running at `http://localhost:5000/process`.

The match endpoint forwards requests to this service and streams the response back to the client.

## Development

**CORS Headers:**
All routes include CORS headers for development:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

**Type Safety:**
All types are defined in `/app/api/types.ts` and can be imported throughout the application:

```typescript
import type { StreamUpdate, Song, ConfidenceLevel } from '@/app/api/types';
```

## Error Handling

All routes include comprehensive error handling:
- Request validation (YouTube URL format)
- Backend communication errors
- JSON parsing errors
- File system errors (songs route)
- Network timeouts

Errors are returned with appropriate HTTP status codes and descriptive messages.
