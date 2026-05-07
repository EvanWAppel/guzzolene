@echo off
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

echo Installing dependencies...
.venv\Scripts\pip install -r requirements.txt -q

echo Generating plots...
.venv\Scripts\python main.py
