# CareerSage backend integration

The React frontend connects to the FastAPI service in `backend/`. It starts with empty states; it does not include demo users, scores, questions, or recommendation data.

## Authentication

The login screen has separate **Log in** and **Create an account** modes:

- Existing users submit email and password to `POST /auth/login`.
- New users submit name, email, optional phone, and password to `POST /auth/register`.
- Successful responses populate the profile used by the frontend. Passwords are stored as salted PBKDF2 hashes by the local backend.
- Unknown accounts and incorrect passwords return an error instead of silently creating or switching accounts.

## Resume and dashboard

- `uploadResume(file, userId)` sends PDF or DOCX in multipart field `resume` to `POST /resume/analyze`.
- `getDashboard(userId)` calls `GET /dashboard?userId=...` and refreshes dashboard data from that user's latest analysis.
- The backend maps results into the empty shape in `src/data.js`; it does not add sample scores or sample progress.
- The service also exposes `POST /analyze-resume`, `/generate-questions`, `/score-answer`, and `/report` as specified in the supplied `Geek Girls/Geek Girls/API_CONTRACT.md`.

## Persistence and local setup

Accounts, extracted resume text, analyses, questions, and scored answers are saved in `backend/user_state.json`. This local file keeps data across browser reloads and backend restarts. It contains personal information and must not be shared. It is excluded from the source bundle and Git.

Copy `.env.example` to `.env`; the local API URL is `http://127.0.0.1:8000`. Install the frontend with `npm ci`. For the backend, run `python -m pip install -r backend/requirements.txt`, then start it from the `backend` directory with `uvicorn main:app --reload --host 127.0.0.1 --port 8000`. Keep the sibling `Geek Girls/Geek Girls` folder in the supplied layout because the adapter imports those Python modules directly.

Ollama with `qwen3:4b` is optional. Rule-based scoring and template fallbacks run without it. The PPT describes resume parsing and local inference; the supplied API contract and Python modules specify the implementation details.
