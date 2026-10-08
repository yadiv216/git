# Week 3 deliverables review

**Review date:** 8 October 2026  
**Project:** CareerSage / Pixel Petals local MVP

## Summary

The MVP has an integrated resume-to-report path and a clearer, sectioned report. The main functional flow passed over HTTP using a synthetic resume and isolated test storage. The frontend and backend are running locally. Ollama is reachable, but `qwen3:4b` is not installed; the backend reports that state and the rule/template fallbacks remain available. Formal participant usability and load/concurrency testing are still outstanding.

| # | Week 3 deliverable | Status | Evidence and remaining work |
|---|---|---|---|
| 1 | Finalize the working MVP/prototype | **Mostly complete** | React/Vite screens cover account access, resume upload/analysis, dashboard, preparation, interview, progress, profile, and report. Latest production build passed. Frontend returns HTTP 200 at `http://127.0.0.1:4173/`; backend health returns HTTP 200 at `http://127.0.0.1:8000/health`. Visual review in a browser on the demo machine is still recommended. |
| 2 | Complete frontend–backend integration | **Implemented; end-to-end API flow passed** | Frontend API adapter maps to FastAPI auth, resume, dashboard, question, scoring, and report routes. Isolated HTTP flow passed: register/login, DOCX upload and analysis, dashboard refresh, question generation, answer scoring, and report generation. Temporary test account and state were removed. |
| 3 | Integrate and validate AI/ML model | **Partial; fallback verified** | Ollama is reachable, but its tags endpoint returned no models and `qwen3:4b` is absent. The code is configured to call Ollama for gap/question/answer suggestions; the tested flow used rule/template fallbacks. ATS resume scoring itself is rule-based. Install the model and repeat question/answer checks to validate live inference. `/health` reports `model_available: false` and `fallbacks_enabled: true`. |
| 4 | Complete dataset/API integration | **Implemented for supplied files** | The backend imports the supplied ATS scorer, gap detector, question generator, answer scorer, and report builder. The API contract is packaged with them. These files contain code, rules, and role keywords, not a large training corpus or external dataset. |
| 5 | Functional, usability, and performance testing | **Functional pass; usability/performance partial** | Functional live HTTP flow passed with model calls forced offline. The report is now organized into score summary, interview feedback, strengths, improvement areas, suggested resume edits, practice resources, and next steps. It loads automatically for an analyzed resume and can be downloaded as readable text. No participant usability study, accessibility audit, concurrency test, or load test was run. |
| 6 | Document evaluation results and performance metrics | **Documented** | Latest Vite build: 27.67 seconds; HTML 0.44 kB (0.29 kB gzip), CSS 22.55 kB (5.50 kB gzip), JavaScript 276.76 kB (84.50 kB gzip). These are local frontend build metrics, not server latency or throughput results. |
| 7 | Fix major issues and improve system reliability | **Improved; production gaps remain** | Added a OneDrive-compatible Vite path setting after native `realpath` failed on source files. `/health` distinguishes API liveness from whether the optional model is installed. Registration check/write is lock-protected, local state writes atomically, and the backend supports the separated dataset folder layout. Before network deployment, enforce authentication/authorization on protected routes and replace readable JSON storage for resume text with protected storage. |
| 8 | Finalize system architecture and workflow documentation | **Documented** | See `SYSTEM_ARCHITECTURE.md` for components, interfaces, workflow, persistence, and model boundaries. |

## Test record

- **Frontend production build:** PASS — Vite 7.3.7; 1,575 modules transformed; 27.67 seconds.
- **Python syntax compilation:** PASS for the backend and supplied analysis modules.
- **Frontend/API smoke check:** PASS — frontend page returned HTTP 200; backend health and empty-dashboard routes returned HTTP 200. Health payload correctly reported `model_available: false` and `fallbacks_enabled: true`.
- **Isolated HTTP service flow:** PASS — synthetic DOCX resume scored 84/100; one answer scored 2.8/5; generated report included strengths, improvements, resume edits, practice resource, and next steps. The test backend used separate temporary storage and simulated Ollama being offline; the test data was removed.
- **Optional model check:** Ollama tags endpoint reachable; `qwen3:4b` absent. Model-generated output is therefore not validated; fallback behavior was.
- **Usability/load test:** NOT RUN — no participant sessions or concurrency/load harness was used.

## Recommended next steps

1. Install Ollama `qwen3:4b` on the demo machine and repeat the question and answer flow with model inference enabled.
2. Ask representative users to complete upload, review report, download, navigation, and resume replacement; record task completion and confusing steps.
3. Run a repeatable API load test and capture request count, concurrency, median/p95 latency, and hardware/model configuration.
4. Before public or multi-user deployment, enforce session/token checks and protect resume text at rest.
