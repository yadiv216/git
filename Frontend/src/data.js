/*
 * BACKEND CONTRACT
 *
 * This file intentionally contains NO demo/sample/user data.
 * The backend should populate this shape through API responses.
 */

export const EMPTY_APP_DATA = {
  sessionId: "",
  user: {
    name: "",
    email: "",
    phone: ""
  },
  resume: {
    fileName: "",
    targetRole: "",
    score: null,
    atsScore: null,
    contentQuality: null,
    skillRelevance: null,
    clarity: null,
    insights: [],
    technicalSkills: [],
    softSkills: [],
    otherSkills: [],
    matchedKeywords: [],
    missingKeywords: [],
    suggestedKeywords: [],
    roleAlignmentScore: null,
    roleAlignment: [],
    suggestions: []
  },
  dashboard: {
    readiness: null,
    skillsIdentified: null,
    recommendedRoles: null,
    preparationStatus: null,
    skillAnalysis: [],
    roleMatches: [],
    strengths: [],
    areasToImprove: [],
    nextSteps: []
  },
  preparation: {
    readiness: null,
    technicalKnowledge: null,
    problemSolving: null,
    communication: null,
    systemDesign: null,
    categories: [],
    companies: [],
    mockTests: [],
    recentActivity: [],
    progress: []
  },
  interview: {
    category: "",
    difficulty: "",
    topic: "",
    question: "",
    totalQuestions: null,
    completedQuestions: 0
  }
};
