#!/bin/bash
# Quick setup script for the audio processing backend
# Usage: ./setup.sh

set -e  # Exit on error

echo "=========================================="
echo "Audio Processing Backend - Setup"
echo "=========================================="
echo ""

# Check Python version
echo "Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Found Python $python_version"
echo ""

# Check ffmpeg
echo "Checking ffmpeg..."
if command -v ffmpeg &> /dev/null; then
    ffmpeg_version=$(ffmpeg -version 2>&1 | head -n1 | awk '{print $3}')
    echo "✓ Found ffmpeg $ffmpeg_version"
else
    echo "✗ ffmpeg not found!"
    echo "  Install with:"
    echo "    macOS: brew install ffmpeg"
    echo "    Linux: sudo apt-get install ffmpeg"
    exit 1
fi
echo ""

# Create virtual environment
echo "Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi
echo ""

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
echo "✓ Virtual environment activated"
echo ""

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip setuptools wheel --quiet
echo "✓ pip upgraded"
echo ""

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt
echo "✓ Dependencies installed"
echo ""

# Setup environment file
echo "Setting up environment file..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✓ Created .env file from template"
    echo "  ⚠ IMPORTANT: Edit .env and add your ELEVENLABS_API_KEY"
else
    echo "✓ .env file already exists"
fi
echo ""

# Setup studio library
echo "Setting up studio library..."
if [ ! -f "studio_library.json" ]; then
    cp studio_library.example.json studio_library.json
    echo "✓ Created studio_library.json from template"
    echo "  ⚠ NOTE: This is just an example. Replace with your actual data."
else
    echo "✓ studio_library.json already exists"
fi
echo ""

# Summary
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Edit .env and add your ELEVENLABS_API_KEY"
echo "  2. Replace studio_library.json with your data"
echo "  3. Start the server:"
echo "     source venv/bin/activate"
echo "     python app.py"
echo ""
echo "Test the API:"
echo "  python test_api.py 'https://youtube.com/watch?v=...'"
echo ""
