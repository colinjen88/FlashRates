#!/bin/bash
# Activate venv and run uvicorn
# We use exec so that the uvicorn process replaces the shell in the PID, allowing PM2 to track it correctly.
source ./venv/bin/activate
exec uvicorn backend.main:app --host 0.0.0.0 --port 8001 --workers 1
