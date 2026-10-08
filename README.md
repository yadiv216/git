# CareerSage Website

Project contents are separated by responsibility:

- `Frontend/` — React/Vite interface, including the formatted, readable report.
- `Backend/` — FastAPI routes, resume file parsing, local account and session persistence.
- `Datasets/Geek Girls/` — supplied scoring and interview modules, role rules, and API contract.
- `Documentation/` — system architecture, Week 3 review, integration handoff, and Pixel Petals presentation.
- `Other/Static-Prototype/` — standalone HTML/CSS/JS prototype, separate from the integrated app.

## Start (Windows PowerShell)

Keep these folders together after extraction. The backend imports modules from `Datasets/Geek Girls/`.

Start the backend in the first PowerShell window from this folder:

```powershell
cd .\Backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Start the frontend in a second window from this folder:

```powershell
cd .\Frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

Open the local URL Vite prints (normally `http://localhost:5173`). The template connects to `http://127.0.0.1:8000`.

Optional production preview from `Frontend/`: `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 4173`.

Requirements: Node.js/npm and Python 3.10+. Ollama `qwen3:4b` is optional; rule-based and template fallbacks support core flows when it is unavailable. The supplied dataset folder contains code/rules and role keywords, not a separate training corpus.

The backend creates `Backend/user_state.json` at runtime. It contains password hashes and personal resume/session information; it is not included in this archive and should not be shared.

See `Documentation/WEEK_3_DELIVERABLES_REVIEW.md` for test evidence and measured build size, and `Documentation/SYSTEM_ARCHITECTURE.md` for component and data-flow details.
