"""FastAPI adapter for the supplied CareerSage frontend and Geek Girls modules."""
from __future__ import annotations

import hashlib
import hmac
import io
import re
import secrets
import sys
import json
import os
import threading
import uuid
from pathlib import Path
from typing import Any
import requests

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

PROJECT = Path(__file__).resolve().parents[1]
DATASET_DIRS = (
    PROJECT / "Datasets" / "Geek Girls",
    PROJECT.parent.parent / "Geek Girls" / "Geek Girls",
    PROJECT / "Geek Girls" / "Geek Girls",
)
DATASET_DIR = next((path for path in DATASET_DIRS if path.is_dir()), None)
if DATASET_DIR is None:
    raise RuntimeError("Could not find the supplied Geek Girls analysis modules. Keep the Datasets/Geek Girls folder beside Backend/.")
sys.path.insert(0, str(DATASET_DIR))
from ats_scorer import ROLE_KEYWORDS, _has_keyword, score_resume  # noqa: E402
from answer_scorer import score_answer  # noqa: E402
from gap_detector import detect_gaps  # noqa: E402
from question_generator import generate_questions  # noqa: E402
from report_builder import build_report  # noqa: E402

app = FastAPI(title="CareerSage API", version="1.0.0")
OLLAMA_MODEL = "qwen3:4b"
OLLAMA_TAGS_URL = "http://localhost:11434/api/tags"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://127.0.0.1:4173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

# The supplied API contract says application state is temporary and in memory.
sessions: dict[str, dict[str, Any]] = {}
accounts: dict[str, dict[str, str]] = {}
STATE_FILE = Path(os.environ.get("CAREERSAGE_STATE_FILE", str(Path(__file__).with_name("user_state.json")))).expanduser()
_state_lock = threading.RLock()


def _persist_state():
    """Atomically persist local accounts and resume/interview sessions."""
    with _state_lock:
        STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        temporary = STATE_FILE.with_suffix(".tmp")
        temporary.write_text(json.dumps({"accounts": accounts, "sessions": sessions}, ensure_ascii=False), encoding="utf-8")
        temporary.replace(STATE_FILE)


def _restore_state():
    if not STATE_FILE.exists():
        return
    try:
        saved = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        accounts.update(saved.get("accounts", {}))
        sessions.update(saved.get("sessions", {}))
    except (OSError, ValueError, TypeError) as exc:
        raise RuntimeError(f"Could not read saved CareerSage data from {STATE_FILE}") from exc


_restore_state()


def fail(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status, {"error": {"code": code, "message": message}})


@app.exception_handler(HTTPException)
async def contract_errors(request, exc: HTTPException):
    body = exc.detail if isinstance(exc.detail, dict) and "error" in exc.detail else {
        "error": {"code": "REQUEST_ERROR", "message": str(exc.detail)}
    }
    return JSONResponse(status_code=exc.status_code, content=body)


