"""
Pixel Petals: gap-targeted interview question generator.
Code supplies the question type and answer hints. The LLM only rewords each
question to sound natural and refer to the student's bullet.
If the LLM fails or is slow, template questions are used, so the app never breaks.

Run:  python question_generator.py
Needs: pip install requests   (Ollama + qwen3:4b for the personalised wording)
"""
import json
import time
import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "qwen3:4b"

# One template question and answer hints per gap type. {bullet} is the student's bullet.
TEMPLATES = {
    "no_metrics": {
        "question": 'You wrote "{bullet}". What was the measurable impact of that work?',
        "hints": ["Mentions numbers (users, size, time saved)", "Explains their own role", "Describes the result"],
    },
    "vague_action": {
        "question": 'You wrote "{bullet}". What exactly did you do yourself, step by step?',
        "hints": ["Specific actions, not just 'worked on'", "Clear personal contribution", "Tools or methods used"],
    },
    "no_tech_detail": {
        "question": 'You wrote "{bullet}". Which technologies did you use, and why did you choose them?',
        "hints": ["Names specific tools", "Gives a reason for each choice", "Mentions a trade-off or alternative"],
    },
    "no_outcome": {
        "question": 'You wrote "{bullet}". What was the outcome, and who benefited from it?',
        "hints": ["States a clear result", "Says who benefited", "Uses STAR: Situation, Task, Action, Result"],
    },
    "skill_without_evidence": {
        "question": 'You listed "{bullet}". Walk me through a project where you actually used it.',
        "hints": ["Names one specific project", "Explains what they did with the skill", "Describes the result"],
    },
}

# Generic questions to fill the list if there are fewer gaps than requested.
GENERIC = {
    "software engineer": [
        "Tell me about a bug that was hard to find. How did you debug it?",
        "Describe a project you are most proud of and your part in it.",
        "How would you explain an API to someone who isn't technical?",
    ],
    "data analyst": [
        "Tell me about a time data surprised you. What did you do next?",
        "How do you check that a dataset is clean enough to trust?",
    ],
    "machine learning engineer": [
        "How would you decide whether a model is good enough to use?",
        "Tell me about a time a model did not work as expected.",
    ],
    "web developer": [
        "How do you make a page work well on a phone?",
        "Describe a feature you built from design to launch.",
    ],
}
GENERIC_HINTS = ["Gives a specific example", "Explains their reasoning", "Describes the result"]


def _template_question(gap):
    t = TEMPLATES.get(gap["gap_type"], TEMPLATES["no_outcome"])
    return t["question"].format(bullet=gap["bullet"])


def _personalise(gaps):
    """Ask the LLM to reword template questions. Returns {id: question}."""
    schema = {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {"id": {"type": "integer"}, "question": {"type": "string"}},
                    "required": ["id", "question"],
                },
            }
        },
        "required": ["questions"],
    }
    lines = "\n".join(
        f'{i}. [{g["gap_type"]}] bullet: "{g["bullet"]}" | draft: {_template_question(g)}'
        for i, g in enumerate(gaps)
    )
    prompt = f"""You are an interviewer. Reword each draft question so it sounds natural.
RULES:
- Keep the same meaning and the same gap type in brackets.
- Mention the topic of the bullet.
- One question only, under 30 words.
- Do not assume facts that are not in the bullet.
- Return the same id for each question.

{lines}"""
    r = requests.post(
        OLLAMA_URL,
        json={"model": MODEL, "prompt": prompt, "stream": False, "think": False,
              "format": schema, "keep_alive": "30m", "options": {"temperature": 0.3}},
        timeout=180,
    )
    r.raise_for_status()
    out = json.loads(r.json()["response"])
    return {q["id"]: q["question"].strip() for q in out["questions"] if q["question"].strip()}


def generate_questions(gaps, target_role="Software Engineer", num_questions=5, use_llm=True, resume_skills=None):
    """gaps = list of dicts with gap_id, bullet, gap_type (from gap_detector).
    Returns the list that /generate-questions puts under "questions"."""
    chosen = gaps[:num_questions]

    reworded = {}
    if use_llm and chosen:
        try:
            reworded = _personalise(chosen)
        except Exception as e:  # LLM down, slow or invalid output
            print("LLM wording skipped, using templates:", type(e).__name__)

    questions = []
    for i, g in enumerate(chosen):
        t = TEMPLATES.get(g["gap_type"], TEMPLATES["no_outcome"])
        questions.append({
            "question_id": f"q{len(questions) + 1}",
            "question": reworded.get(i) or _template_question(g),
            "targets_gap_id": g["gap_id"],
            "gap_type": g["gap_type"],
            "good_answer_hints": t["hints"],
        })

    # Ask about skills actually extracted from this resume before falling back
    # to generic role questions. The skill names come from ats_scorer data.
    for skill in resume_skills or []:
        if len(questions) >= num_questions:
            break
        questions.append({
            "question_id": f"q{len(questions) + 1}",
            "question": f"Your resume mentions {skill}. Describe how you used it, what you did, and what happened.",
            "targets_gap_id": None,
            "gap_type": None,
            "targets_skill": skill,
            "good_answer_hints": ["Gives a specific example", "Explains your own contribution", "Describes the result"],
        })

    # Fill with generic role questions if there were too few gaps
    pool = GENERIC.get(target_role.lower().strip(), GENERIC["software engineer"])
    for text in pool:
        if len(questions) >= num_questions:
            break
        questions.append({
            "question_id": f"q{len(questions) + 1}",
            "question": text,
            "targets_gap_id": None,
            "gap_type": None,
            "good_answer_hints": GENERIC_HINTS,
        })
    return questions


if __name__ == "__main__":
    sample_gaps = [
        {"gap_id": "g1", "bullet": "Worked on a website for college fest", "gap_type": "vague_action"},
        {"gap_id": "g2", "bullet": "Used Python and SQL", "gap_type": "skill_without_evidence"},
        {"gap_id": "g3", "bullet": "Led a team of students", "gap_type": "no_outcome"},
    ]
    start = time.time()
    qs = generate_questions(sample_gaps, "Software Engineer", num_questions=5)
    print("Seconds:", round(time.time() - start, 1))
    print(json.dumps({"questions": qs}, indent=2))
