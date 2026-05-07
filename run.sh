#!/bin/bash
set -e

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

echo "Installing dependencies..."
.venv/bin/pip install -r requirements.txt -q

echo "Generating plots..."
.venv/bin/python main.py
