"""
Pixel Petals: resume gap detection (hybrid).
Rules decide the gap_type. The LLM only writes a short suggestion.
Run:  python gap_detector.py
Needs: pip install requests   and Ollama running with qwen3:4b
"""
import re
import json
import time
import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "qwen3:4b"

VAGUE_PHRASES = [
    "worked on", "worked with", "helped", "assisted", "involved in",
    "responsible for", "participated in", "part of", "contributed to",
    "took part", "handled", "did ",
]
SKILL_ONLY_STARTS = [
    "used ", "knowledge of", "familiar with", "proficient in",
    "experience with", "skilled in", "basic ", "learned ",
]
OUTCOME_WORDS = [
    "increased", "reduced", "improved", "saved", "achieved", "resulting",
    "result", "delivered", "won", "launched", "grew", "cut", "boosted",
    "enabled", "secured", "ranked",
]
TECH_WORDS = [
    "python", "sql", "java", "javascript", "react", "node", "flask",
    "fastapi", "django", "html", "css", "c++", "git", "docker", "aws",
    "tensorflow", "pytorch", "pandas", "mongodb", "mysql", "android",
]


def split_bullets(text):
    """Return a list of bullet strings without the leading dash or dot."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    marked = [re.sub(r"^[-\u2022*\u25cf]+\s*", "", l)
              for l in lines if re.match(r"^[-\u2022*\u25cf]", l)]
    if marked:
        # Full resume with bullet markers: ignore names, contact lines, headings, skill lists
        return [b for b in marked if len(b.split()) >= 2]
    # No markers (plain text): keep sentence-like lines only
    return [l for l in lines if len(l.split()) >= 5]


def classify_bullet(bullet):
    """Pick ONE gap_type with simple rules. Returns None if the bullet looks fine."""
    low = bullet.lower().strip()
    words = low.split()
    has_number = bool(re.search(r"\d", low))
    has_outcome = any(w in low for w in OUTCOME_WORDS)
    has_tech = any(t in low for t in TECH_WORDS)

    # 1. Bare skill mention, short, no numbers
    if any(low.startswith(s) for s in SKILL_ONLY_STARTS) and len(words) <= 8 and not has_number:
        return "skill_without_evidence"
    # 2. Weak verb phrase
    if any(p in low for p in VAGUE_PHRASES) and not has_number:
        return "vague_action"
    # 3. Strong bullet already? (number + result, or number + tech, or "used by N")
    if has_number and (has_outcome or has_tech or "used by" in low):
        return None
    # 4. Built something but no tech named
    if re.search(r"\b(built|developed|created|designed|implemented)\b", low) and not has_tech:
        return "no_tech_detail"
    # 5. No numbers at all
    if not has_number:
        return "no_outcome" if not has_outcome else "no_metrics"
    # 6. Has numbers but no result
    if not has_outcome:
        return "no_outcome"
    return None


def get_suggestions(items):
    """items = [{'id': 0, 'bullet': '...', 'gap_type': '...'}, ...]. One LLM call for all."""
    schema = {
        "type": "object",
        "properties": {
            "suggestions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "suggestion": {"type": "string"},
                    },
                    "required": ["id", "suggestion"],
                },
            }
        },
        "required": ["suggestions"],
    }
    lines = "\n".join(
        f'{it["id"]}. [{it["gap_type"]}] {it["bullet"]}' for it in items
    )
    prompt = f"""You are a resume coach for students. For each numbered bullet, write ONE short
sentence telling the student how to improve it, based on its gap type:
- no_metrics: ask them to add a number (users, size, time, percent).
- vague_action: ask them to replace the weak verb with a specific action.
- no_tech_detail: ask them to name the tools or technologies used.
- no_outcome: ask them to state the result or impact.
- skill_without_evidence: ask them to name a project that shows the skill.

Style examples (copy the style, not the content):
- no_metrics: "Add a number, such as how many users, how large the team was, or the time saved."
- vague_action: "Replace the weak verb with a specific action, such as designed, built or analyzed."
- no_tech_detail: "Name the tools or languages you used to build this."
- no_outcome: "State what happened because of your work, such as the result or who benefited."
- skill_without_evidence: "Name one project where you used this skill and what you did with it."

STRICT RULES:
- The advice MUST match the gap type in brackets. Do not give advice for a different gap type.
- Write a statement, not a question.
- Never invent facts, numbers or projects. Use placeholders like [number] if you give an example.
- Keep each suggestion under 25 words.
- Return the same id for each suggestion.

Bullets:
{lines}"""
    r = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL,
            "prompt": prompt,
            "stream": False,
            "think": False,
            "format": schema,
            "options": {"temperature": 0.2},
        },
        timeout=300,
    )
    r.raise_for_status()
    data = r.json()
    out = json.loads(data["response"])
    return {s["id"]: s["suggestion"] for s in out["suggestions"]}, data


def detect_gaps(resume_text):
    bullets = split_bullets(resume_text)
    items = []
    for i, b in enumerate(bullets):
        gt = classify_bullet(b)
        if gt:
            items.append({"id": i, "bullet": b, "gap_type": gt})
    if not items:
        return [], None

    # Resume analysis must remain available when the optional local Ollama
    # service is stopped or has no model installed. The rules determine each
    # gap; these bundled prompts are safe, data-independent fallbacks.
    fallback = {
        "no_metrics": "Add a number, such as how many users, how large the team was, or the time saved.",
        "vague_action": "Replace the weak verb with a specific action, such as designed, built or analyzed.",
        "no_tech_detail": "Name the tools or languages you used to build this.",
        "no_outcome": "State what happened because of your work, such as the result or who benefited.",
        "skill_without_evidence": "Name one project where you used this skill and what you did with it.",
    }
    try:
        suggestions, raw = get_suggestions(items)
    except Exception as exc:
        print("LLM suggestions skipped, using rule-based prompts:", type(exc).__name__)
        suggestions, raw = {}, None
    gaps = []
    for n, it in enumerate(items, start=1):
        gaps.append({
            "gap_id": f"g{n}",
            "bullet": it["bullet"],
            "gap_type": it["gap_type"],
            "suggestion": suggestions.get(it["id"], fallback[it["gap_type"]]),
        })
    return gaps, raw


if __name__ == "__main__":
    sample = """
    - Worked on a website for college fest
    - Used Python and SQL
    - Led a team of students
    - Built a fest registration site with Flask and MySQL, used by 800+ students
    """
    start = time.time()
    gaps, raw = detect_gaps(sample)
    print("Seconds:", round(time.time() - start, 1))
    if raw:
        print("Tokens/sec:", round(raw["eval_count"] / (raw["eval_duration"] / 1e9), 1))
    print(json.dumps({"gaps": gaps}, indent=2))
