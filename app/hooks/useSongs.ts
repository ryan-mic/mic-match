import { useState, useEffect } from 'react';
import type { Song } from '@/app/api/types';

interface UseSongsResult {
  songs: Song[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSongs(): UseSongsResult {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSongs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/songs');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSongs(data.songs);
    } catch (err) {
      console.error('Error fetching songs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load songs');
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  return {
    songs,
    loading,
    error,
    refetch: fetchSongs,
  };
}
