'use client';

import { useState } from 'react';
import studioSongs from '../studio_songs.json';

// Types
interface Song {
  artist: string;
  title: string;
  genre: string;
}

interface MatchResult {
  match: Song | null;
  confidence: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW' | null;
  audioSim: number;
  lyricsSim: number;
}

type ProcessingStage = 'idle' | 'downloading' | 'fingerprinting' | 'transcribing' | 'matching' | 'complete' | 'error';

// Grouped songs by genre
const groupedSongs = studioSongs.reduce((acc, song) => {
  const genre = song.genre || 'Unknown';
  if (!acc[genre]) {
    acc[genre] = [];
  }
  acc[genre].push(song);
  return acc;
}, {} as Record<string, Song[]>);

const genreOrder = ['Modern Pop', 'Alternative R&B', 'R&B Neo-Soul', 'Indie Alternative', 'Indie Rock', 'Indie Folk-Rock', 'Indie Post-Punk', 'Emo Post-Hardcore', '90s Alt Rock', 'Experimental Electronic', 'Unknown'];

export default function HomePage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle');
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDatabase, setShowDatabase] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Validate YouTube URL
  const validateYouTubeUrl = (url: string): boolean => {
    if (!url) {
      setUrlError('Please enter a YouTube URL');
      return false;
    }
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+(&[\w=]*)*$/;
    if (!youtubeRegex.test(url)) {
      setUrlError('Please enter a valid YouTube URL');
      return false;
    }
    setUrlError(null);
    return true;
  };

  // Handle form submission
  const handleAnalyze = async () => {
    if (!validateYouTubeUrl(youtubeUrl)) return;

    setError(null);
    setResult(null);
    setProcessingStage('downloading');

    try {
      // Make API call with SSE streaming
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeUrl }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          try {
            const jsonStr = line.substring(6); // Remove "data: " prefix
            const data = JSON.parse(jsonStr);

            // Update processing stage based on status
            if (data.status === 'downloading') {
              setProcessingStage('downloading');
            } else if (data.status === 'fingerprinting') {
              setProcessingStage('fingerprinting');
            } else if (data.status === 'transcribing') {
              setProcessingStage('transcribing');
            } else if (data.status === 'matching') {
              setProcessingStage('matching');
            } else if (data.status === 'complete') {
              setResult({
                match: data.match,
                confidence: data.confidence,
                audioSim: data.audioSim,
                lyricsSim: data.lyricsSim,
              });
              setProcessingStage('complete');
            } else if (data.status === 'error') {
              throw new Error(data.message || data.error || 'Processing failed');
            }
          } catch (parseErr) {
            console.error('Error parsing SSE data:', parseErr);
          }
        }
      }
    } catch (err) {
      console.error('Error analyzing cover:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze video. Please try again.');
      setProcessingStage('error');
    }
  };

  // Get confidence badge styling
  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'HIGH':
        return 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-500/50';
      case 'MODERATE':
        return 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/50';
      case 'LOW':
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-300 border-yellow-500/50';
      case 'VERY_LOW':
        return 'bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-300 border-red-500/50';
      default:
        return 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-300 border-gray-500/50';
    }
  };

  // Processing stage messages
  const getProcessingMessage = (stage: ProcessingStage) => {
    switch (stage) {
      case 'downloading':
        return 'Downloading audio from YouTube...';
      case 'fingerprinting':
        return 'Creating audio fingerprint...';
      case 'transcribing':
        return 'Transcribing lyrics with AI...';
      case 'matching':
        return 'Matching against studio recordings...';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Animated background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-16 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12 md:mb-16 animate-fadeIn">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            MIC Match
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-2">
            Cover Song Identifier
          </p>
          <p className="text-sm md:text-base text-slate-400">
            Powered by V7 Algorithm • 97.7% Precision
          </p>
        </div>

        {/* Input Section */}
        <div className="mb-12 animate-slideInUp">
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 md:p-8 shadow-2xl">
            <label htmlFor="youtube-url" className="block text-sm font-medium text-slate-300 mb-3">
              YouTube URL
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  id="youtube-url"
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    setUrlError(null);
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  disabled={processingStage !== 'idle' && processingStage !== 'complete' && processingStage !== 'error'}
                />
                {urlError && (
                  <p className="mt-2 text-sm text-red-400">{urlError}</p>
                )}
              </div>
              <button
                onClick={handleAnalyze}
                disabled={processingStage !== 'idle' && processingStage !== 'complete' && processingStage !== 'error'}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-purple-500/30"
              >
                Analyze Cover
              </button>
            </div>
          </div>
        </div>

        {/* Processing Section */}
        {processingStage !== 'idle' && processingStage !== 'complete' && processingStage !== 'error' && (
          <div className="mb-12 animate-fadeIn">
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-8 shadow-2xl">
              <div className="flex flex-col items-center">
                {/* Spinner */}
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full" />
                  <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" />
                </div>

                {/* Status messages */}
                <div className="space-y-3 text-center">
                  <p className="text-lg font-medium text-white">
                    {getProcessingMessage(processingStage)}
                  </p>

                  {/* Progress indicators */}
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                    <span className={processingStage === 'downloading' || processingStage === 'fingerprinting' || processingStage === 'transcribing' || processingStage === 'matching' ? 'text-purple-400' : ''}>
                      Downloading
                    </span>
                    <span>→</span>
                    <span className={processingStage === 'fingerprinting' || processingStage === 'transcribing' || processingStage === 'matching' ? 'text-purple-400' : ''}>
                      Fingerprinting
                    </span>
                    <span>→</span>
                    <span className={processingStage === 'transcribing' || processingStage === 'matching' ? 'text-purple-400' : ''}>
                      Transcribing
                    </span>
                    <span>→</span>
                    <span className={processingStage === 'matching' ? 'text-purple-400' : ''}>
                      Matching
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Section */}
        {error && processingStage === 'error' && (
          <div className="mb-12 animate-fadeIn">
            <div className="backdrop-blur-xl bg-red-500/10 rounded-2xl border border-red-500/30 p-6 shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-300 mb-1">Error</h3>
                  <p className="text-red-200">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {result && processingStage === 'complete' && (
          <div className="mb-12 animate-fadeIn">
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 md:p-8 shadow-2xl">
              {result.confidence === 'HIGH' || result.confidence === 'MODERATE' ? (
                // Match found
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Match Found!
                      </h2>
                      <p className="text-slate-300">
                        {result.match?.title} by {result.match?.artist}
                      </p>
                    </div>
                    <span className={`px-4 py-2 rounded-full border text-sm font-semibold ${getConfidenceBadge(result.confidence)}`}>
                      {result.confidence} CONFIDENCE
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Audio Similarity */}
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-300">Audio Similarity</span>
                        <span className="text-2xl font-bold text-cyan-400">{(result.audioSim * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
                          style={{ width: `${result.audioSim * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Lyrics Similarity */}
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-300">Lyrics Similarity</span>
                        <span className="text-2xl font-bold text-purple-400">{(result.lyricsSim * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
                          style={{ width: `${result.lyricsSim * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : result.confidence === 'LOW' ? (
                // Needs Review
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold mb-2 text-yellow-400">
                        Needs Review
                      </h2>
                      <p className="text-slate-300">
                        {result.match?.title} by {result.match?.artist}
                      </p>
                    </div>
                    <span className={`px-4 py-2 rounded-full border text-sm font-semibold ${getConfidenceBadge(result.confidence)}`}>
                      {result.confidence} CONFIDENCE
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Audio Similarity */}
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-300">Audio Similarity</span>
                        <span className="text-2xl font-bold text-cyan-400">{(result.audioSim * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
                          style={{ width: `${result.audioSim * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Lyrics Similarity */}
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-300">Lyrics Similarity</span>
                        <span className="text-2xl font-bold text-purple-400">{(result.lyricsSim * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
                          style={{ width: `${result.lyricsSim * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // No Match Found
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                    <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-slate-300">
                    No Match Found
                  </h2>
                  <p className="text-slate-400">
                    This cover doesn&apos;t match any songs in our database
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Song Database Section */}
        <div className="animate-slideInUp" style={{ animationDelay: '0.2s' }}>
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <button
              onClick={() => setShowDatabase(!showDatabase)}
              className="w-full px-6 md:px-8 py-6 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <div className="text-left">
                <h2 className="text-2xl font-bold mb-1">Song Database</h2>
                <p className="text-sm text-slate-400">
                  {studioSongs.length} studio recordings available for matching
                </p>
              </div>
              <svg
                className={`w-6 h-6 text-slate-400 transition-transform ${showDatabase ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDatabase && (
              <div className="px-6 md:px-8 pb-8 animate-fadeIn">
                {/* Warning Banner */}
                <div className="mb-6 backdrop-blur-xl bg-amber-500/10 rounded-xl border border-amber-500/30 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <p className="text-amber-200 font-medium">Vocals Required</p>
                      <p className="text-amber-300/80 text-sm">Instrumental covers won&apos;t match - our algorithm needs vocal content for accurate identification</p>
                    </div>
                  </div>
                </div>

                {/* Songs by Genre */}
                <div className="space-y-6">
                  {genreOrder.map((genre) => {
                    const songs = groupedSongs[genre];
                    if (!songs || songs.length === 0) return null;

                    return (
                      <div key={genre}>
                        <h3 className="text-lg font-semibold text-purple-300 mb-3">
                          {genre} ({songs.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {songs.map((song, index) => (
                            <div
                              key={`${song.artist}-${song.title}-${index}`}
                              className="backdrop-blur-xl bg-white/5 rounded-lg border border-white/10 p-4 hover:bg-white/10 transition-all transform hover:scale-[1.02]"
                            >
                              <p className="font-semibold text-white mb-1">{song.title}</p>
                              <p className="text-sm text-slate-400">{song.artist}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-slate-500 text-sm">
          <p>MIC Match • Cover Song Identification System</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-slideInUp {
          animation: slideInUp 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}
