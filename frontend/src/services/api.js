import axios from 'axios';
import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30s default timeout for all non-tutor calls
});

// Tutor calls can take longer (LLM inference) — use a separate instance
export const tutorApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 200000, // Must exceed backend Ollama timeout (180s) + cold-start margin
});

function handleError(error) {
  const status = error.response?.status;
  const message =
    error.response?.data?.message ||
    error.response?.data?.detail ||
    null;

  if (status === 422) {
    toast.error('Validation error. Check your inputs.');
  } else if (status === 404) {
    // Silent — handled by individual pages
  } else if (status >= 500) {
    toast.error('Server error. Please try again later.');
  } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    toast.error('Request timed out. Please try again.');
  } else if (!error.response) {
    // Network error — backend not running
    toast.error('Cannot connect to backend. Is the server running?');
  } else if (message) {
    toast.error(message);
  }
  return Promise.reject(error);
}

api.interceptors.response.use((r) => r, handleError);
tutorApi.interceptors.response.use((r) => r, handleError);

export default api;