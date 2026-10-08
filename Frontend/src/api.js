/*
 * CareerSage API adapter
 *
 * Set VITE_API_BASE_URL in the deployment environment when the backend is ready.
 * Example: https://your-backend.example.com/api
 *
 * No API URL or credentials are hard-coded here.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const SAME_ORIGIN_API = import.meta.env.VITE_SAME_ORIGIN_API === "true";

export function isBackendConfigured() {
  // A blank API URL means same-origin requests in a production deployment
  // where FastAPI serves the built frontend and the API together.
  return Boolean(API_BASE_URL) || SAME_ORIGIN_API;
}

export async function apiRequest(path, options = {}) {
  if (!API_BASE_URL && !SAME_ORIGIN_API) {
    throw new Error("Backend is not connected. Set VITE_API_BASE_URL to the backend API URL.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const raw = await response.text();
    let payload;
    try { payload = JSON.parse(raw); } catch { payload = null; }
    const error = new Error(payload?.error?.message || raw || `Request failed with status ${response.status}`);
    error.code = payload?.error?.code;
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : response.text();
}

export function loginUser(payload) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function registerUser(payload) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function uploadResume(file, userId, targetRole = "Software Engineer") {
  const form = new FormData();
  form.append("resume", file);
  if (userId) form.append("userId", userId);
  form.append("targetRole", targetRole);
  return apiRequest("/resume/analyze", { method: "POST", body: form });
}

export function getDashboard(userId) {
  return apiRequest(`/dashboard${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`);
}

export function generateQuestions(sessionId, numQuestions = 5) {
  return apiRequest("/generate-questions", { method: "POST", body: JSON.stringify({ session_id: sessionId, num_questions: numQuestions }) });
}

export function scoreAnswer(sessionId, questionId, answerText) {
  return apiRequest("/score-answer", { method: "POST", body: JSON.stringify({ session_id: sessionId, question_id: questionId, answer_text: answerText }) });
}

export function getReport(sessionId) {
  return apiRequest("/report", { method: "POST", body: JSON.stringify({ session_id: sessionId }) });
}
