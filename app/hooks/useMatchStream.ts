import { useState, useCallback } from 'react';
import type { StreamUpdate, CompleteUpdate } from '@/app/api/types';

interface UseMatchStreamResult {
  startMatch: (youtubeUrl: string) => void;
  stopMatch: () => void;
  currentUpdate: StreamUpdate | null;
  isStreaming: boolean;
  error: string | null;
}

export function useMatchStream(): UseMatchStreamResult {
  const [currentUpdate, setCurrentUpdate] = useState<StreamUpdate | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopMatch = useCallback(() => {
    setIsStreaming(false);
    setCurrentUpdate(null);
    setError(null);
  }, []);

  const startMatch = useCallback(async (youtubeUrl: string) => {
    setIsStreaming(true);
    setError(null);
    setCurrentUpdate(null);

    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          setIsStreaming(false);
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
            const update: StreamUpdate = JSON.parse(jsonData);

            setCurrentUpdate(update);

            // If complete or error, stop streaming
            if (update.status === 'complete' || update.status === 'error') {
              setIsStreaming(false);
              if (update.status === 'error') {
                setError(update.error);
              }
              reader.cancel(); // Cancel the stream
              break;
            }
          } catch (parseError) {
            console.error('Error parsing SSE data:', parseError);
          }
        }
      }
    } catch (err) {
      console.error('Stream error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsStreaming(false);
    }
  }, []);

  return {
    startMatch,
    stopMatch,
    currentUpdate,
    isStreaming,
    error,
  };
}
