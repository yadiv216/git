# Backend

FastAPI adapter for the frontend. It imports supplied modules from `../Datasets/Geek Girls/`.

Install dependencies with `python -m pip install -r requirements.txt`, then run `uvicorn main:app --reload --host 127.0.0.1 --port 8000` from this folder.

The service persists accounts, extracted resume text, analyses and interview sessions in `user_state.json`. Keep it private. Ollama with `qwen3:4b` is optional; scoring and template fallbacks remain available without it. `GET /health` reports whether that optional model is installed.
