"""
Pixel Petals: final report builder. No LLM, runs instantly.
Combines resume analysis, gaps and interview scores into the /report response.

Run:  python report_builder.py   (demo uses the other files with the LLM turned off)
"""
import re
import json
from collections import Counter


def _ratio(item):
    return item["points"] / item["max_points"] if item["max_points"] else 0


def _band(value, low, high):
    return "low" if value < low else ("high" if value >= high else "medium")


def build_report(session_id, analysis, gaps, answer_results, answers=None):
    """
    analysis:       dict from score_resume() (needs ats_score, score_breakdown, missing_keywords)
    gaps:           list from detect_gaps()
    answer_results: list of dicts from score_answer()
    answers:        optional {question_id: answer_text}, used to pull real details into resume fixes
    """
    answers = answers or {}
    ats = analysis["ats_score"]
    breakdown = analysis["score_breakdown"]

    # Interview average
    overalls = [r["overall"] for r in answer_results]
    avg_interview = round(sum(overalls) / len(overalls), 1) if overalls else None

    # Per-dimension averages (relevance, specificity, structure, communication)
    dim_avg = {}
    for dim in ("relevance", "specificity", "structure", "communication"):
        vals = [r["scores"][dim] for r in answer_results]
        if vals:
            dim_avg[dim] = sum(vals) / len(vals)

    # Strengths and weaknesses
    by_ratio = sorted(breakdown, key=_ratio)
    weakest_resume = [b for b in by_ratio if _ratio(b) < 0.6][:2]
    strongest_resume = [b for b in reversed(by_ratio) if _ratio(b) >= 0.8][:2]

    strengths = [f"{b['criterion']}: {b['note']}" for b in strongest_resume]
    weaknesses = [f"{b['criterion']}: {b['note']}" for b in weakest_resume]

    if dim_avg:
        best = max(dim_avg, key=dim_avg.get)
        worst = min(dim_avg, key=dim_avg.get)
        if dim_avg[best] >= 3.5:
            strengths.append(f"Interview {best} (average {dim_avg[best]:.1f}/5)")
        if dim_avg[worst] < 3.5:
            weaknesses.append(f"Interview {worst} (average {dim_avg[worst]:.1f}/5)")

    # Resume fixes: gap suggestion plus a real detail from the student's own answer when there is one
    gap_by_id = {g["gap_id"]: g for g in gaps}
    q_to_gap = {}
    for r in answer_results:
        rg = r.get("related_gap")
        if rg:
            q_to_gap[r["question_id"]] = rg["gap_id"]
    fixes = []
    for g in gaps:
        text = g["suggestion"]
        for qid, gid in q_to_gap.items():
            if gid == g["gap_id"] and qid in answers:
                m = re.search(r"\d[\d,]*\+?%?(?:\s+[a-zA-Z]+)?", answers[qid])
                if m:
                    text += f" From your interview answer you could add: '{m.group(0).strip()}'."
        fixes.append({"gap_id": g["gap_id"], "before": g["bullet"], "after_suggestion": text})

    # Learning resources (topics only: no invented links)
    resources = []
    names = " ".join(weaknesses).lower()
    if "structure" in names or (dim_avg.get("structure", 5) < 3):
        resources.append({"topic": "STAR method for behavioral answers", "type": "guide",
                          "description": "Practice answering as Situation, Task, Action, Result."})
    if "quantified" in names or any(g["gap_type"] == "no_metrics" for g in gaps):
        resources.append({"topic": "Writing quantified resume bullets", "type": "guide",
                          "description": "Turn tasks into results using numbers like users, time saved or size."})
    if "keyword" in names and analysis.get("missing_keywords"):
        kws = ", ".join(analysis["missing_keywords"][:4])
        resources.append({"topic": f"Role skills to learn or show: {kws}", "type": "practice",
                          "description": "Build or describe a small project that uses these skills."})
    if "sections" in names:
        resources.append({"topic": "Standard resume sections", "type": "guide",
                          "description": "Add clear Education, Experience, Projects and Skills headings."})
    if dim_avg.get("communication", 5) < 3:
        resources.append({"topic": "Clear and concise speaking", "type": "practice",
                          "description": "Record yourself, cut filler words, and aim for 4-6 sentences per answer."})
    if not resources:
        resources.append({"topic": "Mock interviews with a friend", "type": "practice",
                          "description": "Keep practicing to build confidence."})

    # Summary text
    ats_band = _band(ats, 50, 75)
    if avg_interview is None:
        interview_part = "No interview answers were scored yet."
    else:
        ib = _band(avg_interview, 2.5, 3.8)
        interview_part = {"low": "Interview answers need more specific detail and structure.",
                          "medium": "Interview answers were reasonable but can be more specific.",
                          "high": "Interview answers were strong."}[ib]
    resume_part = {"low": "Your resume has several gaps that may hurt ATS screening.",
                   "medium": "Your resume is a decent base but has clear gaps to fix.",
                   "high": "Your resume is in good shape for ATS screening."}[ats_band]
    summary = f"{resume_part} {interview_part}"

    # Next steps
    steps = []
    if fixes:
        steps.append(f"Rewrite {min(len(fixes), 3)} resume bullet(s) using the suggestions above.")
    if weakest_resume:
        steps.append(f"Improve: {weakest_resume[0]['criterion'].lower()}.")
    steps.append("Redo the mock interview in about a week and compare your scores.")

    return {
        "session_id": session_id,
        "summary": summary,
        "ats_score": ats,
        "average_interview_score": avg_interview,
        "top_strengths": strengths[:3] or ["You completed the full resume and interview cycle."],
        "top_weaknesses": weaknesses[:3],
        "resume_fixes": fixes,
        "learning_resources": resources[:4],
        "next_steps": steps[:3],
    }


if __name__ == "__main__":
    from ats_scorer import score_resume
    from gap_detector import classify_bullet, split_bullets
    from question_generator import generate_questions
    from answer_scorer import score_answer

    resume = """
Asha Rao
asha@example.com | +91 98765 43210

Education
B.E. Computer Science, XYZ College, 2026

Projects
- Worked on a website for college fest
- Used Python and SQL
- Led a team of students

Skills
Python, SQL, Git
"""
    analysis = score_resume(resume, "Software Engineer")

    # Demo only: classify without the LLM and use simple fixed suggestions
    gaps = []
    for i, b in enumerate(split_bullets(resume), start=1):
        gt = classify_bullet(b)
        if gt:
            gaps.append({"gap_id": f"g{len(gaps) + 1}", "bullet": b, "gap_type": gt,
                         "suggestion": "Add specific detail and a measurable result."})
    questions = generate_questions(gaps, "Software Engineer", 3, use_llm=False)

    answers = {
        "q1": "I built the registration pages with Flask and MySQL and about 800 students signed up as a result.",
        "q2": "Um, I basically used them in a class.",
        "q3": "We finished the project on time and I organized the tasks, which helped the team.",
    }
    results = []
    for q in questions:
        gap = next((g for g in gaps if g["gap_id"] == q["targets_gap_id"]), None)
        results.append(score_answer(q, answers[q["question_id"]], gap, use_llm=False))

    print(json.dumps(build_report("demo1234", analysis, gaps, results, answers), indent=2))
