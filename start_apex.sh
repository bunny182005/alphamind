#!/usr/bin/env bash
# ── Apex Quant Launcher ─────────────────────────────────────────
# Starts the FastAPI bridge server + React UI dev server.
# Usage: ./start_apex.sh
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
VENV="$ROOT/.venv"
UI="$ROOT/ui"

echo "┌─────────────────────────────────────────────────┐"
echo "│        APEX QUANT — Institutional Terminal       │"
echo "│  TradingAgents Bridge + React UI Launcher        │"
echo "└─────────────────────────────────────────────────┘"
echo ""

# 1. Activate virtual environment
if [ -f "$VENV/bin/activate" ]; then
  source "$VENV/bin/activate"
else
  echo "⚠  No .venv found. Install deps with: pip install -e '.[dev]' fastapi uvicorn"
  exit 1
fi

# 2. Start FastAPI server in background
echo "▶ Starting FastAPI bridge on :8000 …"
cd "$ROOT"
python -m uvicorn server.app:app --host 0.0.0.0 --port 8000 --log-level info &
API_PID=$!
echo "  PID=$API_PID"

# Wait a moment for API to come up
sleep 2

# 3. Start React dev server
echo "▶ Starting React UI on :5173 …"
cd "$UI"
npm run dev &
UI_PID=$!
echo "  PID=$UI_PID"

echo ""
echo "┌─────────────────────────────────────────────────┐"
echo "│  ✓ Apex Quant running                            │"
echo "│    API : http://localhost:8000                   │"
echo "│    UI  : http://localhost:5173                   │"
echo "│                                                   │"
echo "│  Press Ctrl+C to stop both services             │"
echo "└─────────────────────────────────────────────────┘"

# Trap Ctrl+C and kill both processes
cleanup() {
  echo ""
  echo "Shutting down…"
  kill $API_PID $UI_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM

wait
