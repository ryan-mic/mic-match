#!/usr/bin/env python3
"""
Test script for the audio processing API.

Tests:
1. Health check endpoint
2. Video processing with SSE streaming
3. Error handling for invalid URLs

Usage:
    python test_api.py
"""

import requests
import json
import sys
from typing import Dict, Any


def test_health_check(base_url: str = "http://localhost:5000") -> bool:
    """
    Test the health check endpoint.

    Args:
        base_url: Base URL of the API

    Returns:
        True if healthy, False otherwise
    """
    print("Testing /health endpoint...")

    try:
        response = requests.get(f"{base_url}/health", timeout=5)

        if response.status_code == 200:
            data = response.json()
            print(f"✓ Health check passed: {data['status']}")

            if 'warnings' in data:
                print(f"  Warnings: {', '.join(data['warnings'])}")

            return True
        else:
            print(f"✗ Health check failed: {response.status_code}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"✗ Health check failed: {str(e)}")
        return False


def test_invalid_url(base_url: str = "http://localhost:5000") -> bool:
    """
    Test error handling for invalid YouTube URLs.

    Args:
        base_url: Base URL of the API

    Returns:
        True if error handling works correctly
    """
    print("\nTesting error handling for invalid URL...")

    try:
        response = requests.post(
            f"{base_url}/process",
            json={"youtube_url": "invalid_url"},
            timeout=5
        )

        if response.status_code == 400:
            print(f"✓ Invalid URL correctly rejected: {response.json()['error']}")
            return True
        else:
            print(f"✗ Expected 400, got {response.status_code}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"✗ Error handling test failed: {str(e)}")
        return False


def test_video_processing(
    youtube_url: str,
    base_url: str = "http://localhost:5000"
) -> bool:
    """
    Test video processing with SSE streaming.

    Args:
        youtube_url: YouTube URL to process
        base_url: Base URL of the API

    Returns:
        True if processing succeeds, False otherwise
    """
    print(f"\nTesting video processing: {youtube_url}")
    print("Streaming progress updates...\n")

    try:
        # Use requests with stream=True for SSE
        response = requests.post(
            f"{base_url}/process",
            json={"youtube_url": youtube_url},
            stream=True,
            timeout=600  # 10 minute timeout for long videos
        )

        if response.status_code != 200:
            print(f"✗ Request failed: {response.status_code}")
            print(response.text)
            return False

        # Parse SSE stream
        final_result = None

        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')

                # SSE format: "data: {...}"
                if line.startswith('data: '):
                    json_str = line[6:]  # Remove "data: " prefix
                    data = json.loads(json_str)

                    status = data.get('status')
                    message = data.get('message')
                    progress = data.get('progress', 0)

                    # Print progress
                    print(f"[{progress:3d}%] {status:15} | {message}")

                    # Check for completion or error
                    if status == 'complete':
                        final_result = data.get('result')
                        break
                    elif status == 'error':
                        print(f"\n✗ Processing failed: {message}")
                        return False

        # Verify we got a result
        if final_result:
            print("\n✓ Processing complete!")
            print(f"\nMatch Result:")
            print(f"  Match: {final_result['match']}")
            print(f"  Confidence: {final_result['confidence']}")
            print(f"  Combined Score: {final_result['combinedScore']:.3f}")
            print(f"  Audio Similarity: {final_result['audioSim']:.3f}")
            print(f"  Lyrics Similarity: {final_result['lyricsSim']:.3f}")
            print(f"  Gap: {final_result['gap']:.3f}")

            print(f"\nTop 5 Matches:")
            for i, match in enumerate(final_result.get('top5', [])[:5], 1):
                print(f"  {i}. {match['song']:40} - {match['combined']:.3f}")

            return True
        else:
            print("\n✗ No result received")
            return False

    except requests.exceptions.Timeout:
        print("\n✗ Request timeout (video may be too long)")
        return False
    except requests.exceptions.RequestException as e:
        print(f"\n✗ Request failed: {str(e)}")
        return False
    except Exception as e:
        print(f"\n✗ Unexpected error: {str(e)}")
        return False


def main():
    """Run all tests."""
    base_url = "http://localhost:5000"

    print("="*80)
    print("API TEST SUITE")
    print("="*80)

    # Test 1: Health check
    health_ok = test_health_check(base_url)

    if not health_ok:
        print("\n⚠ Warning: Health check failed. Make sure the server is running.")
        print("  Start server with: python app.py")
        sys.exit(1)

    # Test 2: Invalid URL
    error_ok = test_invalid_url(base_url)

    # Test 3: Video processing (optional - requires valid URL)
    if len(sys.argv) > 1:
        youtube_url = sys.argv[1]
        process_ok = test_video_processing(youtube_url, base_url)
    else:
        print("\n⚠ Skipping video processing test (no URL provided)")
        print("  Run with: python test_api.py 'https://youtube.com/watch?v=...'")
        process_ok = None

    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Health Check: {'✓ PASS' if health_ok else '✗ FAIL'}")
    print(f"Error Handling: {'✓ PASS' if error_ok else '✗ FAIL'}")

    if process_ok is not None:
        print(f"Video Processing: {'✓ PASS' if process_ok else '✗ FAIL'}")

    # Exit code
    all_passed = health_ok and error_ok and (process_ok is None or process_ok)
    sys.exit(0 if all_passed else 1)


if __name__ == '__main__':
    main()
