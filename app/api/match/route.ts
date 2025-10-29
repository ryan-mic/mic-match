import { NextRequest, NextResponse } from 'next/server';

// Types
interface MatchRequest {
  youtubeUrl: string;
}

interface ProgressUpdate {
  status: 'downloading' | 'fingerprinting' | 'transcribing' | 'matching' | 'complete' | 'error';
  progress: number;
  message?: string;
}

interface MatchResult {
  artist: string;
  title: string;
  genre?: string;
}

interface CompleteUpdate extends ProgressUpdate {
  status: 'complete';
  match: MatchResult;
  confidence: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
  audioSim: number;
  lyricsSim: number;
}

interface ErrorUpdate extends ProgressUpdate {
  status: 'error';
  error: string;
}

type StreamUpdate = ProgressUpdate | CompleteUpdate | ErrorUpdate;

// YouTube URL validation
function isValidYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Check for various YouTube domains
    const validDomains = [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'youtu.be',
    ];

    if (!validDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
      return false;
    }

    // Check for video ID in various formats
    if (hostname.includes('youtu.be')) {
      return urlObj.pathname.length > 1; // Has video ID after /
    }

    // For youtube.com, check for v parameter or /embed/ or /watch path
    const hasVideoParam = urlObj.searchParams.has('v');
    const isEmbedPath = urlObj.pathname.includes('/embed/');
    const isWatchPath = urlObj.pathname.includes('/watch');

    return hasVideoParam || isEmbedPath || isWatchPath;
  } catch {
    return false;
  }
}

// CORS headers for development
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

// Main POST handler
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    // Parse and validate request body
    const body: MatchRequest = await request.json();

    if (!body.youtubeUrl) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    if (!isValidYouTubeUrl(body.youtubeUrl)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Create readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Call Python backend (use environment variable or fallback to localhost)
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
          const response = await fetch(`${backendUrl}/process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ youtube_url: body.youtubeUrl }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            const errorUpdate: ErrorUpdate = {
              status: 'error',
              progress: 0,
              error: `Backend error: ${response.status} - ${errorText}`,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorUpdate)}\n\n`));
            controller.close();
            return;
          }

          // Check if response has body
          if (!response.body) {
            const errorUpdate: ErrorUpdate = {
              status: 'error',
              progress: 0,
              error: 'No response body from backend',
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorUpdate)}\n\n`));
            controller.close();
            return;
          }

          // Read streaming response from Python backend
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            // Decode chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine || !trimmedLine.startsWith('data: ')) {
                continue;
              }

              try {
                // Parse the JSON data from the SSE line
                const jsonData = trimmedLine.substring(6); // Remove 'data: ' prefix
                const data = JSON.parse(jsonData);

                // Transform backend response to our format
                let update: StreamUpdate;

                if (data.status === 'complete') {
                  update = {
                    status: 'complete',
                    progress: 100,
                    match: {
                      artist: data.match.artist,
                      title: data.match.title,
                      genre: data.match.genre,
                    },
                    confidence: data.confidence,
                    audioSim: data.audio_similarity,
                    lyricsSim: data.lyrics_similarity,
                  } as CompleteUpdate;
                } else if (data.status === 'error') {
                  update = {
                    status: 'error',
                    progress: data.progress || 0,
                    error: data.error || data.message || 'Unknown error',
                  } as ErrorUpdate;
                } else {
                  update = {
                    status: data.status,
                    progress: data.progress,
                    message: data.message,
                  } as ProgressUpdate;
                }

                // Forward to client
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));

              } catch (parseError) {
                console.error('Error parsing backend response:', parseError);
                // Continue processing other lines
              }
            }
          }

          controller.close();

        } catch (error) {
          console.error('Stream error:', error);
          const errorUpdate: ErrorUpdate = {
            status: 'error',
            progress: 0,
            error: error instanceof Error ? error.message : 'Unknown streaming error',
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorUpdate)}\n\n`));
          controller.close();
        }
      },
    });

    // Return streaming response with SSE headers
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...getCorsHeaders(),
      },
    });

  } catch (error) {
    console.error('Request error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: getCorsHeaders(),
      }
    );
  }
}
