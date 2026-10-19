#!/bin/bash
# Double-click (or run in Terminal) to start the Atlas Scheduling demo on http://localhost:5173
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
npm run dev -- --open
