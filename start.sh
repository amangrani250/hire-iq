#!/usr/bin/env bash
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   HireIQ — AI Interview Platform     ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Check Python ──────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "❌  Python 3 not found. Please install Python 3.11+"
  exit 1
fi

# ── Check Node ────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "❌  Node.js not found. Please install Node.js 18+"
  exit 1
fi

# ── Backend ───────────────────────────────────────────────────
echo "📦  Setting up backend..."
cd backend

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  echo "⚠️   Please edit backend/.env and add your GROQ_API_KEY"
  echo "     Get a free key at: https://console.groq.com"
  echo ""
  read -p "Press Enter after adding your key..."
fi

if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt
echo "✅  Backend dependencies installed"

# Start backend in background
uvicorn main:app --port 8000 &
BACKEND_PID=$!
echo "🚀  Backend running on http://localhost:8000 (PID $BACKEND_PID)"

cd ..

# ── Frontend ──────────────────────────────────────────────────
echo ""
echo "📦  Setting up frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
  npm install --silent
fi
echo "✅  Frontend dependencies installed"

echo ""
echo "🎙️   Starting HireIQ at http://localhost:3000"
echo "     Press Ctrl+C to stop"
echo ""

npm start

# Cleanup
kill $BACKEND_PID 2>/dev/null || true
