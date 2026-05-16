import api, { tutorApi } from './api';

export const academicsService = {
  getAll: () => api.get('/api/academics/').then(r => r.data),
  create: (data) => api.post('/api/academics/', data).then(r => r.data),
  update: (id, data) => api.put(`/api/academics/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/api/academics/${id}`).then(r => r.data),
};

export const analyticsService = {
  getDashboard: () => api.get('/api/analytics/dashboard').then(r => r.data),
  getPerformance: () => api.get('/api/analytics/performance').then(r => r.data),
  getStress: () => api.get('/api/analytics/stress').then(r => r.data),
};

export const plannerService = {
  getHistory: (completed) => {
    const params = completed !== undefined ? { completed } : {};
    return api.get('/api/planner/history', { params }).then(r => r.data);
  },
  createTask: (data) => api.post('/api/planner/', data).then(r => r.data),
  generatePlan: () => api.post('/api/planner/generate').then(r => r.data),
  updateTask: (id, data) => api.put(`/api/planner/${id}`, data).then(r => r.data),
  deleteTask: (id) => api.delete(`/api/planner/${id}`).then(r => r.data),
};

export const tutorService = {
  chat: (message, sessionId) => tutorApi.post('/api/tutor/chat', { message, session_id: sessionId }).then(r => r.data),
  getHistory: (limit = 20) => api.get('/api/tutor/history', { params: { limit } }).then(r => r.data),
  generateQuiz: (subject, difficulty = 'medium', nQuestions = 5) =>
    tutorApi.post('/api/tutor/quiz', { subject, difficulty, n_questions: nQuestions }).then(r => r.data),
  summarize: (text) => tutorApi.post('/api/tutor/summarize', { text }).then(r => r.data),
};

export const stressService = {
  getLogs: (limit = 30) => api.get('/api/stress/', { params: { limit } }).then(r => r.data),
  logStress: (data) => api.post('/api/stress/', data).then(r => r.data),
  analyze: (text = '') => api.post('/api/stress/analyze', { text }).then(r => r.data),
  getReport: () => api.get('/api/stress/report').then(r => r.data),
};

export const predictionsService = {
  getWeakSubjects: () => api.get('/api/predict/weak-subject').then(r => r.data),
  getBurnoutRisk: () => api.get('/api/predict/burnout').then(r => r.data),
};

export const graphService = {
  getStudentMap: (studentId = 1) => api.get(`/api/graph/student/${studentId}`).then(r => r.data),
  getPerformanceNetwork: () => api.get('/api/graph/performance-network').then(r => r.data),
};

export const notificationsService = {
  getAll: () => api.get('/api/notifications/').then(r => r.data),
  markRead: (id) => api.put(`/api/notifications/${id}/read`).then(r => r.data),
  markAllRead: () => api.put('/api/notifications/read-all').then(r => r.data),
  delete: (id) => api.delete(`/api/notifications/${id}`).then(r => r.data),
};

export const agentsService = {
  runCycle: () => api.post('/api/agents/run-cycle').then(r => r.data),
  getMotivation: () => api.post('/api/agents/motivation').then(r => r.data),
};