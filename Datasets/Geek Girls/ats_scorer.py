"""
Pixel Petals: rule-based ATS scorer. No LLM, runs instantly.
Input: plain resume text (Charitha extracts it from PDF/DOCX).
Output: the fields /analyze-resume needs: ats_score, score_breakdown, skills, missing_keywords.

Run:  python ats_scorer.py
"""
import re
import json

# Keywords per target role. Extend these from job description datasets later.
ROLE_KEYWORDS = {
    "software engineer": [
        "python", "java", "javascript", "sql", "git", "rest", "api",
        "docker", "testing", "data structures", "algorithms", "react",
        "node", "ci/cd", "agile",
    ],
    "data analyst": [
        "python", "sql", "excel", "tableau", "power bi", "pandas",
        "statistics", "visualization", "dashboard", "etl", "reporting",
    ],
    "machine learning engineer": [
        "python", "pytorch", "tensorflow", "scikit-learn", "pandas",
        "numpy", "deep learning", "nlp", "model", "deployment", "sql", "git",
    ],
    "web developer": [
        "html", "css", "javascript", "react", "node", "git", "responsive",
        "api", "sql", "typescript", "testing",
    ],
}
DEFAULT_ROLE = "software engineer"

SECTION_PATTERNS = {
    "Education": r"^\s*(education|academic)",
    "Experience": r"^\s*(experience|work experience|internship|employment)",
    "Projects": r"^\s*(projects?|academic projects?|personal projects?)",
    "Skills": r"^\s*(skills|technical skills|key skills)",
}


def _bullets(text):
    out = []
    for line in text.splitlines():
        line = line.strip()
        if re.match(r"^[-\u2022*\u25cf]", line):
            out.append(re.sub(r"^[-\u2022*\u25cf]+\s*", "", line))
    return out


def _has_keyword(text_low, kw):
    # word-ish boundary so "java" does not match "javascript"
    pattern = r"(?<![a-z0-9+#])" + re.escape(kw) + r"(?![a-z0-9+#])"
    return re.search(pattern, text_low) is not None


def score_resume(text, target_role="Software Engineer"):
    low = text.lower()
    role = target_role.lower().strip()
    keywords = ROLE_KEYWORDS.get(role, ROLE_KEYWORDS[DEFAULT_ROLE])
    breakdown = []

    # 1. Sections (20)
    found_sections, missing_sections = [], []
    for name, pat in SECTION_PATTERNS.items():
        if re.search(pat, text, flags=re.IGNORECASE | re.MULTILINE):
            found_sections.append(name)
        else:
            missing_sections.append(name)
    pts = round(20 * len(found_sections) / len(SECTION_PATTERNS))
    note = "All key sections found" if not missing_sections else \
        "Missing section(s): " + ", ".join(missing_sections)
    breakdown.append({"criterion": "Required sections present", "points": pts,
                      "max_points": 20, "note": note})

    # 2. Contact info (10)
    has_email = bool(re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text))
    has_phone = bool(re.search(r"(\+?\d[\d\s-]{8,}\d)", text))
    pts = (5 if has_email else 0) + (5 if has_phone else 0)
    if has_email and has_phone:
        note = "Email and phone found"
    else:
        lacking = [n for n, ok in (("email", has_email), ("phone", has_phone)) if not ok]
        note = "Missing " + " and ".join(lacking)
    breakdown.append({"criterion": "Contact info", "points": pts,
                      "max_points": 10, "note": note})

    # 3. Role keyword match (30)
    matched = [k for k in keywords if _has_keyword(low, k)]
    missing = [k for k in keywords if k not in matched]
    pts = round(30 * len(matched) / len(keywords))
    breakdown.append({"criterion": "Role keyword match", "points": pts,
                      "max_points": 30,
                      "note": f"Matched {len(matched)} of {len(keywords)} role keywords"})

    # 4. Quantified achievements (25): full marks at 50%+ of bullets with numbers
    bullets = _bullets(text)
    if bullets:
        with_nums = sum(1 for b in bullets if re.search(r"\d", b))
        ratio = with_nums / len(bullets)
        pts = round(25 * min(ratio / 0.5, 1.0))
        note = f"{with_nums} of {len(bullets)} bullets contain numbers"
    else:
        pts, note = 0, "No bullet points detected"
    breakdown.append({"criterion": "Quantified achievements", "points": pts,
                      "max_points": 25, "note": note})

    # 5. Length (15): 250-700 words is ideal for a student/early-career resume
    words = len(text.split())
    if 250 <= words <= 700:
        pts, note = 15, f"Good length ({words} words)"
    elif 150 <= words < 250 or 700 < words <= 900:
        pts, note = 9, f"Length is borderline ({words} words)"
    else:
        pts, note = 4, f"Length is off ({words} words); aim for 250-700"
    breakdown.append({"criterion": "Length", "points": pts,
                      "max_points": 15, "note": note})

    total = sum(b["points"] for b in breakdown)

    # Skills found: any known keyword across all roles
    all_kw = sorted({k for v in ROLE_KEYWORDS.values() for k in v})
    skills = [k for k in all_kw if _has_keyword(low, k)]

    return {
        "target_role": target_role,
        "ats_score": total,
        "score_breakdown": breakdown,
        "skills": skills,
        "missing_keywords": missing[:6],
    }


if __name__ == "__main__":
    sample = """
Asha Rao
asha@example.com | +91 98765 43210

Education
B.E. Computer Science, XYZ College, 2026

Projects
- Built a fest registration site with Flask and MySQL, used by 800+ students
- Worked on a chatbot for the college library
- Used Python and SQL

Skills
Python, SQL, Git, HTML, CSS
"""
    print(json.dumps(score_resume(sample, "Software Engineer"), indent=2))
