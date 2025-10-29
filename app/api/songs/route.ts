import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Type for song data
interface Song {
  artist: string;
  title: string;
  genre: string;
}

// CORS headers for development
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

// GET handler to return the list of songs
export async function GET() {
  try {
    // Read the studio_songs.json file from the project root
    const filePath = join(process.cwd(), 'studio_songs.json');
    const fileContent = readFileSync(filePath, 'utf-8');
    const songs: Song[] = JSON.parse(fileContent);

    return NextResponse.json(
      {
        songs,
        count: songs.length,
      },
      {
        status: 200,
        headers: getCorsHeaders(),
      }
    );

  } catch (error) {
    console.error('Error reading songs:', error);

    // Determine error type and response
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        return NextResponse.json(
          {
            error: 'Songs file not found',
            details: 'studio_songs.json could not be located',
          },
          {
            status: 404,
            headers: getCorsHeaders(),
          }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to load songs',
          details: error.message,
        },
        {
          status: 500,
          headers: getCorsHeaders(),
        }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to load songs',
        details: 'Unknown error',
      },
      {
        status: 500,
        headers: getCorsHeaders(),
      }
    );
  }
}
