#!/usr/bin/env bash
# run.sh — Start the KeyVisualizer V3 Django dev server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$SCRIPT_DIR/venv"

# Check venv exists
if [ ! -f "$VENV/bin/activate" ]; then
    echo "[ERROR] Virtual environment not found at $VENV"
    echo "        Run: python -m venv venv && pip install -r requirements.txt"
    exit 1
fi

PORT=8000

# Kill any process already using the port
if lsof -ti tcp:$PORT &>/dev/null; then
    echo "[*] Killing existing process on port $PORT..."
    lsof -ti tcp:$PORT | xargs kill -9
fi

echo "[*] Activating virtual environment..."
source "$VENV/bin/activate"

echo "[*] Starting KeyVisualizer V3 at http://127.0.0.1:8000/"
cd "$SCRIPT_DIR"
python manage.py runserver