@app.exception_handler(RequestValidationError)
async def validation_errors(request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": {"code": "INVALID_REQUEST", "message": "The request is missing or has invalid fields."}})


class Credentials(BaseModel):
    email: str
    password: str = Field(min_length=1)
    name: str = ""
    phone: str = ""


class QuestionsRequest(BaseModel):
    session_id: str
    num_questions: int = Field(default=5, ge=1, le=20)


class AnswerRequest(BaseModel):
    session_id: str
    question_id: str
    answer_text: str


class ReportRequest(BaseModel):
    session_id: str


def _password(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000).hex()


def _user(email: str, account: dict[str, str]):
    return {"id": email, "name": account["name"], "email": email, "phone": account["phone"]}


@app.get("/health")
def health():
    model_available = False
    try:
        response = requests.get(OLLAMA_TAGS_URL, timeout=0.5)
        response.raise_for_status()
        model_list = response.json().get("models", [])
        model_available = any(
            item.get("name") == OLLAMA_MODEL or item.get("model") == OLLAMA_MODEL
            for item in model_list
        )
    except (requests.RequestException, ValueError, AttributeError):
        pass
    return {
        "status": "ok",
        "model": OLLAMA_MODEL,
        "model_available": model_available,
        "fallbacks_enabled": not model_available,
    }


@app.post("/auth/register")
def register(payload: Credentials):
    email = payload.email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise fail(422, "INVALID_EMAIL", "Enter a valid email address.")
    with _state_lock:
        if email in accounts:
            raise fail(409, "ACCOUNT_EXISTS", "An account with this email already exists.")
        salt = secrets.token_bytes(16)
        accounts[email] = {"name": payload.name.strip(), "phone": payload.phone.strip(), "salt": salt.hex(), "password": _password(payload.password, salt)}
        _persist_state()
    return {"user": _user(email, accounts[email]), "token": secrets.token_urlsafe(32)}


@app.post("/auth/login")
def login(payload: Credentials):
    email = payload.email.strip().lower()
    account = accounts.get(email)
    if not account or not hmac.compare_digest(_password(payload.password, bytes.fromhex(account["salt"])), account["password"]):
        raise fail(401, "INVALID_CREDENTIALS", "Email or password is incorrect.")
    return {"user": _user(email, account), "token": secrets.token_urlsafe(32)}


async def _resume_text(upload: UploadFile) -> str:
    filename = (upload.filename or "").lower()
    content = await upload.read()
    if not content:
        raise fail(400, "EMPTY_RESUME", "The uploaded resume is empty.")
    if len(content) > 10 * 1024 * 1024:
        raise fail(413, "FILE_TOO_LARGE", "The resume must be 10 MB or smaller.")
    try:
        if filename.endswith(".pdf"):
            from pypdf import PdfReader
            text = "\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(content)).pages)
        elif filename.endswith(".docx"):
            from docx import Document
            document = Document(io.BytesIO(content))
            text = "\n".join(p.text for p in document.paragraphs)
            for table in document.tables:
                text += "\n" + "\n".join(" | ".join(cell.text for cell in row.cells) for row in table.rows)
        else:
            raise fail(415, "UNSUPPORTED_FILE", "Please upload a PDF or DOCX file.")
    except HTTPException:
        raise
    except Exception as exc:
        raise fail(400, "EMPTY_RESUME", "The file could not be read or contains no extractable text.") from exc
    if not text.strip():
        raise fail(400, "EMPTY_RESUME", "No text could be extracted from the uploaded resume.")
    return text


def _new_session(filename: str, user_id: str | None, role: str, text: str):
    analysis = score_resume(text, role)
    gaps, _ = detect_gaps(text)
    session_id = uuid.uuid4().hex
    with _state_lock:
        sessions[session_id] = {
            "filename": filename, "user_id": user_id, "target_role": role, "text": text,
            "analysis": analysis, "gaps": gaps, "questions": [], "answers": {}, "answer_results": [],
        }
        _persist_state()
    return session_id, sessions[session_id]


@app.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...), target_role: str = Form("Software Engineer")):
    text = await _resume_text(file)
    session_id, record = await run_in_threadpool(_new_session, file.filename or "resume", None, target_role, text)
    analysis = record["analysis"]
    return {"session_id": session_id, "target_role": target_role, "ats_score": analysis["ats_score"], "score_breakdown": analysis["score_breakdown"], "skills": analysis["skills"], "missing_keywords": analysis["missing_keywords"], "gaps": record["gaps"]}


@app.post("/resume/analyze")
async def analyze_resume_frontend(resume: UploadFile = File(...), userId: str | None = Form(None), targetRole: str = Form("Software Engineer")):
    text = await _resume_text(resume)
    session_id, record = await run_in_threadpool(_new_session, resume.filename or "resume", userId, targetRole, text)
    return {"session_id": session_id, "userId": userId, "target_role": targetRole, "resume": record["analysis"], "gaps": record["gaps"]}


