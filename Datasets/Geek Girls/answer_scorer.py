"""
Pixel Petals: interview answer scorer.
Specificity, structure and communication are scored by explainable code checks.
The LLM only judges relevance (1-5). If it fails, a keyword-overlap fallback is used.
Output matches the /score-answer response in API_CONTRACT.md.

Run:  python answer_scorer.py
Needs: pip install requests   (Ollama + qwen3:4b for the relevance score)
"""
import re
import json
import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "qwen3:4b"

FILLERS = ["um", "uh", "like", "you know", "basically", "actually", "kind of", "sort of", "i guess"]
STOPWORDS = set("""about after again also because being could does doing from have having into
more most much only other over same should some such than that their them then there these they
this those through under very what when where which while with would your you wrote listed mentioned
tell walk project work worked used using step exactly did said""".split())
TECH_WORDS = ["python", "sql", "java", "javascript", "react", "node", "flask", "fastapi", "django",
              "html", "css", "git", "docker", "aws", "tensorflow", "pytorch", "pandas", "mongodb",
              "mysql", "android", "api", "excel", "tableau"]

STAR = {
    "Situation": ["when ", "during ", "while ", "last year", "last semester", "in my ", "our college", "at college"],
    "Task": ["my task", "my role", "i was responsible", "i needed to", "i had to", "goal was", "needed to", "had to"],
    "Action": [r"\bi (built|designed|implemented|wrote|created|led|decided|used|developed|organized|fixed|tested|"
               r"set up|analy[sz]ed|planned|divided|coordinated|debugged)"],
    "Result": ["result", "resulted", "increased", "reduced", "improved", "saved", "led to", "achieved",
               "outcome", "signed up", "so that", "won", "finally", "in the end"],
}


def _words(text):
    return re.findall(r"[a-z0-9+#']+", text.lower())


def _star_parts(low):
    found = []
    for part, cues in STAR.items():
        if any((re.search(c, low) if c.startswith("\\b") else c in low) for c in cues):
            found.append(part)
    return found


def _relevance_fallback(question, answer):
    q = {w for w in _words(question) if len(w) > 3 and w not in STOPWORDS}
    a = set(_words(answer))
    overlap = len(q & a)
    return {0: 1, 1: 2, 2: 3}.get(overlap, 4)


def _relevance_llm(question, answer):
    schema = {"type": "object", "properties": {"relevance": {"type": "integer"}}, "required": ["relevance"]}
    prompt = f"""Rate how well the answer addresses the interview question, from 1 to 5.
1 = off topic, 3 = partly answers, 5 = answers the question directly.
Judge relevance only, not grammar or length.

Question: {question}
Answer: {answer}"""
    r = requests.post(
        OLLAMA_URL,
        json={"model": MODEL, "prompt": prompt, "stream": False, "think": False,
              "format": schema, "keep_alive": "30m", "options": {"temperature": 0}},
        timeout=120,
    )
    r.raise_for_status()
    val = int(json.loads(r.json()["response"])["relevance"])
    return max(1, min(5, val))


def _related_gap_message(gap, answer):
    """Link the answer back to the resume bullet it came from."""
    bullet = gap.get("bullet", "your resume bullet")
    m = re.search(r"\d[\d,]*\+?%?(?:\s+[a-zA-Z]+)?", answer)
    if gap.get("gap_type") in ("no_metrics", "no_outcome") and m:
        return (f"This answer can also improve your resume bullet \"{bullet}\": "
                f"add a detail like '{m.group(0).strip()}'.")
    return (f"Your answer has detail that your resume bullet \"{bullet}\" is missing. "
            f"Add the key point from this answer to the bullet.")


def score_answer(question, answer_text, gap=None, use_llm=True):
    """question: dict from question_generator. gap: matching gap dict (gap_id, bullet, gap_type) or None."""
    answer = answer_text.strip()
    low = answer.lower()
    words = _words(answer)
    n = len(words)
    sentences = [s for s in re.split(r"[.!?]+", answer) if s.strip()]
    has_number = bool(re.search(r"\d", answer))
    tech = [t for t in TECH_WORDS if t in words]
    star = _star_parts(low)
    filler_count = sum(low.count(f) if " " in f else words.count(f) for f in FILLERS)

    # Relevance (LLM, with fallback)
    relevance = None
    if use_llm and n >= 3:
        try:
            relevance = _relevance_llm(question["question"], answer)
        except Exception as e:
            print("LLM relevance skipped, using fallback:", type(e).__name__)
    if relevance is None:
        relevance = _relevance_fallback(question["question"], answer) if n >= 3 else 1

    # Specificity
    spec = 1 + (2 if has_number else 0) + (1 if tech else 0) + (1 if n >= 40 else 0)
    specificity = min(5, spec)

    # Structure (STAR): 1 + number of STAR parts found
    structure = 1 + len(star)

    # Communication
    if n < 15:
        comm = 1
    elif n < 30:
        comm = 2
    else:
        comm = 3
        if len(sentences) >= 3 and n <= 220:
            comm += 1
        if filler_count / max(n, 1) <= 0.02:
            comm += 1
    if filler_count / max(n, 1) > 0.05:
        comm = max(1, comm - 1)
    communication = min(5, comm)

    scores = {"relevance": relevance, "specificity": specificity,
              "structure": structure, "communication": communication}
    overall = round(sum(scores.values()) / 4, 1)

    strengths, improvements = [], []
    if has_number:
        num = re.search(r"\d[\d,]*\+?%?", answer).group(0)
        strengths.append(f"Gave a concrete number ({num}).")
    else:
        improvements.append("Add a number, such as users, team size or time saved.")
    if tech:
        strengths.append("Named specific tools: " + ", ".join(tech[:3]) + ".")
    if "Result" in star:
        strengths.append("Described the result of your work.")
    else:
        improvements.append("End with the result: what happened because of your work.")
    if len(star) >= 3:
        strengths.append("Followed a clear STAR-style structure.")
    elif "Action" not in star:
        improvements.append("Say what you personally did, using 'I' and a specific action.")
    if n < 30:
        improvements.append("Give more detail; aim for 4-6 sentences.")
    if filler_count / max(n, 1) > 0.05:
        improvements.append("Cut filler words like 'um' and 'basically'.")
    if not strengths:
        strengths.append("You attempted the question; now add specifics.")

    related = None
    if gap:
        related = {"gap_id": gap["gap_id"], "message": _related_gap_message(gap, answer)}

    return {
        "question_id": question["question_id"],
        "scores": scores,
        "overall": overall,
        "strengths": strengths[:3],
        "improvements": improvements[:3],
        "related_gap": related,
    }


if __name__ == "__main__":
    q = {"question_id": "q1",
         "question": "You mentioned working on a college fest website. What was the measurable impact of that work?"}
    g = {"gap_id": "g1", "bullet": "Worked on a website for college fest", "gap_type": "no_metrics"}
    good = ("Last year our college fest needed online registration. I built the registration pages using "
            "Flask and MySQL and tested them with friends. As a result about 800 students signed up through "
            "the site and the desk queue got much shorter.")
    weak = "Um, I basically just worked on it, it was fine."
    for label, ans in (("GOOD ANSWER", good), ("WEAK ANSWER", weak)):
        print("==", label)
        print(json.dumps(score_answer(q, ans, g), indent=2))
