# Pixel Petals: API Contract (v1)

**Rule:** don't change field names or types without telling the others. Adding new fields is fine. The local app stores account and resume/interview session state in its private backend `user_state.json` file so browser reloads and backend restarts preserve the user's progress.

- Base URL (local): `http://localhost:8000`
- All responses are JSON. All text is UTF-8.
- `session_id` remains stable across app reloads and backend restarts on the same local installation.
- AI calls are slow on CPU (5-60 s). Frontend: show a loading state, never freeze.
- Backend: until the AI functions are ready, return the mock responses below.

---

## 0. `GET /health`

```json
{ "status": "ok", "model": "qwen3:4b", "model_available": false, "fallbacks_enabled": true }
```

`model` names the optional configured Ollama model. `model_available` reports whether it is installed in the local Ollama service; `fallbacks_enabled` means rule-based and template responses remain available when it is not.

---

## 1. `POST /analyze-resume`

**Request:** `multipart/form-data`
- `file`: PDF or DOCX
- `target_role`: string, e.g. `"Software Engineer"`

**Response 200:**

```json
{
  "session_id": "a1b2c3d4",
  "target_role": "Software Engineer",
  "ats_score": 62,
  "score_breakdown": [
    { "criterion": "Required sections present", "points": 15, "max_points": 20, "note": "Missing a Projects section" },
    { "criterion": "Contact info", "points": 10, "max_points": 10, "note": "Email and phone found" },
    { "criterion": "Role keyword match", "points": 12, "max_points": 30, "note": "Matched 6 of 15 role keywords" },
    { "criterion": "Quantified achievements", "points": 5, "max_points": 25, "note": "2 of 9 bullets contain numbers" },
    { "criterion": "Length and format", "points": 10, "max_points": 15, "note": "Good length; tables may confuse ATS" }
  ],
  "skills": ["Python", "SQL", "React", "Git"],
  "missing_keywords": ["Docker", "REST APIs", "Unit testing", "CI/CD"],
  "gaps": [
    {
      "gap_id": "g1",
      "bullet": "Worked on a website for college fest",
      "gap_type": "no_metrics",
      "suggestion": "Add measurable impact, e.g. number of visitors or registrations handled."
    },
    {
      "gap_id": "g2",
      "bullet": "Used Python and SQL",
      "gap_type": "skill_without_evidence",
      "suggestion": "Name a project or result that shows how you used these skills."
    },
    {
      "gap_id": "g3",
      "bullet": "Led a team of students",
      "gap_type": "no_outcome",
      "suggestion": "State the team size, your responsibilities and what the team achieved."
    }
  ]
}
```

**Allowed `gap_type` values** (use exactly these):
`no_metrics`, `vague_action`, `no_tech_detail`, `no_outcome`, `skill_without_evidence`

---

## 2. `POST /generate-questions`

**Request (JSON):**

```json
{ "session_id": "a1b2c3d4", "num_questions": 5 }
```

**Response 200:**

```json
{
  "session_id": "a1b2c3d4",
  "questions": [
    {
      "question_id": "q1",
      "question": "You worked on a college fest website. What was the measurable impact of that project?",
      "targets_gap_id": "g1",
      "gap_type": "no_metrics",
      "good_answer_hints": ["Mentions numbers (users, registrations)", "Explains your own role", "Describes the result"]
    },
    {
      "question_id": "q2",
      "question": "Walk me through a project where you used Python and SQL together.",
      "targets_gap_id": "g2",
      "gap_type": "skill_without_evidence",
      "good_answer_hints": ["Specific project", "What data and queries", "What problem it solved"]
    },
    {
      "question_id": "q3",
      "question": "Tell me about a time you led your team through a difficult moment.",
      "targets_gap_id": "g3",
      "gap_type": "no_outcome",
      "good_answer_hints": ["Situation and task", "Action you took", "Result (STAR format)"]
    }
  ]
}
```

---

## 3. `POST /score-answer`

**Request (JSON):**

```json
{
  "session_id": "a1b2c3d4",
  "question_id": "q1",
  "answer_text": "I built the registration pages and about 800 students signed up through the site."
}
```

**Response 200:**

```json
{
  "question_id": "q1",
  "scores": {
    "relevance": 4,
    "specificity": 3,
    "structure": 2,
    "communication": 4
  },
  "overall": 3.3,
  "strengths": ["Gave a concrete number (800 sign-ups)"],
  "improvements": [
    "Explain what you did personally versus the team.",
    "Describe the outcome, e.g. how the site helped the event."
  ],
  "related_gap": {
    "gap_id": "g1",
    "message": "This answer can also improve your resume bullet: add '800 registrations' to it."
  }
}
```

Scores are integers from 1 to 5. `overall` is a number with one decimal place.

---

## 4. `POST /report`

**Request (JSON):**

```json
{ "session_id": "a1b2c3d4" }
```

**Response 200:**

```json
{
  "session_id": "a1b2c3d4",
  "summary": "Your resume is solid on skills but light on measurable results. Interview answers were relevant but need clearer structure.",
  "ats_score": 62,
  "average_interview_score": 3.4,
  "top_strengths": ["Relevant technical skills", "Clear communication"],
  "top_weaknesses": ["Few quantified achievements", "Answers lack STAR structure"],
  "resume_fixes": [
    { "gap_id": "g1", "before": "Worked on a website for college fest", "after_suggestion": "Built a fest registration website used by 800+ students" }
  ],
  "learning_resources": [
    { "topic": "STAR method for behavioral answers", "type": "article", "description": "Practice structuring answers as Situation, Task, Action, Result." },
    { "topic": "Writing quantified resume bullets", "type": "guide", "description": "Turn tasks into results using numbers." }
  ],
  "next_steps": ["Rewrite 3 resume bullets with metrics", "Redo the mock interview in 1 week"]
}
```

---

## Errors (all endpoints)

HTTP 4xx/5xx with:

```json
{ "error": { "code": "UNSUPPORTED_FILE", "message": "Please upload a PDF or DOCX file." } }
```

Codes: `UNSUPPORTED_FILE`, `EMPTY_RESUME`, `SESSION_NOT_FOUND`, `MODEL_ERROR`, `MODEL_TIMEOUT`

---

## Who builds what

| Part | Owner | Starts with |
|---|---|---|
| FastAPI endpoints, file parsing, calling the model | Charitha | Return the mock JSON above |
| Upload, interview and results screens | Divya | Use the mock JSON above |
| ATS scoring, gap detection, question generation, answer scoring | Prerana | Replace the mocks one endpoint at a time |

Integration order: `/analyze-resume` → `/generate-questions` → `/score-answer` → `/report`
