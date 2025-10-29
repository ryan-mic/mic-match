'use client';

import { useState } from 'react';
import { useMatchStream } from '@/app/hooks/useMatchStream';
import { useSongs } from '@/app/hooks/useSongs';
import type { CompleteUpdate } from '@/app/api/types';

export function MatchExample() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const { startMatch, stopMatch, currentUpdate, isStreaming, error } = useMatchStream();
  const { songs, loading: songsLoading, error: songsError } = useSongs();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (youtubeUrl.trim()) {
      startMatch(youtubeUrl);
    }
  };

  const getProgressColor = () => {
    if (error || currentUpdate?.status === 'error') return 'bg-red-500';
    if (currentUpdate?.status === 'complete') return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'HIGH': return 'text-green-600';
      case 'MODERATE': return 'text-yellow-600';
      case 'LOW': return 'text-orange-600';
      case 'VERY_LOW': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Match Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Match a Song</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="youtube-url" className="block text-sm font-medium mb-2">
              YouTube URL
            </label>
            <input
              id="youtube-url"
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={isStreaming}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isStreaming || !youtubeUrl.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStreaming ? 'Processing...' : 'Start Match'}
            </button>

            {isStreaming && (
              <button
                type="button"
                onClick={stopMatch}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Stop
              </button>
            )}
          </div>
        </form>

        {/* Progress Display */}
        {currentUpdate && (
          <div className="mt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium capitalize">{currentUpdate.status}</span>
              <span>{currentUpdate.progress}%</span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${currentUpdate.progress}%` }}
              />
            </div>

            {currentUpdate.message && (
              <p className="text-sm text-gray-600">{currentUpdate.message}</p>
            )}

            {/* Complete Result */}
            {currentUpdate.status === 'complete' && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Match Found!</h3>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Song:</span>{' '}
                    {(currentUpdate as CompleteUpdate).match.title}
                  </p>
                  <p>
                    <span className="font-medium">Artist:</span>{' '}
                    {(currentUpdate as CompleteUpdate).match.artist}
                  </p>
                  {(currentUpdate as CompleteUpdate).match.genre && (
                    <p>
                      <span className="font-medium">Genre:</span>{' '}
                      {(currentUpdate as CompleteUpdate).match.genre}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Confidence:</span>{' '}
                    <span className={`font-bold ${getConfidenceColor((currentUpdate as CompleteUpdate).confidence)}`}>
                      {(currentUpdate as CompleteUpdate).confidence}
                    </span>
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div>
                      <span className="text-sm font-medium">Audio Similarity:</span>
                      <div className="text-2xl font-bold">
                        {((currentUpdate as CompleteUpdate).audioSim * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Lyrics Similarity:</span>
                      <div className="text-2xl font-bold">
                        {((currentUpdate as CompleteUpdate).lyricsSim * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Available Songs List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Available Songs ({songs.length})</h2>

        {songsLoading ? (
          <p className="text-gray-600">Loading songs...</p>
        ) : songsError ? (
          <p className="text-red-600">{songsError}</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {songs.map((song, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium">{song.title}</p>
                  <p className="text-sm text-gray-600">{song.artist}</p>
                  {song.genre && song.genre !== 'Unknown' && (
                    <p className="text-xs text-gray-500">{song.genre}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
