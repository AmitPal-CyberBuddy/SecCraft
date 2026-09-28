#!/bin/bash
export PYTHONPATH=/home/user/.local/lib/python3.11/site-packages:/usr/local/lib/python3.11/dist-packages:$PYTHONPATH
cd /home/user/WiFiForge/backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