def _dashboard(record: dict[str, Any] | None, user_id: str | None):
    profile = {"name": "", "email": user_id or "", "phone": ""}
    for email, account in accounts.items():
        if user_id and user_id.lower() == email:
            profile = {"name": account["name"], "email": email, "phone": account["phone"]}
            break
    data = {
        "sessionId": None,
        "user": profile,
        "resume": {"fileName": "", "targetRole": "", "score": None, "atsScore": None, "contentQuality": None, "skillRelevance": None, "roleAlignmentScore": None, "clarity": None, "insights": [], "technicalSkills": [], "softSkills": [], "otherSkills": [], "matchedKeywords": [], "missingKeywords": [], "suggestedKeywords": [], "roleAlignment": [], "suggestions": []},
        "dashboard": {"readiness": None, "skillsIdentified": None, "recommendedRoles": None, "preparationStatus": None, "skillAnalysis": [], "roleMatches": [], "strengths": [], "areasToImprove": [], "nextSteps": []},
        "preparation": {"readiness": None, "technicalKnowledge": None, "problemSolving": None, "communication": None, "systemDesign": None, "categories": [], "companies": [], "mockTests": [], "recentActivity": [], "progress": []},
        "interview": {"category": "", "difficulty": "", "topic": "", "question": "", "totalQuestions": None, "completedQuestions": 0},
    }
    if record is None:
        return data
    data["sessionId"] = next((sid for sid, value in sessions.items() if value is record), None)
    result = record["analysis"]
    gaps = record["gaps"]
    breakdown = result["score_breakdown"]
    by_name = {item["criterion"]: item for item in breakdown}
    pct = lambda name: round(100 * by_name[name]["points"] / by_name[name]["max_points"]) if name in by_name and by_name[name]["max_points"] else None
    text_low = record["text"].lower()
    roles = []
    for role, keywords in ROLE_KEYWORDS.items():
        matched = [word for word in keywords if _has_keyword(text_low, word)]
        percent = round(100 * len(matched) / len(keywords)) if keywords else 0
        roles.append({"role": role.title(), "score": percent, "skills": ", ".join(matched) if matched else "No listed role keywords found"})
    roles.sort(key=lambda item: item["score"], reverse=True)
    skill_values = [[skill, None] for skill in result["skills"]]
    questions = generate_questions(gaps, record["target_role"], 20, use_llm=False, resume_skills=result["skills"])
    answers = record["answer_results"]
    avg = round(sum(item["overall"] for item in answers) / len(answers), 1) if answers else None
    prep_score = round(avg * 20) if avg is not None else None
    dimension = lambda name: round(sum(item["scores"][name] for item in answers) * 20 / len(answers)) if answers else None
    activity = [[item["question_id"], "Completed", "Resume interview", item["overall"]] for item in answers]
    improvements = [g["suggestion"] for g in gaps]
    improvements.extend(b["note"] for b in breakdown if b["max_points"] and b["points"] / b["max_points"] < .8 and b["note"] not in improvements)
    data["resume"].update({"fileName": record["filename"], "targetRole": record["target_role"], "score": result["ats_score"], "atsScore": result["ats_score"], "contentQuality": pct("Required sections present"), "skillRelevance": pct("Role keyword match"), "roleAlignmentScore": next((item["score"] for item in roles if item["role"].lower() == record["target_role"].lower()), None), "clarity": pct("Length"), "technicalSkills": result["skills"], "matchedKeywords": [word for word in ROLE_KEYWORDS.get(record["target_role"].lower(), []) if _has_keyword(text_low, word)], "missingKeywords": result["missing_keywords"], "suggestedKeywords": result["missing_keywords"], "insights": [b["note"] for b in breakdown], "roleAlignment": roles, "suggestions": improvements})
    data["dashboard"].update({"skillsIdentified": len(result["skills"]), "recommendedRoles": sum(1 for item in roles if item["score"] > 0), "preparationStatus": prep_score, "skillAnalysis": skill_values, "roleMatches": [[item["role"], item["score"]] for item in roles[:3]], "strengths": [b["criterion"] for b in breakdown if b["max_points"] and b["points"] / b["max_points"] >= .8], "areasToImprove": improvements, "nextSteps": improvements})
    data["preparation"].update({"readiness": prep_score, "technicalKnowledge": dimension("relevance"), "problemSolving": dimension("structure"), "communication": dimension("communication"), "systemDesign": None, "categories": [{"name": f"{record['target_role']} practice", "count": len(questions)}] if questions else [], "mockTests": [{"question_id": item["question_id"], "name": item["question"], "meta": f"Question {i + 1} · {record['target_role']}"} for i, item in enumerate(questions)], "recentActivity": activity})
    data["interview"].update({"category": record["target_role"], "topic": "Resume gaps and role skills", "totalQuestions": len(questions), "completedQuestions": len(answers)})
    return data


@app.get("/dashboard")
def dashboard(userId: str | None = None):
    record = next((s for s in reversed(list(sessions.values())) if userId and (s.get("user_id") or "").lower() == userId.lower()), None)
    return _dashboard(record, userId)


def _session(session_id: str):
    if session_id not in sessions:
        raise fail(404, "SESSION_NOT_FOUND", "The session was not found or has expired.")
    return sessions[session_id]


@app.post("/generate-questions")
def generate(payload: QuestionsRequest):
    record = _session(payload.session_id)
    questions = generate_questions(record["gaps"], record["target_role"], payload.num_questions, resume_skills=record["analysis"]["skills"])
    with _state_lock:
        record["questions"] = questions
        _persist_state()
    return {"session_id": payload.session_id, "questions": record["questions"]}


@app.post("/score-answer")
def score(payload: AnswerRequest):
    record = _session(payload.session_id)
    question = next((q for q in record["questions"] if q["question_id"] == payload.question_id), None)
    if question is None:
        raise fail(404, "QUESTION_NOT_FOUND", "Generate questions for this session before scoring an answer.")
    gap = next((g for g in record["gaps"] if g["gap_id"] == question.get("targets_gap_id")), None)
    result = score_answer(question, payload.answer_text, gap)
    with _state_lock:
        record["answers"][payload.question_id] = payload.answer_text
        record["answer_results"] = [r for r in record["answer_results"] if r["question_id"] != payload.question_id] + [result]
        _persist_state()
    return result


@app.post("/report")
def report(payload: ReportRequest):
    record = _session(payload.session_id)
    return {"session_id": payload.session_id, "target_role": record["target_role"], **build_report(payload.session_id, record["analysis"], record["gaps"], record["answer_results"], record["answers"])}


# In the combined deployment, serve Vite's built app from FastAPI. API routes
# above take precedence; all other paths fall back to the React application.
FRONTEND_DIST_DIRS = (PROJECT / "Frontend" / "dist", PROJECT / "dist")
FRONTEND_DIST = next((path for path in FRONTEND_DIST_DIRS if path.is_dir()), None)
if FRONTEND_DIST is not None:
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
