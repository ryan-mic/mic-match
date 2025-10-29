// Shared types for API routes

// Song data structure
export interface Song {
  artist: string;
  title: string;
  genre: string;
}

// Match API types
export interface MatchRequest {
  youtubeUrl: string;
}

export interface MatchResult {
  artist: string;
  title: string;
  genre?: string;
}

export type ConfidenceLevel = 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';

export type ProcessingStatus =
  | 'downloading'
  | 'fingerprinting'
  | 'transcribing'
  | 'matching'
  | 'complete'
  | 'error';

export interface BaseProgressUpdate {
  status: ProcessingStatus;
  progress: number;
  message?: string;
}

export interface DownloadingUpdate extends BaseProgressUpdate {
  status: 'downloading';
}

export interface FingerprintingUpdate extends BaseProgressUpdate {
  status: 'fingerprinting';
}

export interface TranscribingUpdate extends BaseProgressUpdate {
  status: 'transcribing';
}

export interface MatchingUpdate extends BaseProgressUpdate {
  status: 'matching';
}

export interface CompleteUpdate extends BaseProgressUpdate {
  status: 'complete';
  match: MatchResult;
  confidence: ConfidenceLevel;
  audioSim: number;
  lyricsSim: number;
}

export interface ErrorUpdate extends BaseProgressUpdate {
  status: 'error';
  error: string;
}

export type StreamUpdate =
  | DownloadingUpdate
  | FingerprintingUpdate
  | TranscribingUpdate
  | MatchingUpdate
  | CompleteUpdate
  | ErrorUpdate;

// Songs API types
export interface SongsResponse {
  songs: Song[];
  count: number;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}
